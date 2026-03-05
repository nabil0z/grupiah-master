import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
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

    private async generateImageFromHtml(templateName: string, data: Record<string, string>, containerClass: string = '.receipt-container'): Promise<string> {
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

                // 1. Generate Fake Data
                const images: string[] = [];
                let totalCair = 0;

                for (let i = 0; i < 10; i++) {
                    const amount = Math.floor(Math.random() * 500000) + 100000; // 100k - 600k
                    totalCair += amount;

                    const imgPath = await this.generateImageFromHtml('receipt', {
                        txId: `REQ-${Math.floor(Math.random() * 9000)}-${['DANA', 'OVO', 'GOPAY'][i % 3]}`,
                        dateStr: new Date().toLocaleString('id-ID'),
                        amount: `Rp ${amount.toLocaleString('id-ID')}`,
                        username: `User${Math.floor(Math.random() * 9000)}***`,
                        method: ['DANA E-Wallet', 'OVO Cash', 'GoPay'][i % 3],
                        account: `08${Math.floor(Math.random() * 90)}****${Math.floor(Math.random() * 90)}`
                    });
                    images.push(imgPath);
                }

                totalCair += 1500000; // Markup total

                const draft = await this.broadcastService.generateBroadcastDraft(`10 User dengan penarikan tertinggi pagi ini! Total withdraw cair pagi ini saja sudah mencapai Rp ${totalCair.toLocaleString('id-ID')}. Ayo buruan main dan wd juga!`, 'Motivasi & FOMO');

                await this.executeAlbumBroadcast(channelId, botToken, images, draft.content);

            } else if (hour === 15) {
                // 15:00 PM - AFTERNOON HUSTLE (TOP OFFER IMAGE)
                this.logger.log('Executing AFTERNOON Broadcast (Top Offer)');

                const imgPath = await this.generateImageFromHtml('receipt', {
                    txId: `OFFER-ALERT`,
                    dateStr: new Date().toLocaleString('id-ID'),
                    amount: `Rp 50.000`, // Example offer reward
                    username: `Spesial Offer`,
                    method: `Task Premium`,
                    account: `Terbatas`
                });

                const draft = await this.broadcastService.generateBroadcastDraft(`Ada Offer Premium baru masuk di sistem! Bayaran gede banget Rp 50ribu sekali selesai. Gampang banget tinggal main game bentar. Siapa cepet dia dapat!`, 'Urgent & FOMO');

                await this.executeSingleBroadcast(channelId, botToken, draft.content, imgPath);

            } else if (hour === 21) {
                // 21:00 PM - NIGHT OWL (DAILY RECAP STATS)
                this.logger.log('Executing NIGHT Broadcast (Daily Recap)');

                const imgPath = await this.generateImageFromHtml('receipt', {
                    txId: `REKAP-HARI-INI`,
                    dateStr: new Date().toLocaleString('id-ID'),
                    amount: `Rp 15.420.000`, // Example daily total
                    username: `Semua User`,
                    method: `DANA/OVO/GOPAY`,
                    account: `Total Hari Ini`
                });

                const draft = await this.broadcastService.generateBroadcastDraft(`Rekap hari ini: Sudah Rp 15 Juta lebih berhasil dicairkan ke seluruh user GRupiah tanpa hambatan! Yang belum ikutan, malam ini waktu yang pas buat rebahan sambil ngerjain tugas. Besok pagi tinggal Tarik Dana!`, 'Chill & Percaya Diri (Proof of Payment)');

                await this.executeSingleBroadcast(channelId, botToken, draft.content, imgPath);
            }

        } catch (error: any) {
            this.logger.error(`Error during broadcast execution: ${error.message}`);
        }
    }
}
