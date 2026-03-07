import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AdminConfigService } from '../admin/config/admin-config.service';
import { BroadcastService } from './broadcast.service';
import * as puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class BroadcastCronService {
    private readonly logger = new Logger(BroadcastCronService.name);
    private postCounter = 0;

    constructor(
        private prisma: PrismaService,
        private configService: AdminConfigService,
        private broadcastService: BroadcastService
    ) { }

    // Cron schedules in SERVER time (CET/UTC+1) → converted from WIB (UTC+7)
    // WIB 09:00 = CET 03:00 → Morning Motivation (Top 10 Earners Album)
    @Cron('0 3 * * *')
    async handleMorningBroadcast() {
        this.logger.log('⏰ Cron fired: 09:00 WIB (Morning Motivation)');
        await this.rotateAndBroadcast(9);
    }

    // WIB 15:00 = CET 09:00 → Afternoon Hustle (Hot Offer)
    @Cron('0 9 * * *')
    async handleAfternoonBroadcast() {
        this.logger.log('⏰ Cron fired: 15:00 WIB (Afternoon Offer)');
        await this.rotateAndBroadcast(15);
    }

    // WIB 21:00 = CET 15:00 → Night Owl (Daily Recap)
    @Cron('0 15 * * *')
    async handleEveningBroadcast() {
        this.logger.log('⏰ Cron fired: 21:00 WIB (Night Recap)');
        await this.rotateAndBroadcast(21);
    }

    public async generateImageFromHtml(templateName: string, data: Record<string, string>, containerClass: string = '.receipt-container'): Promise<string> {
        try {
            const templatePath = path.join(__dirname, '..', '..', 'src', 'broadcast', 'templates', `${templateName}.html`);
            if (!fs.existsSync(templatePath)) {
                throw new Error(`Template not found: ${templatePath}`);
            }

            let htmlContent = fs.readFileSync(templatePath, 'utf8');

            // Replace standard data fields based on id attributes
            for (const [key, value] of Object.entries(data)) {
                const regex = new RegExp(`id="${key}">.*?<`, 'g');
                htmlContent = htmlContent.replace(regex, `id="${key}">${value}<`);
            }

            // Inject the Logo Path
            const logoPath = path.join(__dirname, '..', '..', 'src', 'broadcast', 'templates', `logo.png`);

            // Read as base64 so we don't have to deal with puppeteer local file system permission bugs
            const logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' });
            const logoSrc = `data:image/png;base64,${logoBase64}`;

            htmlContent = htmlContent.replace(/{LOGO_PATH}/g, logoSrc);

            const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
            const page = await browser.newPage();
            await page.setViewport({ width: 480, height: 600, deviceScaleFactor: 2 });
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

            // Automatically find the container to screenshot precisely
            const element = await page.$(containerClass);
            if (!element) throw new Error(`Could not find ${containerClass} in html`);

            const fileName = `receipt_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
            const imagePath = path.join(__dirname, '..', '..', 'src', 'broadcast', 'images', fileName);

            // Ensure directory exists
            if (!fs.existsSync(path.dirname(imagePath))) {
                fs.mkdirSync(path.dirname(imagePath), { recursive: true });
            }

            await element.screenshot({ path: imagePath, type: 'jpeg', quality: 90 });
            await browser.close();

            return imagePath;
        } catch (error: any) {
            this.logger.error(`Failed to generate image: ${error.message}`);
            throw error;
        }
    }

    private async executeAlbumBroadcast(channelId: string, botToken: string, mediaPaths: string[], caption: string) {
        const albumUrl = `https://api.telegram.org/bot${botToken}/sendMediaGroup`;

        try {
            this.logger.log(`Executing Telegram MediaGroup request with ${mediaPaths.length} photos...`);

            // Build multipart FormData with actual file buffers (Node 18+ native FormData + Blob)
            const formData = new FormData();
            formData.append('chat_id', channelId);

            const mediaArray = mediaPaths.map((filePath, index) => {
                const fileName = path.basename(filePath);
                const fileBuffer = fs.readFileSync(filePath);
                const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
                formData.append(fileName, blob, fileName);
                return {
                    type: 'photo',
                    media: `attach://${fileName}`,
                    parse_mode: 'HTML',
                    ...(index === 0 ? { caption } : {})
                };
            });

            formData.append('media', JSON.stringify(mediaArray));

            const response = await fetch(albumUrl, { method: 'POST', body: formData });
            const data = await response.json() as any;

            if (!data.ok) {
                this.logger.error(`Telegram sendMediaGroup error: ${data.description}`);
            } else {
                this.logger.log(`Album photos sent successfully to ${channelId}`);
            }

            // Clean up generated image files
            for (const p of mediaPaths) {
                if (fs.existsSync(p)) fs.unlinkSync(p);
            }

            // Follow up with CTA button message
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: channelId,
                    text: '👇 <b>TUNGGU APA LAGI? MAIN SEKARANG!</b> 👇',
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [[{ text: '📱 Buka Mini App GRupiah', url: 'https://t.me/GRupiahBot/app' }]]
                    }
                })
            });

            this.logger.log(`Album Broadcast successfully sent to ${channelId}`);
        } catch (error: any) {
            this.logger.error(`MediaGroup Send Failed: ${error.message}`);
            // Clean up on error too
            for (const p of mediaPaths) {
                if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch { }
            }
        }
    }

    private async executeSingleBroadcast(channelId: string, botToken: string, caption: string, imagePath?: string) {
        try {
            if (imagePath && fs.existsSync(imagePath)) {
                // Upload actual photo via multipart FormData
                this.logger.log(`Executing Single Photo Broadcast with file: ${imagePath}`);
                const photoUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;

                const formData = new FormData();
                formData.append('chat_id', channelId);
                const fileBuffer = fs.readFileSync(imagePath);
                const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
                formData.append('photo', blob, path.basename(imagePath));
                formData.append('caption', caption);
                formData.append('parse_mode', 'HTML');
                formData.append('reply_markup', JSON.stringify({
                    inline_keyboard: [[{ text: '📱 Buka Mini App GRupiah', url: 'https://t.me/GRupiahBot/app' }]]
                }));

                const response = await fetch(photoUrl, { method: 'POST', body: formData });
                const data = await response.json() as any;

                if (!data.ok) throw new Error(data.description);

                // Cleanup
                if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
            } else {
                // Text-only broadcast
                const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: channelId,
                        text: caption,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [[{ text: '📱 Buka Mini App GRupiah', url: 'https://t.me/GRupiahBot/app' }]]
                        }
                    })
                });
                const data = await response.json() as any;
                if (!data.ok) throw new Error(data.description);
            }
            this.logger.log(`Broadcast successfully sent to ${channelId}`);
        } catch (e: any) {
            this.logger.error(`Broadcast failed: ${e.message}`);
            if (imagePath && fs.existsSync(imagePath)) try { fs.unlinkSync(imagePath); } catch { }
        }
    }

    public async testTrigger(hour: number) {
        return this.rotateAndBroadcast(hour);
    }

    // Cron jobs below call this method
    private async rotateAndBroadcast(forceHour?: number) {
        const isAutoPostEnabled = await this.configService.getConfigValue('AUTO_POST_ENABLED', 'true');
        if (isAutoPostEnabled !== 'true' && !forceHour) {
            this.logger.log('Auto Posting is disabled. Skipping.');
            return;
        }

        const channelId = process.env.CHANNEL_ID || '@grupiah_official';
        let botToken = process.env.BOT_TOKEN;
        if (!botToken || botToken === 'mock_telegram_bot_token') {
            this.logger.warn('Mock bot token detected. Broadcast logic simulates success.');
            botToken = 'mock_telegram_bot_token'; // Ensure it's never undefined for type safety
            // We'll still execute the image generation steps even with mock token to test the flow
        }

        const hour = forceHour || new Date().getHours();

        try {
            if (hour === 9) {
                // 09:00 AM - MORNING MOTIVATION (TOP 10 RECEIPTS ALBUM)
                this.logger.log('Executing MORNING Broadcast (Album of Top 10 Earners)');

                // 1. Generate receipt data (amounts above min WD 500k, sorted desc)
                const images: string[] = [];
                const amounts: number[] = [];
                const methods = ['DANA', 'OVO', 'GOPAY'];
                const methodLabels = ['DANA E-Wallet', 'OVO Cash', 'GoPay'];

                for (let i = 0; i < 10; i++) {
                    // Range: 1.5jt - 5jt (top 10 earners, di atas min WD)
                    amounts.push(Math.floor(Math.random() * 3500000) + 1500000);
                }
                // Sort descending so #1 is highest
                amounts.sort((a, b) => b - a);

                for (let i = 0; i < 10; i++) {
                    const amount = amounts[i];
                    const methodIdx = i % 3;
                    const imgPath = await this.generateImageFromHtml('receipt', {
                        txId: `REQ-${Math.floor(Math.random() * 9000)}-${methods[methodIdx]}`,
                        dateStr: new Date().toLocaleString('id-ID'),
                        amount: `Rp ${amount.toLocaleString('id-ID')}`,
                        username: `User${Math.floor(Math.random() * 9000)}***`,
                        method: methodLabels[methodIdx],
                        account: `08${Math.floor(Math.random() * 90)}****${Math.floor(Math.random() * 90)}`
                    });
                    images.push(imgPath);
                }

                const totalCair = amounts.reduce((sum, a) => sum + a, 0) + 3500000; // + markup

                const draft = await this.broadcastService.generateBroadcastDraft(`10 User dengan penarikan tertinggi pagi ini! Total withdraw cair pagi ini saja sudah mencapai Rp ${totalCair.toLocaleString('id-ID')}. Ayo buruan main dan wd juga!`, 'Motivasi & FOMO');

                await this.executeAlbumBroadcast(channelId, botToken, images, draft.content);

            } else if (hour === 15) {
                // 15:00 PM - AFTERNOON HUSTLE (TOP OFFER IMAGE)
                this.logger.log('Executing AFTERNOON Broadcast (Top Offer)');

                const offerReward = Math.floor(Math.random() * 30000) + 40000; // 40k - 70k
                const quota = Math.floor(Math.random() * 15) + 5; // 5-20 slot
                const imgPath = await this.generateImageFromHtml('offer', {
                    title: 'APP INSTALL<br />REWARD!!!',
                    amount: `Rp ${offerReward.toLocaleString('id-ID')}`,
                    username: 'Play & Win',
                    method: 'CPA Premium',
                    quota: `${quota}`
                }, '.promo-container');

                const draft = await this.broadcastService.generateBroadcastDraft(`Ada Offer Premium baru masuk di sistem! Bayaran gede banget Rp ${offerReward.toLocaleString('id-ID')} sekali selesai. Gampang banget tinggal main game bentar. Sisa ${quota} slot terakhir!`, 'Urgent & FOMO');

                await this.executeSingleBroadcast(channelId, botToken, draft.content, imgPath);

            } else if (hour === 21) {
                // 21:00 PM - NIGHT OWL (DAILY RECAP STATS)
                this.logger.log('Executing NIGHT Broadcast (Daily Recap)');

                // Daily total harus jauh lebih besar dari top 10 earners (top 10 = ~10-20% total)
                // Top 10 rata-rata ~30jt, jadi daily total = 150jt - 350jt
                const dailyTotal = Math.floor(Math.random() * 200000000) + 150000000;
                const tasksCompleted = Math.floor(Math.random() * 5000) + 6000; // 6k-11k
                const wdCompleted = Math.floor(Math.random() * 300) + 200; // 200-500

                const imgPath = await this.generateImageFromHtml('recap', {
                    dateStr: new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }),
                    amount: `Rp ${dailyTotal.toLocaleString('id-ID')}`,
                    tasksCompleted: tasksCompleted.toLocaleString('id-ID'),
                    wdCompleted: wdCompleted.toLocaleString('id-ID')
                }, '.recap-container');

                const draft = await this.broadcastService.generateBroadcastDraft(`Rekap hari ini: Sudah Rp ${(dailyTotal / 1000000).toFixed(1)} Juta lebih berhasil dicairkan ke seluruh user GRupiah tanpa hambatan! ${wdCompleted} penarikan sukses dari ${tasksCompleted.toLocaleString('id-ID')} tugas selesai hari ini. Yang belum ikutan, malam ini waktu yang pas buat rebahan sambil ngerjain tugas!`, 'Chill & Percaya Diri (Proof of Payment)');

                await this.executeSingleBroadcast(channelId, botToken, draft.content, imgPath);
            }

        } catch (error: any) {
            this.logger.error(`Error during broadcast execution: ${error.message}`);
        }
    }

    /**
     * Generate a real withdrawal receipt image and DM it to the user.
     */
    public async sendReceiptToUser(
        telegramId: bigint | string,
        withdrawalData: {
            id: string;
            amount: number;
            method: string;
            accountInfo: string; // JSON string
            processedAt?: Date;
            username?: string;
        }
    ): Promise<boolean> {
        try {
            const botToken = process.env.BOT_TOKEN;
            if (!botToken || botToken === 'mock_telegram_bot_token') {
                this.logger.warn('Mock token — skipping receipt DM');
                return false;
            }

            // Parse account info
            let accountDisplay = '****';
            try {
                const parsed = JSON.parse(withdrawalData.accountInfo);
                const num = parsed.number || parsed.accountNumber || '';
                accountDisplay = num.length > 4
                    ? num.substring(0, 4) + '****' + num.substring(num.length - 2)
                    : num || '****';
            } catch { }

            // Method label
            const methodLabels: Record<string, string> = {
                'BANK_TRANSFER': 'Transfer Bank',
                'DANA': 'DANA E-Wallet',
                'OVO': 'OVO Cash',
                'GOPAY': 'GoPay',
            };
            const methodLabel = methodLabels[withdrawalData.method] || withdrawalData.method;

            // Generate receipt image
            const imgPath = await this.generateImageFromHtml('receipt', {
                txId: `WD-${withdrawalData.id.substring(0, 8).toUpperCase()}`,
                dateStr: (withdrawalData.processedAt || new Date()).toLocaleString('id-ID'),
                amount: `Rp ${withdrawalData.amount.toLocaleString('id-ID')}`,
                username: withdrawalData.username || 'User',
                method: methodLabel,
                account: accountDisplay
            });

            // DM the receipt image to user (same pattern as executeSingleBroadcast)
            const caption = `✅ <b>Penarikan Berhasil!</b>\n\n💰 Nominal: <b>Rp ${withdrawalData.amount.toLocaleString('id-ID')}</b>\n📱 Metode: ${methodLabel}\n📋 ID: <code>${withdrawalData.id.substring(0, 8).toUpperCase()}</code>\n\nDana telah dikirim ke akun ${methodLabel} kamu. Terima kasih sudah menggunakan GRupiah! 🚀`;

            const formData = new FormData();
            formData.append('chat_id', telegramId.toString());
            const fileBuffer = fs.readFileSync(imgPath);
            const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
            formData.append('photo', blob, path.basename(imgPath));
            formData.append('caption', caption);
            formData.append('parse_mode', 'HTML');

            const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json() as any;

            // Cleanup temp image
            try { fs.unlinkSync(imgPath); } catch { }

            if (result.ok) {
                this.logger.log(`Receipt DM sent to ${telegramId}`);
                return true;
            } else {
                this.logger.error(`Receipt DM failed: ${result.description}`);
                return false;
            }
        } catch (error: any) {
            this.logger.error(`sendReceiptToUser error: ${error.message}`);
            return false;
        }
    }

    // ─── Shaving Detection Alert ───
    // Runs every 6 hours: WIB 06:00, 12:00, 18:00, 00:00
    // CET equivalents: 00:00, 06:00, 12:00, 18:00
    @Cron('0 */6 * * *')
    async handleShavingDetection() {
        this.logger.log('🔍 Cron fired: Shaving Detection Check');

        try {
            const alertsEnabled = await this.configService.getConfigValue('ADMIN_GROUP_ALERTS', 'false');
            const groupId = await this.configService.getConfigValue('ADMIN_GROUP_ID', '');

            if (alertsEnabled !== 'true' || !groupId) {
                this.logger.log('Shaving alerts disabled or no group ID set. Skipping.');
                return;
            }

            const botToken = process.env.BOT_TOKEN;
            if (!botToken) return;

            // Get today's click/completion data
            const now = new Date();
            const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

            // Get today's EARN mutations to count completions per provider
            const todayEarnings = await this.prisma.walletMutation.findMany({
                where: { type: 'EARN', createdAt: { gte: todayStart } }
            });

            const todayByProvider: Record<string, number> = {};
            for (const m of todayEarnings) {
                const desc = (m.description || '').toLowerCase();
                if (desc.includes('ogads')) todayByProvider['OGADS'] = (todayByProvider['OGADS'] || 0) + 1;
                else if (desc.includes('adblue')) todayByProvider['ADBLUEMEDIA'] = (todayByProvider['ADBLUEMEDIA'] || 0) + 1;
                else if (desc.includes('cpagrip')) todayByProvider['CPAGRIP'] = (todayByProvider['CPAGRIP'] || 0) + 1;
            }

            // Get overall provider stats (all-time)
            const providerStats = await this.prisma.offerScore.groupBy({
                by: ['provider'],
                _sum: { clicks: true, completions: true }
            });

            const alerts: string[] = [];

            for (const stat of providerStats) {
                const provider = stat.provider;
                const totalClicks = stat._sum.clicks || 0;
                const totalCompletions = stat._sum.completions || 0;
                const historicalCR = totalClicks > 0 ? (totalCompletions / totalClicks) * 100 : 0;
                const todayCompletions = todayByProvider[provider] || 0;

                // Alert 1: Provider has 50+ total clicks but 0 completions ever → likely shaving
                if (totalClicks >= 50 && totalCompletions === 0) {
                    alerts.push(`🚨 *${provider}*: ${totalClicks} clicks, 0 completions ever! Possible full shaving.`);
                }

                // Alert 2: Provider had good historical CR but today has many clicks, 0 completions
                if (historicalCR > 2 && totalClicks >= 30) {
                    // Check if recent pattern shows drop
                    const recentScores = await this.prisma.offerScore.findMany({
                        where: { provider, clicks: { gte: 10 } }
                    });
                    const deadOffers = recentScores.filter(s => s.completions === 0);
                    const deadRatio = recentScores.length > 0 ? (deadOffers.length / recentScores.length) * 100 : 0;

                    if (deadRatio > 60) {
                        alerts.push(`⚠️ *${provider}*: ${deadRatio.toFixed(0)}% of tracked offers are dead (${deadOffers.length}/${recentScores.length}). Historical CR: ${historicalCR.toFixed(1)}%`);
                    }
                }

                // Alert 3: Today had 20+ completions yesterday range but 0 today
                if (historicalCR > 3 && todayCompletions === 0 && totalCompletions > 10) {
                    alerts.push(`📉 *${provider}*: 0 completions today. Historical CR: ${historicalCR.toFixed(1)}%. Check if postbacks are working.`);
                }
            }

            if (alerts.length === 0) {
                this.logger.log('✅ No shaving anomalies detected.');
                return;
            }

            // Send alert to admin group
            const message = `🔍 *Shaving Detection Report*\n${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n${alerts.join('\n\n')}\n\n_Check admin dashboard for details._`;

            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: groupId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });

            this.logger.log(`📤 Sent shaving alert with ${alerts.length} warning(s) to group ${groupId}`);
        } catch (error: any) {
            this.logger.error(`Shaving detection error: ${error.message}`);
        }
    }
}
