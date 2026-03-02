import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TelegramAuthGuard } from '../auth/telegram-auth/telegram-auth.guard';

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
}
