import { Controller, Post, Body, UseGuards, Get, Param, Request, HttpException, HttpStatus } from '@nestjs/common';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { AdminService } from './admin.service';

@Controller('admin')
// Uncomment this once Prisma is fully integrated to enforce TMA Auth
// @UseGuards(TelegramAuthGuard)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Post('withdrawals/:id/action')
    async actionWithdrawal(@Param('id') withdrawalId: string, @Body() body: { action: 'APPROVE' | 'REJECT' }, @Request() req: any) {
        // Admin ID will be derived from req.user.id securely in production TelegramAuthGuard
        const adminId = req.user?.id === 'mock-user-123' ? 12345678 : Number(req.user?.id || 12345678);

        if (body.action === 'APPROVE') {
            return this.adminService.approveWithdrawalByPartner(withdrawalId, adminId);
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
        return this.adminService.getUsersList();
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

    @Post('tasks')
    async createCustomTask(@Body() body: { title: string, description: string, reward: number }, @Request() req: any) {
        const adminId = req.user?.id === 'mock-user-123' ? 12345678 : Number(req.user?.id || 12345678);
        return this.adminService.createCustomTask(body.title, body.description, body.reward, adminId);
    }
}
