import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WithdrawalCronService {
    private readonly logger = new Logger(WithdrawalCronService.name);

    constructor(private prisma: PrismaService) { }

    // Run every 30 seconds to check for auto-approve withdrawals
    @Cron('*/30 * * * * *')
    async processAutoApprovals() {
        // Only run on PM2 cluster worker 0 (prevents duplicate execution)
        const instanceId = process.env.NODE_APP_INSTANCE || process.env.pm_id;
        if (instanceId && instanceId !== '0') return;

        try {
            const now = new Date();
            const pendingAutos = await this.prisma.withdrawal.findMany({
                where: {
                    status: 'PENDING',
                    autoApproveAt: { lte: now }
                },
                include: { user: true }
            });

            if (pendingAutos.length === 0) return;

            this.logger.log(`Processing ${pendingAutos.length} auto-approve withdrawal(s)`);

            for (const wd of pendingAutos) {
                try {
                    await this.prisma.withdrawal.update({
                        where: { id: wd.id },
                        data: { status: 'PAID' }
                    });

                    // Send receipt DM
                    const botToken = process.env.BOT_TOKEN;
                    if (botToken && wd.user.telegramId) {
                        const amount = Number(wd.amount);
                        const msg = `💸 *Penarikan Berhasil!*\n\nHei ${wd.user.firstName || wd.user.username || 'Kawan'}!\n\n💰 Jumlah: *Rp ${amount.toLocaleString('id-ID')}*\n🏦 Metode: *${wd.method}*\n📋 Status: ✅ BERHASIL\n\nDana akan masuk ke akunmu dalam beberapa saat. Terima kasih! 🚀`;
                        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: wd.user.telegramId.toString(),
                                text: msg,
                                parse_mode: 'Markdown'
                            })
                        }).catch(() => { });
                    }

                    this.logger.log(`Auto-approved WD ${wd.id} for user ${wd.user.username || wd.userId}`);
                } catch (e) {
                    this.logger.error(`Failed to auto-approve WD ${wd.id}:`, e);
                }
            }
        } catch (e) {
            // Silently ignore errors (e.g. if autoApproveAt column doesn't exist yet)
        }
    }
}
