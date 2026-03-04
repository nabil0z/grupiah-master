import { Controller, Get, Post, Body, UseGuards, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TelegramAuthGuard } from '../auth/telegram-auth/telegram-auth.guard';
import { SubmitTaskDto } from './dto/submit-task.dto';

@Controller('tasks')
@UseGuards(TelegramAuthGuard)
export class TasksController {
    constructor(private readonly tasksService: TasksService) { }

    @Get()
    async getTasks(@Request() req: any) {
        try {
            console.log('[TasksController] /tasks hit. dbUser exists?', !!req.dbUser);
            if (!req.dbUser) {
                console.log('[TasksController] Returning empty because no dbUser.');
                return [];
            }

            const userId = req.dbUser.id;
            const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
            const ip = (rawIp && rawIp !== '::1' && rawIp !== '127.0.0.1' && rawIp !== 'localhost') ? rawIp : '114.124.237.151';
            const userAgent = req.headers['user-agent'] || 'Mozilla/5.0';

            console.log(`[TasksController] Forwarding Request... IP: ${ip} | User-Agent: ${userAgent?.substring(0, 15)}...`);
            return await this.tasksService.getAvailableTasks(userId, ip, userAgent);
        } catch (error: any) {
            console.error('[TasksController] getTasks crashed:', error);
            require('fs').writeFileSync('tasks_controller_error.log', error.stack || String(error));
            throw error;
        }
    }

    @Post('submit')
    async submitTask(@Body() body: SubmitTaskDto, @Request() req: any) {
        try {
            if (!req.dbUser) throw new Error('Unauthorized');
            const result = await this.tasksService.submitManualTask(req.dbUser.id, body.taskId, body.proofUrl, body.proofText);
            return {
                success: true,
                message: 'Task submitted for review',
                data: result
            };
        } catch (error: any) {
            console.error('[TasksController] submitTask failed:', error);
            throw error;
        }
    }

    @Post('upload-proof')
    @UseInterceptors(require('@nestjs/platform-express').FileInterceptor('image'))
    async uploadProof(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!req.dbUser) throw new Error('Unauthorized');
            if (!file) throw new Error('No file provided');

            const botToken = process.env.BOT_TOKEN;
            const channelId = process.env.DATABASE_CHANNEL_ID || process.env.CHANNEL_ID;

            if (!botToken || !channelId) {
                console.warn('[TasksController] BOT_TOKEN or DATABASE_CHANNEL_ID is missing. Simulating upload success.');
                return {
                    success: true,
                    data: {
                        link: 'https://placehold.co/600x400?text=Simulated+Proof+Upload'
                    }
                };
            }

            // Prepare multipart form data for Telegram API
            const formData = new FormData();
            formData.append('chat_id', channelId);
            formData.append('photo', new Blob([file.buffer as any], { type: file.mimetype }), file.originalname);
            formData.append('caption', `Task Proof Upload by User ${req.dbUser.id}`);

            const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
                method: 'POST',
                body: formData as any
            });

            const data = await response.json();

            if (!data.ok) {
                console.error('[TasksController] Telegram Upload Failed:', data);
                throw new Error(data.description || 'Failed to upload to Telegram');
            }

            // Get the highest resolution photo (the last one in the array)
            const photoId = data.result.photo[data.result.photo.length - 1].file_id;

            // Note: In a real app, you might want to fetch the actual URL using getFile, 
            // but Telegram URLs expire. For task proofs, saving the file_id and rendering 
            // it on demand via a proxy endpoint is better, but since the frontend expects a URL,
            // we will construct a proxy URL that points to our own backend.

            // Since we need a public URL, we will return a generic structure that the frontend can use.
            // By storing the file_id disguised as a URL, we can resolve it later in the admin panel if needed.
            // However, a much simpler approach for this app is to just get the file path.

            const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${photoId}`);
            const fileData = await fileRes.json();

            if (!fileData.ok) {
                throw new Error('Failed to retrieve file path from Telegram');
            }

            const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;

            return {
                success: true,
                data: {
                    link: fileUrl
                }
            };

        } catch (error: any) {
            console.error('[TasksController] uploadProof failed:', error);
            throw error;
        }
    }

    @Get('flash')
    async getFlashTasks(@Request() req: any) {
        try {
            if (!req.dbUser) return [];

            const userId = req.dbUser.id;
            const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
            const ip = (rawIp && rawIp !== '::1' && rawIp !== '127.0.0.1' && rawIp !== 'localhost') ? rawIp : '114.124.237.151';
            const userAgent = req.headers['user-agent'] || 'Mozilla/5.0';

            return await this.tasksService.getFlashTasks(userId, ip, userAgent);
        } catch (error: any) {
            console.error('[TasksController] getFlashTasks crashed:', error);
            throw error;
        }
    }

    @Post('click')
    async recordClick(@Body() body: { provider: string, externalId: string }) {
        try {
            if (!body.provider || !body.externalId) throw new Error('Missing provider or externalId');
            await this.tasksService.recordClick(body.provider, body.externalId);
            return { success: true };
        } catch (error: any) {
            console.error('[TasksController] recordClick failed:', error);
            return { success: false, error: String(error) };
        }
    }
}
