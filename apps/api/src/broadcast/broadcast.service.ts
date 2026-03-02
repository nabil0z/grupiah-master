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
        if (apiKey && apiKey !== 'mock_gemini_key') {
            this.ai = new GoogleGenAI({ apiKey });
        } else {
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
3. Gunakan HTML formatting standard Telegram (<b> untuk bold, <i> untuk italic, <a> untuk link). JANGAN GUNAAN MARKDOWN (** atau __).
4. Di bagian akhir, SELALU berikan Call To Action (CTA) dengan teks link: <a href="https://t.me/GRupiahBot/app">MAINKAN GRUPIAH SEKARANG</a>.
5. Pesan tidak boleh terlalu panjang (maksimal 3 paragraf pendek).
6. Jangan sertakan tag pembuka atau penutup tambahan, langsung berikan output isi text nya saja.

Tuliskan draft broadcast tersebut sekarang:`

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

    async sendBroadcast(content: string, imageUrl?: string): Promise<{ success: boolean }> {
        const botToken = process.env.BOT_TOKEN;
        const channelId = process.env.CHANNEL_ID || '@grupiah_official';

        if (!botToken || botToken === 'mock_telegram_bot_token') {
            this.logger.warn('Mock Telegram Token. Simulating send success.');
            return { success: true };
        }

        try {
            let url = '';
            let payload: any = {
                chat_id: channelId,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📱 Buka Mini App GRupiah', url: 'https://t.me/GRupiahBot/app' }]
                    ]
                }
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
}
