import { Update, Start, Ctx, Command } from 'nestjs-telegraf';
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
                            web_app: { url: process.env.WEB_APP_URL || 'https://grupiah-sample-tma.vercel.app' },
                        },
                    ],
                    [
                        {
                            text: '📢 Gabung Channel Resmi',
                            url: 'https://t.me/grupiah_official',
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
}
