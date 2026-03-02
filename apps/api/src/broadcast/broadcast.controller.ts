import { Controller, Post, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { TelegramAuthGuard } from '../auth/telegram-auth/telegram-auth.guard';
import { BroadcastService } from './broadcast.service';

@Controller('admin/broadcast')
@UseGuards(TelegramAuthGuard)
export class BroadcastController {
    constructor(private readonly broadcastService: BroadcastService) { }

    @Post('generate-draft')
    async generateDraft(@Body() body: { topic: string, tone?: string }) {
        if (!body.topic) {
            throw new HttpException('Topic is required', HttpStatus.BAD_REQUEST);
        }
        return this.broadcastService.generateBroadcastDraft(body.topic, body.tone);
    }

    @Post('send')
    async sendBroadcast(@Body() body: { content: string, imageUrl?: string }) {
        if (!body.content) {
            throw new HttpException('Content is required', HttpStatus.BAD_REQUEST);
        }
        return this.broadcastService.sendBroadcast(body.content, body.imageUrl);
    }
}
