import { Controller, Post, Body, UseGuards, Get, Param, Request, HttpException, HttpStatus, Put, Delete } from '@nestjs/common';
import { TelegramAuthGuard } from '../auth/telegram-auth/telegram-auth.guard';
import { AdminService } from './admin.service';
import { BroadcastCronService } from '../broadcast/broadcast-cron.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin')
// Uncomment this once Prisma is fully integrated to enforce TMA Auth
// @UseGuards(TelegramAuthGuard)
export class AdminController {
    constructor(
        private readonly adminService: AdminService,
        private readonly broadcastCron: BroadcastCronService,
        private readonly prisma: PrismaService,
    ) { }

    @Post('withdrawals/:id/action')
    async actionWithdrawal(@Param('id') withdrawalId: string, @Body() body: { action: 'APPROVE' | 'REJECT' }, @Request() req: any) {
        // Admin ID will be derived from req.user.id securely in production TelegramAuthGuard
        const adminId = req.user?.id === 'mock-user-123' ? 12345678 : Number(req.user?.id || 12345678);

        if (body.action === 'APPROVE') {
            const result = await this.adminService.approveWithdrawalByPartner(withdrawalId, adminId);

            // 🧾 Fire receipt DM in the background (non-blocking)
            this.prisma.withdrawal.findUnique({
                where: { id: withdrawalId },
                include: { user: { select: { telegramId: true, username: true, firstName: true } } }
            }).then(wd => {
                if (wd && wd.user) {
                    this.broadcastCron.sendReceiptToUser(wd.user.telegramId, {
                        id: wd.id,
                        amount: Number(wd.amount),
                        method: wd.method,
                        accountInfo: wd.accountInfo,
                        processedAt: wd.updatedAt,
                        username: wd.user.firstName || wd.user.username || 'User'
                    }).catch(e => console.error('Receipt DM Error:', e));
                }
            }).catch(e => console.error('Receipt lookup error:', e));

            return result;
        } else if (body.action === 'REJECT') {
            return this.adminService.rejectWithdrawalByPartner(withdrawalId, adminId);
        }

        throw new HttpException('Invalid action', HttpStatus.BAD_REQUEST);
    }

    @Post('marketing/fake-withdrawal')
    async createFakeWithdrawalFeed(@Body() body: { amount: number; method: string }) {
        // Generating faked withdrawal feed data (masked username + random data)
        return this.adminService.generateFakeFeed(body.amount, body.method);
    }

    @Get('withdrawals/pending')
    async getPendingWithdrawals() {
        // List pending withdrawals for the Admin TMA overview
        return this.adminService.getPendingList();
    }

    @Get('users')
    async getUsersList() {
        const users = await this.adminService.getUsersList();
        return JSON.parse(JSON.stringify(users, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));
    }

    @Post('users/:id/ban')
    async toggleUserBan(@Param('id') userId: string, @Request() req: any) {
        // Admin ID will be derived from req.user.id securely in production TelegramAuthGuard
        const adminId = req.user?.id === 'mock-user-123' ? 12345678 : Number(req.user?.id || 12345678);
        return this.adminService.toggleUserBan(userId, adminId);
    }

    @Get('tasks/pending-review')
    async getPendingCustomTasks() {
        return this.adminService.getPendingCustomTasks();
    }

    @Post('tasks/review/:id')
    async reviewCustomTask(@Param('id') userTaskId: string, @Body() body: { action: 'APPROVE' | 'REJECT' }, @Request() req: any) {
        const adminId = req.user?.id === 'mock-user-123' ? 12345678 : Number(req.user?.id || 12345678);
        return this.adminService.reviewCustomTask(userTaskId, body.action, adminId);
    }

    @Get('analytics')
    async getAnalytics() {
        return this.adminService.getAnalytics();
    }

    @Get('tasks')
    async getCustomTasks() {
        return this.adminService.getCustomTasks();
    }

    @Post('tasks')
    async createCustomTask(@Body() body: { title: string, description: string, reward: number, instructions?: string, logoUrl?: string, link?: string }, @Request() req: any) {
        const adminId = req.user?.id === 'mock-user-123' ? 12345678 : Number(req.user?.id || 12345678);
        return this.adminService.createCustomTask(body.title, body.description, body.reward, body.instructions, body.logoUrl, body.link, adminId);
    }

    @Put('tasks/:id')
    async updateCustomTask(@Param('id') id: string, @Body() body: any, @Request() req: any) {
        const adminId = req.user?.id === 'mock-user-123' ? 12345678 : Number(req.user?.id || 12345678);
        return this.adminService.updateCustomTask(id, body, adminId);
    }

