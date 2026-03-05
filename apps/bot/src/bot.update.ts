import { Update, Start, Ctx, Command, On } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { PrismaService } from './prisma/prisma.service';

@Update()
export class BotUpdate {
    constructor(private readonly prisma: PrismaService) { }

    @Start()
    async onStart(@Ctx() ctx: Context) {
        // Determine the startApp payload if the user clicked a referral deep link
        const message = ctx.message as any;
        const text = message?.text || '';
        const parts = text.split(' ');
        const startParam = parts.length > 1 ? parts[1] : null;

        let replyText = `👋 Selamat datang di Grupiah Bot!\n\nSelesaikan tugas ringan (Mendownload game, Mengisi survey) dan kumpulkan Rupiah nyata setiap hari.\n\n`;

        if (startParam && startParam.startsWith('ref_')) {
            const inviterId = startParam.split('_')[1];
            replyText += `🎉 Anda diundang oleh user ${inviterId}!\nSelesaikan 1 tugas pertama Anda agar bonus invite cair untuk kalian berdua.\n\n`;
        }

        replyText += `⏬ Klik tombol di bawah untuk membuka *Mini App* dan mulai menghasilkan uang! 👇`;

        await ctx.reply(replyText, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '💰 Buka App Grupiah',
                            web_app: { url: process.env.WEB_APP_URL || 'https://app.grupiah.online' },
                        },
                    ],
                    [
                        {
                            text: '📢 Gabung Channel Resmi',
                            url: 'https://t.me/Grupiah_id',
                        },
                    ],
                ],
            },
        });
    }

    private async isAdmin(ctx: Context): Promise<boolean> {
        const userId = ctx.from?.id;
        if (!userId) return false;

        const adminRegex = process.env.ADMIN_IDS || '62813'; // fallback for dev
        return new RegExp(adminRegex).test(userId.toString());
    }

    @Command('withdrawals')
    async listWithdrawals(@Ctx() ctx: Context) {
        if (!(await this.isAdmin(ctx))) return;

        const pendingList = await this.prisma.withdrawal.findMany({
            where: { status: 'PENDING' },
            include: { user: true },
            orderBy: { createdAt: 'asc' },
            take: 10
        });

        if (pendingList.length === 0) {
            return ctx.reply('✅ Tidak ada penarikan PENDING saat ini.');
        }

        let message = `📋 *Daftar 10 Penarikan Tunda (PENDING):*\n\n`;
        pendingList.forEach(w => {
            message += `🆔 *ID:* \`${w.id}\`\n`;
            message += `👤 *User:* ${w.user.firstName} (TG: ${w.user.telegramId})\n`;
            message += `💰 *Jumlah:* Rp ${Number(w.amount).toLocaleString('id-ID')}\n`;
            message += `💳 *Metode:* ${w.method}\n`;
            message += `🏦 *Rekening:* \`${w.accountInfo}\`\n`;
            message += `Aksi: /approve_${w.id.split('-')[0]} | /reject_${w.id.split('-')[0]}\n`;
            message += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        });

        message += `\nGunakan *ID Penuh* untuk mengeksekusi:\n\`/approve [ID_PENUH]\`\n\`/reject [ID_PENUH]\``;

        await ctx.reply(message, { parse_mode: 'Markdown' });
    }

    @Command('approve')
    async approveWithdrawalCommand(@Ctx() ctx: Context) {
        if (!(await this.isAdmin(ctx))) return;

        const text = (ctx.message as any)?.text || '';
        const parts = text.split(' ');
        if (parts.length < 2) {
            return ctx.reply('❌ Format salah. Gunakan: `/approve [ID_Withdrawal_Penuh]`', { parse_mode: 'Markdown' });
        }

        const withdrawalId = parts[1];

        try {
            const adminTelegramId = ctx.from!.id.toString();

            // Replicate logic from AdminService
            const updated = await this.prisma.withdrawal.update({
                where: { id: withdrawalId },
                data: { status: 'PAID', processedBy: adminTelegramId },
                include: { user: true }
            });

            await this.prisma.auditLog.create({
                data: {
                    actorId: adminTelegramId,
                    actorType: 'ADMIN',
                    action: 'WITHDRAWAL_APPROVED',
                    entityType: 'Withdrawal',
                    entityId: withdrawalId,
                    changes: JSON.stringify({ source: 'TelegramBot', new: 'PAID' })
                }
            });

            await ctx.reply(`✅ *Sukses!* Penarikan \`${withdrawalId}\` ditandai menjadi *PAID*. Jangan lupa transfer uangnya ke rekening user.`, { parse_mode: 'Markdown' });

            // Notify user
            try {
                await ctx.telegram.sendMessage(
                    Number(updated.user.telegramId),
                    `🎉 *Kabar Gembira!*\n\nPenarikan dana Rp ${Number(updated.amount).toLocaleString('id-ID')} Anda telah *DISETUJUI* dan dicairkan ke rekening Anda.`,
                    { parse_mode: 'Markdown' }
                );
            } catch (e) { console.error("Could not notify user", e); }

        } catch (error: any) {
            await ctx.reply(`❌ Gagal menyetujui. Pastikan ID Benar.\nError: ${error.message}`);
        }
    }

    @Command('reject')
    async rejectWithdrawalCommand(@Ctx() ctx: Context) {
        if (!(await this.isAdmin(ctx))) return;

        const text = (ctx.message as any)?.text || '';
        const parts = text.split(' ');
        if (parts.length < 2) {
            return ctx.reply('❌ Format salah. Gunakan: `/reject [ID_Withdrawal_Penuh]`', { parse_mode: 'Markdown' });
        }

        const withdrawalId = parts[1];

        try {
            const adminTelegramId = ctx.from!.id.toString();

            await this.prisma.$transaction(async (tx) => {
                const withdrawal = await tx.withdrawal.findUnique({
                    where: { id: withdrawalId },
                    include: { user: { include: { wallet: true } } }
                });

                if (!withdrawal || withdrawal.status !== 'PENDING') {
                    throw new Error('Penarikan tidak ditemukan atau bukan PENDING.');
                }

                // Update Status
                const updated = await tx.withdrawal.update({
                    where: { id: withdrawalId },
                    data: { status: 'REJECTED', processedBy: adminTelegramId }
                });

                // Refund User Wallet
                if (withdrawal.user.wallet) {
                    await tx.wallet.update({
                        where: { id: withdrawal.user.wallet.id },
                        data: { balance: { increment: withdrawal.amount } }
                    });
                }

                await tx.auditLog.create({
                    data: {
                        actorId: adminTelegramId,
                        actorType: 'ADMIN',
                        action: 'WITHDRAWAL_REJECTED',
                        entityType: 'Withdrawal',
                        entityId: withdrawalId,
                        changes: JSON.stringify({ source: 'TelegramBot', action: 'Refunded' })
                    }
                });

                // Notify User of Rejection
                try {
                    await ctx.telegram.sendMessage(
                        Number(withdrawal.user.telegramId),
                        `⚠️ *Pemberitahuan Penarikan*\n\nPenarikan dana Rp ${Number(withdrawal.amount).toLocaleString('id-ID')} Anda *DITOLAK* oleh Admin karena suatu alasan. Saldo telah dikembalikan 100% utuh ke Dompet Anda.`,
                        { parse_mode: 'Markdown' }
                    );
                } catch (e) { console.error("Could not notify user", e); }
            });

            await ctx.reply(`⛔ *Sukses Rekjeksi!*\nPenarikan \`${withdrawalId}\` ditolak dan uang user telah dikembalikan (Refunded).`, { parse_mode: 'Markdown' });

        } catch (error: any) {
            await ctx.reply(`❌ Gagal menolak.\nError: ${error.message}`);
        }
    }

    // ==========================================
    // Telegram Stars Payment Handlers
    // ==========================================

    @On('pre_checkout_query')
    async onPreCheckoutQuery(@Ctx() ctx: Context) {
        // Must answer within 10 seconds or payment fails
        try {
            await ctx.answerPreCheckoutQuery(true);
            console.log('[Stars] Pre-checkout approved');
        } catch (e) {
            console.error('[Stars] Pre-checkout error:', e);
        }
    }

    @On('successful_payment')
    async onSuccessfulPayment(@Ctx() ctx: Context) {
        try {
            const payment = (ctx.message as any)?.successful_payment;
            if (!payment) return;

            console.log('[Stars] Payment received:', JSON.stringify(payment));

            // Parse the payload we set when creating the invoice
            const payload = JSON.parse(payment.invoice_payload);
            const { userId, multiplierRate, purchasedStar, durationHours } = payload;

            // Calculate expiration
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + durationHours);

            // Upsert: create or replace existing boost
            await this.prisma.userBoost.upsert({
                where: { userId },
                create: {
                    userId,
                    multiplierRate,
                    expiresAt,
                    purchasedStar,
                },
                update: {
                    multiplierRate,
                    expiresAt,
                    purchasedStar,
                },
            });

            // Notify user
            const emoji = multiplierRate === 5 ? '🔥' : '⚡';
            await ctx.reply(
                `${emoji} *Boost X${multiplierRate} Aktif!*\n\n` +
                `Pendapatan Offerwall kamu sekarang dikali *${multiplierRate}x* selama ${durationHours} jam.\n\n` +
                `Berlaku hingga: ${expiresAt.toLocaleString('id-ID')}`,
                { parse_mode: 'Markdown' }
            );

            console.log(`[Stars] Boost X${multiplierRate} activated for user ${userId}, expires ${expiresAt.toISOString()}`);
        } catch (e) {
            console.error('[Stars] Payment processing error:', e);
            await ctx.reply('⚠️ Pembayaran diterima tapi terjadi kesalahan saat mengaktifkan boost. Hubungi admin.');
        }
    }
}
