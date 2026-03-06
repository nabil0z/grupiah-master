import { Controller, Post, Get, Req, Res, HttpStatus, Param } from '@nestjs/common';
import type { Request, Response } from 'express';
import { TaskProviderFactory } from '../tasks/task-provider.factory';
import { PrismaService } from '../prisma/prisma.service';
import { AdminConfigService } from '../admin/config/admin-config.service';

@Controller('webhook/postback')
export class WebhooksController {
    constructor(
        private taskProviderFactory: TaskProviderFactory,
        private prisma: PrismaService,
        private configService: AdminConfigService
    ) { }

    // Some Ad networks use GET, some use POST for postbacks. We bind both.
    @Get(':provider')
    async handleGetPostback(@Param('provider') provider: string, @Req() req: Request, @Res() res: Response) {
        return this.processWebhook(provider, req, res);
    }

    @Post(':provider')
    async handlePostPostback(@Param('provider') provider: string, @Req() req: Request, @Res() res: Response) {
        return this.processWebhook(provider, req, res);
    }

    private async processWebhook(providerName: string, req: Request, res: Response) {
        try {
            const normalizedProviderName = providerName.toUpperCase();

            // 1. Get the Correct Adapter (OGADS, ADBLUEMEDIA, etc.)
            let adapter;
            try {
                adapter = this.taskProviderFactory.getAdapter(normalizedProviderName);
            } catch (e) {
                return res.status(HttpStatus.BAD_REQUEST).send('Unknown Provider');
            }

            // 2. Security: Verify IP or Signature Hash
            const isValid = await adapter.verifyPostback(req as any);
            if (!isValid) {
                // Return 403 to indicate security block
                return res.status(HttpStatus.FORBIDDEN).send('Invalid Signature or IP');
            }

            // 3. Extract standard Reward Payload (User ID, Reward Amount, Transaction ID)
            const rewardDetail = await adapter.processReward(req.body && Object.keys(req.body).length > 0 ? req.body : req.query);

            if (!rewardDetail.userId || !rewardDetail.reward) {
                return res.status(HttpStatus.BAD_REQUEST).send('Missing required parameters (userId, reward)');
            }

            // 4. Safely process the balance injection in a Database Transaction
            // This prevents Double-Spending if the ad network sends the same webhook twice by accident
            await this.prisma.$transaction(async (tx) => {

                // Idempotency Check: Did we already process this exact transaction ID?
                if (rewardDetail.providerTransactionId) {
                    const existingTx = await tx.walletMutation.findFirst({
                        where: { description: `POSTBACK_${rewardDetail.providerTransactionId}` }
                    });
                    if (existingTx) {
                        throw new Error('Transaction Already Processed');
                    }
                }

                // Find User & Wallet
                const user = await tx.user.findUnique({
                    where: { id: rewardDetail.userId },
                    include: { wallet: true }
                });

                if (!user || !user.wallet) {
                    throw new Error('User or Wallet Not Found');
                }
                const wallet = user.wallet;

                // Calculate Final Reward: base * EXCHANGE_RATE_IDR * GLOBAL_MULTIPLIER
                const EXCHANGE_RATE_IDR = 16000;
                let finalReward = Math.floor(rewardDetail.reward * EXCHANGE_RATE_IDR);

                const globalMultiplierStr = await this.configService.getConfigValue('GLOBAL_OFFER_MULTIPLIER', '1');
                const globalMultiplier = parseFloat(globalMultiplierStr) || 1;

                finalReward = Math.floor(finalReward * globalMultiplier);

                // Update Balance
                await tx.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { increment: finalReward } }
                });

                // Write Ledger
                await tx.walletMutation.create({
                    data: {
                        walletId: wallet.id,
                        amount: finalReward,
                        type: 'EARN',
                        description: rewardDetail.providerTransactionId
                            ? `POSTBACK_${rewardDetail.providerTransactionId}`
                            : `EARN_FROM_${normalizedProviderName}`
                    }
                });

                // Auto-Approve the UserTask if it was marked PENDING previously
                if (rewardDetail.taskId) {
                    await tx.userTask.updateMany({
                        where: { userId: rewardDetail.userId, taskId: rewardDetail.taskId, status: 'PENDING' },
                        data: { status: 'APPROVED', reward: finalReward }
                    });

                    // Record completion for Analytics
                    await tx.offerScore.upsert({
                        where: {
                            provider_externalId: { provider: normalizedProviderName, externalId: rewardDetail.taskId }
                        },
                        update: { completions: { increment: 1 } },
                        create: {
                            provider: normalizedProviderName,
                            externalId: rewardDetail.taskId,
                            clicks: 1,
                            completions: 1
                        }
                    });
                }

                // --- Referral Matrix Payout (First Task Completion) ---
                if (user.referredById && !user.isReferralActive) {
                    const inviterBonusStr = await this.configService.getConfigValue('APP_REF_UPLINE', '500');
                    const inviteeBonusStr = await this.configService.getConfigValue('APP_REF_DOWNLINE', '250');
                    const inviterBonus = parseInt(inviterBonusStr) || 500;
                    const inviteeBonus = parseInt(inviteeBonusStr) || 250;

                    // 1. Mark referral as active for this user
                    await tx.user.update({
                        where: { id: user.id },
                        data: { isReferralActive: true }
                    });

                    // 2. Give Invitee their welcome bonus
                    if (inviteeBonus > 0) {
                        await tx.wallet.update({
                            where: { id: wallet.id },
                            data: { balance: { increment: inviteeBonus } }
                        });
                        await tx.walletMutation.create({
                            data: {
                                walletId: wallet.id,
                                amount: inviteeBonus,
                                type: 'REFERRAL_BONUS',
                                description: 'Welcome Bonus (Task Completed)'
                            }
                        });
                    }

                    // 3. Give Inviter their reward
                    if (inviterBonus > 0) {
                        let inviterWallet = await tx.wallet.findUnique({ where: { userId: user.referredById } });
                        if (!inviterWallet) {
                            inviterWallet = await tx.wallet.create({ data: { userId: user.referredById, balance: 0 } });
                        }
                        await tx.wallet.update({
                            where: { id: inviterWallet.id },
                            data: { balance: { increment: inviterBonus } }
                        });
                        await tx.walletMutation.create({
                            data: {
                                walletId: inviterWallet.id,
                                amount: inviterBonus,
                                type: 'REFERRAL_BONUS',
                                description: `Referral Bonus for inviting ${user.firstName || user.username || 'User'}`
                            }
                        });
                    }
                }
            });

            // Send DM notification to user (fire-and-forget, don't delay response)
            try {
                const dmUser = await this.prisma.user.findUnique({ where: { id: rewardDetail.userId } });
                const botToken = process.env.BOT_TOKEN;
                if (botToken && dmUser?.telegramId) {
                    const EXCHANGE_RATE_IDR = 16000;
                    const globalMultiplierStr = await this.configService.getConfigValue('GLOBAL_OFFER_MULTIPLIER', '1');
                    const globalMultiplier = parseFloat(globalMultiplierStr) || 1;
                    const dmReward = Math.floor(rewardDetail.reward * EXCHANGE_RATE_IDR * globalMultiplier);

                    const message = `✅ *Offer Berhasil!*\n\n` +
                        `Selamat! Kamu baru saja menyelesaikan offer dari *${normalizedProviderName}*.\n` +
                        `💰 Reward: *Rp ${dmReward.toLocaleString('id-ID')}*\n\n` +
                        `Saldo kamu sudah ditambahkan otomatis. Terus kumpulkan rupiahnya! 🚀`;

                    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: dmUser.telegramId.toString(),
                            text: message,
                            parse_mode: 'Markdown'
                        })
                    }).then(() => {
                        console.log(`[Webhooks] DM sent to user ${dmUser.telegramId} for ${normalizedProviderName} ✅`);
                    }).catch(dmErr => {
                        console.error('[Webhooks] DM send failed:', dmErr);
                    });
                }
            } catch (dmErr) {
                console.error('[Webhooks] Failed to prepare DM:', dmErr);
            }

            // 5. Must return 200 OK fast so the Ad Network knows it arrived
            return res.status(HttpStatus.OK).send('OK');

        } catch (error: any) {
            console.error(`[Webhook Error ${providerName}]`, error.message);

            // If it's our "Transaction Already Processed" error, still return 200 so they stop retrying
            if (error.message === 'Transaction Already Processed') {
                return res.status(HttpStatus.OK).send('OK (Duplicated)');
            }

            // Real DB error, tell them to retry
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Internal Server Error');
        }
    }
}
