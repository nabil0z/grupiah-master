import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AdminConfigService } from '../admin/config/admin-config.service';

@Injectable()
export class BroadcastCronService {
    private readonly logger = new Logger(BroadcastCronService.name);
    private postCounter = 0;

    constructor(
        private prisma: PrismaService,
        private configService: AdminConfigService
    ) { }

    // Run this every day at 12:00 PM and 18:00 PM for demo purposes.
    // Real implementation might read Cron strings from Database.
    @Cron(CronExpression.EVERY_DAY_AT_NOON)
    async handleDailyBroadcastNoon() {
        this.logger.log('Executing Noon Broadcast...');
        await this.rotateAndBroadcast();
    }

    @Cron('0 18 * * *') // 6 PM
    async handleDailyBroadcastEvening() {
        this.logger.log('Executing Evening Broadcast...');
        await this.rotateAndBroadcast();
    }

    private async rotateAndBroadcast() {
        const isAutoPostEnabled = await this.configService.getConfigValue('AUTO_POST_ENABLED', 'true');
        if (isAutoPostEnabled !== 'true') {
            this.logger.log('Auto Posting is disabled in Configuration. Skipping.');
            return;
        }

        const channelId = process.env.CHANNEL_ID || '@grupiah_official';
        const botToken = process.env.BOT_TOKEN;

        if (!botToken || botToken === 'mock_telegram_bot_token') {
            this.logger.warn('Mock bot token detected. Broadcast logic simulates success but skips Telegram API call.');
            return;
        }

        const postTypes = [
            'TOP_EARNER',      // Sultan Harian
            'TOP_INVITER',     // Raja Referral
            'HIGH_VALUE_OFFER',// Bocoran Tugas Mahal
            'TOTAL_PAYOUT',    // Bukti Bayar Massal (Weekly Milestone)
            'FAST_WITHDRAW'    // Testimoni Tarik Dana
        ];

        const currentType = postTypes[this.postCounter % postTypes.length];
        this.postCounter++;

        this.logger.log(`Preparing Broadcast Type: ${currentType}`);

        try {
            let caption = '';
            // Temporary Placeholder Image until HTML5-to-Image renderer is built via Stitch
            let imageUrl = 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80';

            switch (currentType) {
                case 'TOP_EARNER':
                    caption = `👑 <b>SULTAN HARIAN GRUPIAH</b> 👑\n\nWah gila sih, user kita hari ini cuan parah sampai dapet jutaan Rupiah cuma tiduran doang! 💸\n\nTunggu apa lagi? Langsung buka mini app GRupiah sekarang sebelum kuota offer mahal ludes bosku! 👇\n\n<a href="https://t.me/GRupiahBot/app">PLAY GRUPIAH SEKARANG</a>`;
                    imageUrl = 'https://images.unsplash.com/photo-1579621970588-a3f5ce599fac?w=800&q=80';
                    break;
                case 'TOP_INVITER':
                    caption = `🔥 <b>RAJA REFERRAL MINGGU INI</b> 🔥\n\nModal sebar link doang dapet passive income? Bisa banget di GRupiah!\nUser kita satu ini berhasil undang ratusan teman dan dapet komisi sultan. 🤝\n\nKalian juga bisa! Dapatkan bonus instan setiap temanmu kerjakan offer pertama kalinya. Gas sebar link referralmu sekarang!\n\n<a href="https://t.me/GRupiahBot/app?startapp=frens">CEK BONUS REFERRAL</a>`;
                    imageUrl = 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80';
                    break;
                case 'HIGH_VALUE_OFFER':
                    caption = `🚨 <b>BOCORAN TUGAS MAHAL HARI INI</b> 🚨\n\nDeveloper dapet info nih ada offer game baru yang bayarannya nembus Rp 50.000 sekali selesai + Global Booster aktif! 😱\n\nSiapa cepat dia dapat! Offer gampang, bayaran gede. Jangan sampai kelewatan ya!\n\n<a href="https://t.me/GRupiahBot/app?startapp=tasks">KERJAKAN SEKARANG</a>`;
                    imageUrl = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=800&q=80';
                    break;
                case 'TOTAL_PAYOUT':
                    caption = `🎉 <b>BUKTI BAYAR MASSAL (CAIR TERUS)</b> 🎉\n\nGRupiah bukan kaleng-kaleng! Minggu ini kita udah transfer puluhan juta Rupiah ke DANA/OVO/GoPay kalian semua tanpa potongan! ✅\n\nBuat yang masih ragu, buktikan sendiri. Tarik dana cair secepat kilat!\n\n<a href="https://t.me/GRupiahBot/app?startapp=wallet">CEK WALLET KAMU</a>`;
                    imageUrl = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80';
                    break;
                case 'FAST_WITHDRAW':
                    caption = `⚡️ <b>TESTIMONI TARIK DANA KILAT</b> ⚡️\n\n"Gila, withdraw di GRupiah cepet bener! Baru klik Tarik Dana, langsung masuk e-wallet gak nyampe semenit!" 🚀\n\nMainkan, Kumpulkan Saldo, dan Cairkan ke rekeningmu sekarang juga!\n\n<a href="https://t.me/GRupiahBot/app?startapp=wallet">TARIK DANA SEKARANG</a>`;
                    imageUrl = 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80';
                    break;
            }

            // Execute Telegram API SendPhoto request
            const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
            const payload = {
                chat_id: channelId,
                photo: imageUrl,
                caption: caption,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📱 Buka Mini App GRupiah', url: 'https://t.me/GRupiahBot/app' }]
                    ]
                }
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!data.ok) {
                this.logger.error(`Failed to broadcast to Telegram: ${data.description}`);
            } else {
                this.logger.log(`Broadcast [${currentType}] successfully sent to ${channelId}`);
            }

        } catch (error: any) {
            this.logger.error(`Error during broadcast execution: ${error.message}`);
        }
    }
}