    @Delete('tasks/:id')
    async deleteCustomTask(@Param('id') id: string, @Request() req: any) {
        const adminId = req.user?.id === 'mock-user-123' ? 12345678 : Number(req.user?.id || 12345678);
        return this.adminService.deleteCustomTask(id, adminId);
    }

    @Get('configs/flash-tasks')
    async getFlashTaskConfigs() {
        const ogads = await this.adminService.getConfig('FLASH_TASK_OGADS');
        const adblue = await this.adminService.getConfig('FLASH_TASK_ADBLUEMEDIA');
        const custom = await this.adminService.getConfig('FLASH_TASK_CUSTOM');
        return { ogads, adblue, custom };
    }

    @Post('configs/flash-tasks')
    async updateFlashTaskConfigs(@Body() body: { ogads: string, adblue: string, custom: string }, @Request() req: any) {
        const adminId = req.user?.id === 'mock-user-123' ? 12345678 : Number(req.user?.id || 12345678);
        await this.adminService.setConfig('FLASH_TASK_OGADS', body.ogads || '', adminId);
        await this.adminService.setConfig('FLASH_TASK_ADBLUEMEDIA', body.adblue || '', adminId);
        await this.adminService.setConfig('FLASH_TASK_CUSTOM', body.custom || '', adminId);
        return { success: true };
    }

    @Get('configs')
    async getAllConfigs() {
        return this.adminService.getAllConfigs();
    }

    @Post('configs')
    async updateConfigs(@Body() body: { configs: Record<string, string> }, @Request() req: any) {
        const adminId = req.user?.id === 'mock-user-123' ? 12345678 : Number(req.user?.id || 12345678);
        return this.adminService.setConfigs(body.configs, adminId);
    }

    @Get('dashboard-stats')
    async getDashboardStats() {
        const stats = await this.adminService.getDashboardStats();
        return JSON.parse(JSON.stringify(stats, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));
    }

    @Get('stats/online')
    async getOnlineStats() {
        const onlineCount = await this.adminService.getOnlineUserCount();
        return { onlineCount };
    }

    // ========== Marketing Mode Endpoints ==========

    @Post('users/:id/marketing')
    async toggleMarketingFlag(@Param('id') userId: string, @Request() req: any) {
        const adminId = req.user?.id === 'mock-user-123' ? 12345678 : Number(req.user?.id || 12345678);
        return this.adminService.toggleMarketingFlag(userId, adminId);
    }

    @Post('users/:id/balance')
    async adjustBalance(@Param('id') userId: string, @Body() body: { amount: number, description?: string }, @Request() req: any) {
        const adminId = req.user?.id === 'mock-user-123' ? 12345678 : Number(req.user?.id || 12345678);
        return this.adminService.adjustBalance(userId, body.amount, body.description || '', adminId);
    }

    @Post('users/:id/inject-stats')
    async injectFakeStats(@Param('id') userId: string, @Body() body: { tasks?: number, withdrawals?: number, referrals?: number }, @Request() req: any) {
        const adminId = req.user?.id === 'mock-user-123' ? 12345678 : Number(req.user?.id || 12345678);
        return this.adminService.injectFakeStats(userId, body.tasks || 0, body.withdrawals || 0, body.referrals || 0, adminId);
    }

    @Post('users/:id/cleanup-fake')
    async cleanupFakeData(@Param('id') userId: string, @Request() req: any) {
        const adminId = req.user?.id === 'mock-user-123' ? 12345678 : Number(req.user?.id || 12345678);
        return this.adminService.cleanupFakeData(userId, adminId);
    }

    // ========== Creator Program ==========

    @Get('creators')
    async getCreatorList() {
        return this.adminService.getCreatorList();
    }

    @Post('creators/:id/approve')
    async approveCreator(@Param('id') userId: string, @Request() req: any) {
        const adminId = req.user?.id === 'mock-user-123' ? 12345678 : Number(req.user?.id || 12345678);
        return this.adminService.approveCreator(userId, adminId);
    }

    @Post('creators/:id/reject')
    async rejectCreator(@Param('id') userId: string, @Request() req: any) {
        const adminId = req.user?.id === 'mock-user-123' ? 12345678 : Number(req.user?.id || 12345678);
        return this.adminService.rejectCreator(userId, adminId);
    }

    @Post('creators/:id/revoke')
    async revokeCreator(@Param('id') userId: string, @Request() req: any) {
        const adminId = req.user?.id === 'mock-user-123' ? 12345678 : Number(req.user?.id || 12345678);
        return this.adminService.revokeCreator(userId, adminId);
    }
}

