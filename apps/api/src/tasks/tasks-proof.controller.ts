import { Controller, Get, Param, Res } from '@nestjs/common';

/**
 * Public controller for serving task proof images.
 * This is intentionally NOT guarded by TelegramAuthGuard because
 * browsers load <img src="..."> without auth headers.
 * Security: file_id is opaque and non-guessable.
 */
@Controller('tasks')
export class TasksProofController {
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
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*',
            });
            return res.send(buffer);
        } catch (error: any) {
            console.error('[ProofProxy] getProofImage failed:', error);
            return res.status(500).send('Failed to retrieve proof image');
        }
    }
}
