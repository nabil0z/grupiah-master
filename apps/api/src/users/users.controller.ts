import { Controller, Get, Post, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { TelegramAuthGuard } from '../auth/telegram-auth/telegram-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AdminConfigService } from '../admin/config/admin-config.service';

@Controller('users')
export class UsersController {
    private channelVerifyCache = new Map<string, { status: boolean, timestamp: number }>();

    constructor(private prisma: PrismaService, private configService: AdminConfigService) { }

    @Get('me')
    @UseGuards(TelegramAuthGuard)
    async getProfile(@Request() req: any) {
        try {
            const reqId = req.user.id === 'mock-user-123' ? '123' : req.user.id;
            const telegramId = BigInt(reqId);

            const user = await this.prisma.user.findUnique({
                where: { telegramId },
                include: {
                    wallet: true,
                    badges: true
                }
            });

            if (!user) {
                return { error: 'User not found' };
            }

            const todayStr = new Date().toISOString().split('T')[0];
            const lastLoginStr = user.lastLogin ? user.lastLogin.toISOString().split('T')[0] : null;
            const canClaimDaily = lastLoginStr !== todayStr;

            // Safe JSON conversion for BigInt
            const responseJson = JSON.parse(JSON.stringify(user, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
            ));

            const minWithdrawStr = await this.configService.getConfigValue('APP_MIN_WITHDRAW', '500000');

            return {
                ...responseJson,
                canClaimDaily,
                currentStreak: user.dailyStreak,
                appConfig: {
                    minWithdraw: parseInt(minWithdrawStr) || 500000
                }
            };
        } catch (e: any) {
            console.error(e);
            return { error: e.message, stack: e.stack };
        }
    }

    @Post('daily-checkin')
    @UseGuards(TelegramAuthGuard)
    async claimDaily(@Request() req: any) {
        const reqId = req.user.id === 'mock-user-123' ? '123' : req.user.id;
        const telegramId = BigInt(reqId);

        const user = await this.prisma.user.findUnique({ where: { telegramId }, include: { wallet: true } });
        if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const lastLoginStr = user.lastLogin ? user.lastLogin.toISOString().split('T')[0] : null;

        if (lastLoginStr === todayStr) {
            throw new HttpException('Already claimed today', HttpStatus.BAD_REQUEST);
        }

        let newStreak = user.dailyStreak;

        if (user.lastLogin) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            if (lastLoginStr === yesterdayStr) {
                newStreak += 1;
            } else {
                newStreak = 1; // broken streak
            }
        } else {
            newStreak = 1;
        }

        if (newStreak > 7) newStreak = 1;

        const rewardsStr = await this.configService.getConfigValue('DAILY_LOGIN_REWARDS', '[5000, 10000, 15000, 25000, 35000, 50000, 100000]');
        const rewards = JSON.parse(rewardsStr);
        const rewardFound = rewards[newStreak - 1];

        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: user.id },
                data: { dailyStreak: newStreak, lastLogin: today }
            });

            let wallet = user.wallet;
            if (!wallet) {
                wallet = await tx.wallet.create({ data: { userId: user.id, balance: 0 } });
            }

            await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { increment: rewardFound } }
            });

            await tx.walletMutation.create({
                data: {
                    walletId: wallet.id,
                    amount: rewardFound,
                    type: 'EARN',
                    description: `Daily Check-In Day ${newStreak}`
                }
            });
        });

        return {
            success: true,
            reward: rewardFound,
            newStreak,
            walletBalance: (Number(user.wallet?.balance || 0) + rewardFound)
        };
    }

    @Get('verify-channel')
    @UseGuards(TelegramAuthGuard)
    async verifyChannel(@Request() req: any) {
        const userId = req.user.id;

        if (userId === 'mock-user-123') {
            return { joined: true, cached: true };
        }

        const cacheKey = String(userId);
        const cached = this.channelVerifyCache.get(cacheKey);
        const now = Date.now();

        if (cached && (now - cached.timestamp < 5 * 60 * 1000)) {
            return { joined: cached.status, cached: true };
        }

        try {
            const botToken = process.env.BOT_TOKEN;
            const channelId = process.env.CHANNEL_ID || '@grupiah_official';

            if (!botToken || botToken === 'mock_telegram_bot_token') {
                this.channelVerifyCache.set(cacheKey, { status: true, timestamp: now });
                return { joined: true, cached: false, warning: "Mock token detected" };
            }

            const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${channelId}&user_id=${userId}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.ok) {
                const status = data.result.status;
                const isJoined = ['member', 'administrator', 'creator'].includes(status);
                this.channelVerifyCache.set(cacheKey, { status: isJoined, timestamp: now });
                return { joined: isJoined, cached: false };
            } else {
                return { joined: false, cached: false, error: data.description };
            }
        } catch (err) {
            console.error('Network error checking channel:', err);
            return { joined: true, cached: false, error: "Network fault" };
        }
    }

    @Get('leaderboard')
    @UseGuards(TelegramAuthGuard)
    async getLeaderboard(@Request() req: any) {
        try {
            const reqId = req.user.id === 'mock-user-123' ? '123' : req.user.id;
            const telegramId = BigInt(reqId);

            const me = await this.prisma.user.findUnique({
                where: { telegramId },
                include: { wallet: true, referrals: true }
            });

            // Helper to partially mask strings for privacy
            const maskString = (str: string) => {
                if (!str || str.length <= 3) return '***';
                const first = str.substring(0, 2);
                const last = str.substring(str.length - 2);
                return `${first}***${last}`;
            };

            // 1. Generate Fake "Sultan" Earnings
            const fakeTopEarnings = [
                { rank: 1, name: maskString("Budi Santoso"), username: maskString("@budis_king"), amount: "Rp 18.500.000", isMe: false, avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop" },
                { rank: 2, name: maskString("Reza Rahardian"), username: maskString("@rezajp"), amount: "Rp 14.800.000", isMe: false, avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop" },
                { rank: 3, name: maskString("Siti Nurhaliza"), username: maskString("@sitihalimah"), amount: "Rp 11.200.000", isMe: false, avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop" },
                { rank: 4, name: maskString("Alex Binsar"), username: maskString("@alexbins"), amount: "Rp 9.100.000", isMe: false, avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop" },
                { rank: 5, name: maskString("Tono M"), username: maskString("@tonomulia"), amount: "Rp 7.950.000", isMe: false, avatar: "https://images.unsplash.com/photo-1548142813-c348350df52b?w=150&h=150&fit=crop" },
                { rank: 6, name: maskString("Ayu Azhari"), username: maskString("@ayua"), amount: "Rp 6.500.000", isMe: false, avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop" },
                { rank: 7, name: maskString("Deni S"), username: maskString("@denis"), amount: "Rp 5.200.000", isMe: false, avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop" }
            ];

            // 2. Generate Fake "Sultan" Referrals
            const fakeTopReferrals = [
                { rank: 1, name: maskString("Wahyu Cuan"), username: maskString("@wahyucuan"), amount: "4,520 Teman", isMe: false, avatar: "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=150&h=150&fit=crop" },
                { rank: 2, name: maskString("Rina Master"), username: maskString("@rinamas"), amount: "3,150 Teman", isMe: false, avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop" },
                { rank: 3, name: maskString("Joko Crypto"), username: maskString("@jokocrypt"), amount: "2,840 Teman", isMe: false, avatar: "https://images.unsplash.com/photo-1528892952291-009c663ce843?w=150&h=150&fit=crop" },
                { rank: 4, name: maskString("Siska K"), username: maskString("@siskakohl"), amount: "1,920 Teman", isMe: false, avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop" },
                { rank: 5, name: maskString("Gatot Kaca"), username: maskString("@gatot"), amount: "1,200 Teman", isMe: false, avatar: "https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?w=150&h=150&fit=crop" },
                { rank: 6, name: maskString("Lina M"), username: maskString("@lina_m"), amount: "950 Teman", isMe: false, avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&h=150&fit=crop" },
                { rank: 7, name: maskString("Bambang P"), username: maskString("@bambang"), amount: "840 Teman", isMe: false, avatar: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=150&h=150&fit=crop" }
            ];

            // 3. Construct "Me" Objects. We force rank them very low so they always look up to the fake accounts.
            const myBalance = me?.wallet?.balance ? Number(me.wallet.balance) : 0;
            const myReferralCount = me?.referrals?.length || 0;

            // Artificial Rank Calculation for the current User
            let myEarnRank = 140 - Math.floor(myBalance / 50000);
            if (myBalance === 0) myEarnRank = 5000 + Math.floor(Math.random() * 4000); // Sink to rank 5000-9000 if $0
            else if (myEarnRank < 8) myEarnRank = 8; // assure they never beat the top 7 fakes

            let myRefRank = 80 - Math.floor(myReferralCount / 5);
            if (myReferralCount === 0) myRefRank = 5000 + Math.floor(Math.random() * 4000);
            else if (myRefRank < 8) myRefRank = 8;

            const meEarn = {
                rank: myEarnRank,
                name: me?.firstName || "You",
                username: me?.username ? `@${me.username}` : "Anonymous",
                amount: `Rp ${myBalance.toLocaleString('id-ID')}`,
                isMe: true,
                avatar: `https://i.pravatar.cc/150?u=${me?.id || 'Player'}`
            };

            const meRef = {
                rank: myRefRank,
                name: me?.firstName || "You",
                username: me?.username ? `@${me.username}` : "Anonymous",
                amount: `${myReferralCount} Teman`,
                isMe: true,
                avatar: `https://i.pravatar.cc/150?u=${me?.id || 'Player'}`
            };

            return {
                earnings: { top: fakeTopEarnings, me: meEarn },
                referrals: { top: fakeTopReferrals, me: meRef }
            };
        } catch (error: any) {
            console.error(error);
            return { error: error.message, stack: error.stack };
        }
    }

    @Post('me/withdraw')
    @UseGuards(TelegramAuthGuard)
    async requestWithdrawal(@Request() req: any) {
        try {
            const reqId = req.user.id === 'mock-user-123' ? '123' : req.user.id;
            const telegramId = BigInt(reqId);
            const { amount, method, accountInfo } = req.body;

            // Target withdrawal minimum
            const targetWithdrawStr = await this.configService.getConfigValue('APP_MIN_WITHDRAW', '500000');
            const TARGET_WITHDRAWAL = parseInt(targetWithdrawStr) || 500000;
            const requestedAmount = Number(amount);

            if (!requestedAmount || requestedAmount < TARGET_WITHDRAWAL) {
                return new HttpException(`Minimum withdrawal is Rp ${TARGET_WITHDRAWAL.toLocaleString('id-ID')}`, HttpStatus.BAD_REQUEST);
            }

            if (!method || !accountInfo) {
                return new HttpException('Method and Account Info are required', HttpStatus.BAD_REQUEST);
            }

            const result = await this.prisma.$transaction(async (tx) => {
                const user = await tx.user.findUnique({
                    where: { telegramId },
                    include: { wallet: true }
                });

                if (!user || !user.wallet) {
                    throw new Error('User or Wallet not found');
                }

                const currentBalance = Number(user.wallet.balance);
                if (currentBalance < requestedAmount) {
                    throw new Error('Insufficient balance');
                }

                // 1. Deduct balance immediately
                await tx.wallet.update({
                    where: { id: user.wallet.id },
                    data: { balance: { decrement: requestedAmount } }
                });

                // 2. Log mutation
                await tx.walletMutation.create({
                    data: {
                        walletId: user.wallet.id,
                        amount: -requestedAmount,
                        type: 'WITHDRAW',
                        description: `Withdraw request via ${method}`
                    }
                });

                // 3. Create Withdrawal Request
                const withdrawal = await tx.withdrawal.create({
                    data: {
                        userId: user.id,
                        amount: requestedAmount,
                        method: method,
                        accountInfo: JSON.stringify(accountInfo),
                        status: 'PENDING'
                    }
                });

                return withdrawal;
            });

            return {
                success: true,
                withdrawalId: result.id,
                message: 'Withdrawal request submitted successfully'
            };
        } catch (e: any) {
            console.error('[Withdrawal Error]', e);
            throw new HttpException(e.message || 'Failed to process withdrawal', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('me/referrals')
    @UseGuards(TelegramAuthGuard)
    async getMyReferrals(@Request() req: any) {
        try {
            const reqId = req.user.id === 'mock-user-123' ? '123' : req.user.id;
            const telegramId = BigInt(reqId);

            const userWithRefs = await this.prisma.user.findUnique({
                where: { telegramId },
                include: {
                    referrals: {
                        orderBy: { createdAt: 'desc' }
                    }
                }
            });

            if (!userWithRefs) return [];

            const REWARD_IDR = 150000;

            const mapped = userWithRefs.referrals.map(ref => ({
                id: ref.id,
                name: ref.firstName || ref.username || 'Anonymous User',
                isCompleted: ref.isReferralActive,
                reward: ref.isReferralActive ? `+ Rp ${REWARD_IDR.toLocaleString('id-ID')}` : 'Belum Selesai',
                time: ref.createdAt.toISOString()
            }));

            return mapped;
        } catch (error: any) {
            console.error('[Fetch Referrals]', error);
            throw new HttpException('Failed retrieving referrals', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
