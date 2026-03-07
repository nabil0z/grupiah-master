import { Controller, Post, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { TelegramAuthGuard } from '../auth/telegram-auth/telegram-auth.guard';
import { BroadcastService } from './broadcast.service';
import { BroadcastCronService } from './broadcast-cron.service';

@Controller('admin/broadcast')
@UseGuards(TelegramAuthGuard)
export class BroadcastController {
    constructor(
        private readonly broadcastService: BroadcastService,
        private readonly broadcastCronService: BroadcastCronService
    ) { }

    @Post('generate-draft')
    async generateDraft(@Body() body: { topic: string, tone?: string }) {
        if (!body.topic) {
            throw new HttpException('Topic is required', HttpStatus.BAD_REQUEST);
        }
        return this.broadcastService.generateBroadcastDraft(body.topic, body.tone);
    }

    @Post('send')
    async sendBroadcast(@Body() body: { content: string, imageUrl?: string, buttonText?: string, buttonUrl?: string }) {
        if (!body.content) {
            throw new HttpException('Content is required', HttpStatus.BAD_REQUEST);
        }
        return this.broadcastService.sendBroadcast(body.content, body.imageUrl, body.buttonText, body.buttonUrl);
    }

    @Post('private-blast')
    async sendPrivateBlast(@Body() body: {
        content: string,
        imageUrl?: string,
        buttonText?: string,
        buttonUrl?: string,
        showDefaultButton?: boolean
    }) {
        if (!body.content) {
            throw new HttpException('Content is required', HttpStatus.BAD_REQUEST);
        }
        return this.broadcastService.sendPrivateBlast(
            body.content,
            body.imageUrl,
            body.buttonText,
            body.buttonUrl,
            body.showDefaultButton
        );
    }

    // 🔥 Added for Testing Purposes
    @Post('test-cron')
    async testCron(@Body() body: { hour: number }) {
        if (!body.hour || ![9, 15, 21].includes(body.hour)) {
            throw new HttpException('Hour must be 9, 15, or 21', HttpStatus.BAD_REQUEST);
        }

        // Asynchronously start the broadcast generation process
        this.broadcastCronService.testTrigger(body.hour).catch(e => {
            console.error('Test Trigger Error:', e);
        });

        return { success: true, message: `Cron simulation for hour ${body.hour}:00 started! Check server logs.` };
    }

    @Post('test-shaving')
    async testShaving() {
        this.broadcastCronService.handleShavingDetection().catch(e => {
            console.error('Shaving Detection Test Error:', e);
        });
        return { success: true, message: 'Shaving detection triggered! Check Telegram group and server logs.' };
    }
}
