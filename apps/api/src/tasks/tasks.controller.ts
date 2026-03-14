import { Controller, Get, Post, Body, UseGuards, Request, UseInterceptors, UploadedFile, Param, Res } from '@nestjs/common';
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

            // Get the highest resolution photo file_id
            const photoId = data.result.photo[data.result.photo.length - 1].file_id;

            // Store as "tgfile:FILE_ID" — our proxy endpoint will resolve this on demand.
            // This ensures the proof image NEVER expires, unlike direct Telegram URLs.
            const proofLink = `tgfile:${photoId}`;

            return {
                success: true,
                data: {
                    link: proofLink
                }
            };

        } catch (error: any) {
            console.error('[TasksController] uploadProof failed:', error);
            throw error;
        }
    }

    // Proxy endpoint: resolves a Telegram file_id to a fresh image and pipes it back.
    // This makes proof images permanent and avoids CORS/redirect issues.
    @Get('proof/:fileId')
    async getProofImage(@Param('fileId') fileId: string, @Res() res: any) {
        try {
            const botToken = process.env.BOT_TOKEN;
            if (!botToken) {
                return res.status(500).send('Bot token not configured');
            }

            // 1. Get file path from Telegram
            const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
            const fileData = await fileRes.json();

            if (!fileData.ok) {
                console.error('[ProofProxy] getFile failed:', fileData);
                return res.status(404).send('File not found on Telegram');
            }

            // 2. Fetch the actual image binary
            const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
            const imageRes = await fetch(fileUrl);

            if (!imageRes.ok) {
                console.error('[ProofProxy] Image fetch failed:', imageRes.status);
                return res.status(502).send('Failed to fetch image from Telegram');
            }

            // 3. Pipe the image data back with proper headers
            const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
            const buffer = Buffer.from(await imageRes.arrayBuffer());

            res.set({
                'Content-Type': contentType,
                'Content-Length': buffer.length,
                'Cache-Control': 'public, max-age=86400', // Cache 24h
                'Access-Control-Allow-Origin': '*',
            });
            return res.send(buffer);
        } catch (error: any) {
            console.error('[ProofProxy] getProofImage failed:', error);
            return res.status(500).send('Failed to retrieve proof image');
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
    async recordClick(@Body() body: { provider: string, externalId: string, reward?: number }, @Request() req: any) {
        try {
            if (!body.provider || !body.externalId) throw new Error('Missing provider or externalId');
            const userId = req.dbUser?.id || null;
            await this.tasksService.recordClick(body.provider, body.externalId, userId, body.reward || 0);
            return { success: true };
        } catch (error: any) {
            console.error('[TasksController] recordClick failed:', error);
            return { success: false, error: String(error) };
        }
    }
}
