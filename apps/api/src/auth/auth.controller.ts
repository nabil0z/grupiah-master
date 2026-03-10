import { Controller, Post, Body, UseGuards, Request, Injectable, UnauthorizedException } from '@nestjs/common';
import { TelegramAuthGuard } from './telegram-auth/telegram-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AdminConfigService } from '../admin/config/admin-config.service';

@Controller('auth')
export class AuthController {
    constructor(private prisma: PrismaService, private configService: AdminConfigService) { }

    @Post('telegram/login')
    @UseGuards(TelegramAuthGuard)
    async login(@Request() req: any, @Body() body: any) {
        const startParam = body?.startParam || null;
        const telegramUser = req.user;

        // In dev mode, the guard already created/fetched the dbUser. Skip BigInt conversion.
        if (req.dbUser && telegramUser.id === 'mock-user-123') {
            const safeUser = JSON.parse(JSON.stringify(req.dbUser, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
            ));
            const rewardsStr = await this.configService.getConfigValue('DAILY_LOGIN_REWARDS', '[5000, 10000, 15000, 25000, 35000, 50000, 100000]');
            let dailyRewards: number[] = [5000, 10000, 15000, 25000, 35000, 50000, 100000];
            try { dailyRewards = JSON.parse(rewardsStr); } catch { /* keep defaults */ }
            return {
                message: 'Login successful',
                user: safeUser,
                wallet: safeUser.wallet || { balance: 0 },
                canClaimDaily: true,
                currentStreak: 0,
                dailyRewards,
                token: 'dev_mock_token'
            };
        }

        // Check if user already exists
        let user = await this.prisma.user.findUnique({
            where: { telegramId: BigInt(telegramUser.id) },
            include: { wallet: true }
        });

        let canClaimDaily = true;
        let currentStreak = 0;

        // If new user, create their account + wallet
        if (!user) {
            // Decode startParam for referral check
            let referredById: string | null = null;
            if (startParam) {
                // startParam is the referralCode (e.g. 'ref_ABC123')
                const inviter = await this.prisma.user.findUnique({
                    where: { referralCode: startParam }
                });
                if (inviter) referredById = inviter.id;
            }

            user = await this.prisma.user.create({
                data: {
                    telegramId: BigInt(telegramUser.id),
                    username: telegramUser.username || null,
                    firstName: telegramUser.first_name || null,
                    lastName: telegramUser.last_name || null,
                    referralCode: `ref_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                    referredById: referredById,
                    lastLogin: new Date(),
                    wallet: {
                        create: { balance: 0.0 }
                    }
                },
                include: { wallet: true }
            });

            // New user — canClaimDaily is true, streak starts at 0
            canClaimDaily = true;
            currentStreak = 0;

        } else {
            // Existing user — check canClaimDaily BEFORE updating lastLogin
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const lastLoginDate = user.lastLogin ? new Date(user.lastLogin) : null;
            const lastLoginStr = lastLoginDate ? lastLoginDate.toISOString().split('T')[0] : null;

            canClaimDaily = lastLoginStr !== todayStr;
            currentStreak = user.dailyStreak || 0;

            // If user has no referrer yet and opened via referral link, link them now
            if (!user.referredById && startParam) {
                const inviter = await this.prisma.user.findUnique({
                    where: { referralCode: startParam }
                });
                if (inviter && inviter.id !== user.id) {
                    await this.prisma.user.update({
                        where: { id: user.id },
                        data: { referredById: inviter.id }
                    });
                }
            }

            // Now update lastLogin
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: { lastLogin: today },
                include: { wallet: true }
            });
        }

        // Convert BigInt to string before sending JSON response
        const safeUser = JSON.parse(JSON.stringify(user, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        const rewardsStr2 = await this.configService.getConfigValue('DAILY_LOGIN_REWARDS', '[5000, 10000, 15000, 25000, 35000, 50000, 100000]');
        let dailyRewards2: number[] = [5000, 10000, 15000, 25000, 35000, 50000, 100000];
        try { dailyRewards2 = JSON.parse(rewardsStr2); } catch { /* keep defaults */ }

        return {
            message: 'Login successful',
            user: safeUser,
            wallet: safeUser.wallet,
            canClaimDaily,
            currentStreak,
            dailyRewards: dailyRewards2,
            token: 'generate_jwt_here_later_if_needed_for_web_admin'
        };
    }
}
