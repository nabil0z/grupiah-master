import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class BroadcastService {
    private readonly logger = new Logger(BroadcastService.name);
    private ai: GoogleGenAI;

    constructor(private prisma: PrismaService) {
        // Initialize Gemini with the system API key
        const apiKey = process.env.GEMINI_API_KEY;
        try {
            if (apiKey && apiKey !== 'mock_gemini_key') {
                this.ai = new GoogleGenAI({ apiKey });
            } else {
                this.ai = null as any;
            }
        } catch (e) {
            this.logger.warn('Failed to initialize GoogleGenAI. Running in fallback mock mode.', e);
            this.ai = null as any;
        }
    }

    async generateBroadcastDraft(topic: string, tone: string = 'Excited & FOMO'): Promise<{ content: string }> {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'mock_gemini_key') {
            return {
                content: `🚀 (MOCK AI DRAFT) [Topik: ${topic}]\n\nGuys buruan gas main GRupiah sekarang sebelum kehabisan kuota! Gampang banget nyari duit di sini 💸💸\n\nLangsung klik link di bawah ini:\n<a href="https://t.me/GRupiahBot/app">PLAY GRUPIAH</a>`
            };
        }

        try {
            const prompt = `Anda adalah seorang copywriter marketing profesional untuk Mini App Telegram bernama "GRupiah".
Tugas Anda adalah membuat 1 buah post broadcast Telegram yang akan disebarkan ke Channel resmi.

Topik Postingan: ${topic}
Style/Tone: ${tone}

Syarat Wajib:
1. Gunakan Bahasa Indonesia yang asik, gaul, agak FOMO (Fear of Missing Out), tapi tetap profesional dan mudah dibaca.
2. Gunakan emoji secukupnya untuk menarik perhatian.
3. Gunakan HTML formatting standard Telegram (<b> untuk bold, <i> untuk italic). JANGAN GUNAKAN MARKDOWN (** atau __).
4. JANGAN sertakan link atau Call To Action (CTA) apapun. Link sudah ditangani oleh tombol inline secara terpisah.
5. Pesan HARUS singkat, padat, maksimal 2 paragraf pendek saja.
6. Jangan sertakan tag pembuka atau penutup tambahan, langsung berikan output isi text nya saja.

Tuliskan draft broadcast tersebut sekarang:`;

            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            return { content: response.text || 'Gagal membuat teks.' };
        } catch (error: any) {
            this.logger.error('Failed to generate AI broadcast', error.message);
            throw new HttpException('AI Generation failed: ' + error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async sendBroadcast(content: string, imageUrl?: string, buttonText?: string, buttonUrl?: string): Promise<{ success: boolean }> {
        const botToken = process.env.BOT_TOKEN;
        const channelId = process.env.CHANNEL_ID || '@grupiah_official';

        if (!botToken || botToken === 'mock_telegram_bot_token') {
            this.logger.warn('Mock Telegram Token. Simulating send success.');
            return { success: true };
        }

        try {
            let url = '';
            const replyMarkup = (buttonText && buttonUrl) ? {
                inline_keyboard: [
                    [{ text: buttonText, url: buttonUrl }]
                ]
            } : {
                inline_keyboard: [
                    [{ text: '📱 Buka Mini App GRupiah', url: 'https://t.me/GRupiahBot/app' }]
                ]
            };
            let payload: any = {
                chat_id: channelId,
                parse_mode: 'HTML',
                reply_markup: replyMarkup
            };

            if (imageUrl) {
                url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
                payload.photo = imageUrl;
                payload.caption = content;
            } else {
                url = `https://api.telegram.org/bot${botToken}/sendMessage`;
                payload.text = content;
                payload.disable_web_page_preview = false;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!data.ok) {
                throw new Error(data.description);
            }

            return { success: true };
        } catch (error: any) {
            this.logger.error('Failed to send broadcast', error.message);
            throw new HttpException('Broadcast failed: ' + error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Send direct messages to all registered users via Telegram Bot API.
     * Supports text-only, photo+caption, and inline buttons.
     * Implements batching (25 per batch) with 1.5s delays to avoid rate limits.
     */
    async sendPrivateBlast(
        content: string,
        imageUrl?: string,
        buttonText?: string,
        buttonUrl?: string,
        showDefaultButton?: boolean
    ): Promise<{ success: boolean; sent: number; failed: number; total: number }> {
        const botToken = process.env.BOT_TOKEN;

        if (!botToken || botToken === 'mock_telegram_bot_token') {
            this.logger.warn('Mock Telegram Token. Simulating private blast success.');
            return { success: true, sent: 0, failed: 0, total: 0 };
        }

        // 1. Fetch all users with their telegram IDs
        const users = await this.prisma.user.findMany({
            where: { isBanned: false },
            select: { telegramId: true }
        });

        const totalUsers = users.length;
        let sent = 0;
        let failed = 0;

        // 2. Build the inline keyboard
        const buttons: Array<{ text: string; url: string }[]> = [];

        // Custom button (from admin input)
        if (buttonText && buttonUrl) {
            buttons.push([{ text: buttonText, url: buttonUrl }]);
        }

        // Default button (togglable by admin, defaults to true)
        if (showDefaultButton !== false) {
            buttons.push([{ text: '📱 Buka Mini App GRupiah', url: 'https://t.me/GRupiahBot/app' }]);
        }

        const replyMarkup = buttons.length > 0 ? { inline_keyboard: buttons } : undefined;

        // 3. Define the batch sender
        const BATCH_SIZE = 25;
        const DELAY_MS = 1500; // 1.5 seconds between batches

        const sendToUser = async (telegramId: bigint) => {
            try {
                let url = '';
                const payload: any = {
                    chat_id: telegramId.toString(),
                    parse_mode: 'HTML',
                    reply_markup: replyMarkup
                };

                if (imageUrl) {
                    url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
                    payload.photo = imageUrl;
                    payload.caption = content;
                } else {
                    url = `https://api.telegram.org/bot${botToken}/sendMessage`;
                    payload.text = content;
                }

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                if (data.ok) {
                    sent++;
                } else {
                    // User might have blocked the bot or chat not found
                    failed++;
                    if (data.error_code !== 403 && data.error_code !== 400) {
                        this.logger.warn(`DM failed for ${telegramId}: ${data.description}`);
                    }
                }
            } catch (err) {
                failed++;
            }
        };

        // 4. Batch processing with delay
        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        for (let i = 0; i < users.length; i += BATCH_SIZE) {
            const batch = users.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(u => sendToUser(u.telegramId)));

            // Delay between batches (except last)
            if (i + BATCH_SIZE < users.length) {
                await sleep(DELAY_MS);
            }

            this.logger.log(`[DM Blast] Progress: ${Math.min(i + BATCH_SIZE, users.length)}/${totalUsers} sent`);
        }

        this.logger.log(`[DM Blast] Complete! Sent: ${sent}, Failed: ${failed}, Total: ${totalUsers}`);

        return { success: true, sent, failed, total: totalUsers };
    }
}

