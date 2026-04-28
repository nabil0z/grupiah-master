import { Controller, Get, Post, Body, UseGuards, Request, Query, HttpException, HttpStatus } from '@nestjs/common';
import { TelegramAuthGuard } from '../auth/telegram-auth/telegram-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AdminConfigService } from '../admin/config/admin-config.service';

// Boost benefit mapping — derived from multiplierRate, no DB migration needed
const BOOST_BENEFITS: Record<number, {
    minWithdraw: number;
    dailyMultiplier: number;
    refMultiplier: number;
    streakProtection: boolean;
    fastWd: boolean;
}> = {
    2:  { minWithdraw: 500000,  dailyMultiplier: 2,  refMultiplier: 1, streakProtection: false, fastWd: false },
    5:  { minWithdraw: 250000,  dailyMultiplier: 5,  refMultiplier: 2, streakProtection: true,  fastWd: false },
    10: { minWithdraw: 100000,  dailyMultiplier: 10, refMultiplier: 3, streakProtection: true,  fastWd: true },
};

@Controller('users')
export class UsersController {
    private channelVerifyCache = new Map<string, { status: boolean, timestamp: number, channelInfo?: any }>();
    private channelInfoCache: any = null;

    constructor(private prisma: PrismaService, private configService: AdminConfigService) { }

    // Helper: get active boost benefits for a user
    private async getActiveBoostBenefits(userId: string) {
        const boost = await this.prisma.userBoost.findUnique({ where: { userId } });
        if (!boost || new Date(boost.expiresAt) < new Date()) return null;
        const rate = Number(boost.multiplierRate);
        return BOOST_BENEFITS[rate] || null;
    }

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
            const refUplineStr = await this.configService.getConfigValue('APP_REF_UPLINE', '500');
            const refDownlineStr = await this.configService.getConfigValue('APP_REF_DOWNLINE', '250');

            const rewardsStr = await this.configService.getConfigValue('DAILY_LOGIN_REWARDS', '[5000, 10000, 15000, 25000, 35000, 50000, 100000]');
            let dailyRewards: number[] = [5000, 10000, 15000, 25000, 35000, 50000, 100000];
            try { dailyRewards = JSON.parse(rewardsStr); } catch { /* keep defaults */ }

            // Calculate effective min withdraw based on active boost
            const globalMinWithdraw = parseInt(minWithdrawStr) || 500000;
            const boostBenefits = await this.getActiveBoostBenefits(user.id);
            const effectiveMinWithdraw = boostBenefits ? boostBenefits.minWithdraw : globalMinWithdraw;

            return {
                ...responseJson,
                canClaimDaily,
                currentStreak: user.dailyStreak,
                dailyRewards,
                appConfig: {
                    minWithdraw: effectiveMinWithdraw,
                    globalMinWithdraw,
                    refUpline: parseInt(refUplineStr) || 500,
                    refDownline: parseInt(refDownlineStr) || 250,
                    bannerImageUrl: await this.configService.getConfigValue('BANNER_IMAGE_URL', ''),
                    bannerLinkUrl: await this.configService.getConfigValue('BANNER_LINK_URL', ''),
                    boostActive: !!boostBenefits,
                }
            };
        } catch (e: any) {
            console.error(e);
            return { error: e.message, stack: e.stack };
        }
    }

    @Get('me/tasks')
    @UseGuards(TelegramAuthGuard)
    async getMyTasks(@Request() req: any) {
        if (!req.dbUser) return [];
        const userTasks = await this.prisma.userTask.findMany({
            where: { userId: req.dbUser.id },
            include: { task: true },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        return userTasks.map(ut => ({
            id: ut.id,
            taskId: ut.taskId,
            title: ut.task?.title || 'Unknown Task',
            description: ut.task?.description || '',
            provider: ut.task?.provider || 'CUSTOM',
            reward: Number(ut.reward || ut.task?.reward || 0),
            status: ut.status,
            createdAt: ut.createdAt,
        }));
    }

    @Get('me/withdrawals')
    @UseGuards(TelegramAuthGuard)
    async getMyWithdrawals(@Request() req: any) {
        if (!req.dbUser) return [];
        const withdrawals = await this.prisma.withdrawal.findMany({
            where: { userId: req.dbUser.id },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        return withdrawals.map(w => ({
            id: w.id,
            amount: Number(w.amount),
            method: w.method,
            status: w.status,
            createdAt: w.createdAt,
        }));
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
                // Streak protection: Silver/Gold boost users keep their streak if they skip 1 day
                const boostBenefits = await this.getActiveBoostBenefits(user.id);
                if (boostBenefits?.streakProtection) {
                    newStreak += 1; // Protected! Continue streak
                    console.log(`[DailyCheckin] Streak protected for user ${user.id} (boost active)`);
                } else {
                    newStreak = 1; // broken streak
                }
            }
        } else {
            newStreak = 1;
        }

        if (newStreak > 7) newStreak = 1;

        const rewardsStr = await this.configService.getConfigValue('DAILY_LOGIN_REWARDS', '[5000, 10000, 15000, 25000, 35000, 50000, 100000]');
        const rewards = JSON.parse(rewardsStr);
        let rewardFound = rewards[newStreak - 1];

        // Boost daily reward multiplier
        const dailyBoostBenefits = await this.getActiveBoostBenefits(user.id);
        if (dailyBoostBenefits) {
            rewardFound = Math.floor(rewardFound * dailyBoostBenefits.dailyMultiplier);
            console.log(`[DailyCheckin] Boost X${dailyBoostBenefits.dailyMultiplier} applied → reward = ${rewardFound}`);
        }

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
    async verifyChannel(@Request() req: any, @Query('force') force?: string) {
        const userId = req.user.id;

        if (userId === 'mock-user-123') {
            return { joined: true, cached: true, channelInfo: { title: 'Grupiah Official', memberCount: 1200, photoUrl: null } };
        }

        const cacheKey = String(userId);
        const cached = this.channelVerifyCache.get(cacheKey);
        const now = Date.now();

        if (cached && (now - cached.timestamp < 5 * 60 * 1000) && force !== 'true') {
            return { joined: cached.status, cached: true, channelInfo: cached.channelInfo || null };
        }

        try {
            const botToken = process.env.BOT_TOKEN;
            const channelId = process.env.CHANNEL_ID || '@Grupiah_id';

            if (!botToken || botToken === 'mock_telegram_bot_token') {
                this.channelVerifyCache.set(cacheKey, { status: true, timestamp: now });
                return { joined: true, cached: false, warning: "Mock token detected" };
            }

            // Fetch membership status
            const memberUrl = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${channelId}&user_id=${userId}`;
            const memberRes = await fetch(memberUrl);
            const memberData = await memberRes.json();

            let isJoined = false;
            if (memberData.ok) {
                const status = memberData.result.status;
                isJoined = ['member', 'administrator', 'creator'].includes(status);
            }

            // Fetch channel info (cached separately for 30 min to reduce API calls)
            let channelInfo = this.channelInfoCache;
            if (!channelInfo || (now - channelInfo._timestamp > 30 * 60 * 1000)) {
                try {
                    const chatRes = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${channelId}`);
                    const chatData = await chatRes.json();

                    const countRes = await fetch(`https://api.telegram.org/bot${botToken}/getChatMemberCount?chat_id=${channelId}`);
                    const countData = await countRes.json();

                    let photoUrl: string | null = null;
                    if (chatData.ok && chatData.result.photo?.big_file_id) {
                        const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${chatData.result.photo.big_file_id}`);
                        const fileData = await fileRes.json();
                        if (fileData.ok) {
                            photoUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
                        }
                    }

                    channelInfo = {
                        title: chatData.ok ? chatData.result.title : 'Grupiah Official',
                        memberCount: countData.ok ? countData.result : 0,
                        photoUrl,
                        _timestamp: now
                    };
                    this.channelInfoCache = channelInfo;
                } catch (infoErr) {
                    console.error('Failed to fetch channel info:', infoErr);
                    channelInfo = { title: 'Grupiah Official', memberCount: 0, photoUrl: null, _timestamp: now };
                }
            }

            const { _timestamp, ...channelInfoClean } = channelInfo;
            this.channelVerifyCache.set(cacheKey, { status: isJoined, timestamp: now, channelInfo: channelInfoClean });
            return { joined: isJoined, cached: false, channelInfo: channelInfoClean };
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

    @Get('me/boost')
    @UseGuards(TelegramAuthGuard)
    async getActiveBoost(@Request() req: any) {
        try {
            if (!req.dbUser) return null;

            const boost = await this.prisma.userBoost.findUnique({
                where: { userId: req.dbUser.id }
            });

            if (!boost) return null;

            // If expired, clean it up and return null
            if (new Date(boost.expiresAt) < new Date()) {
                await this.prisma.userBoost.delete({ where: { id: boost.id } });
                return null;
            }

            return {
                multiplierRate: Number(boost.multiplierRate),
                expiresAt: boost.expiresAt,
                purchasedStar: boost.purchasedStar,
            };
        } catch (e: any) {
            console.error('[GetBoost Error]', e);
            return null;
        }
    }

    @Post('me/boost')
    @UseGuards(TelegramAuthGuard)
    async buyBoost(@Request() req: any, @Body() body: { multiplierRate: number, purchasedStar: number }) {
        try {
            if (!req.dbUser) {
                throw new HttpException('User not found', HttpStatus.NOT_FOUND);
            }

            const { multiplierRate, purchasedStar } = body;

            // Validate predefined packages only
            const PACKAGES: Record<string, { stars: number, durationHours: number, title: string, description: string }> = {
                '2': { stars: 50, durationHours: 24, title: '🥉 Bronze — Double Cuan X2', description: 'Gandakan pendapatan + turunkan min WD 50% selama 24 jam!' },
                '5': { stars: 200, durationHours: 72, title: '🥈 Silver — Mega Cuan X5', description: '5X pendapatan + streak protection + referral X2 selama 3 hari!' },
                '10': { stars: 500, durationHours: 168, title: '🥇 Gold — Sultan Mode X10', description: '10X pendapatan + min WD Rp 100rb + fast WD + semua benefit selama 7 hari!' },
            };

            const pkg = PACKAGES[String(multiplierRate)];
            if (!pkg || pkg.stars !== purchasedStar) {
                throw new HttpException('Paket boost tidak valid.', HttpStatus.BAD_REQUEST);
            }

            // Create invoice link via Telegram Bot API
            const botToken = process.env.BOT_TOKEN;
            if (!botToken || botToken === 'mock_telegram_bot_token') {
                throw new HttpException('Bot token not configured', HttpStatus.INTERNAL_SERVER_ERROR);
            }

            // Payload to identify the purchase when payment succeeds
            const payload = JSON.stringify({
                userId: req.dbUser.id,
                multiplierRate,
                purchasedStar,
                durationHours: pkg.durationHours,
            });

            const invoiceResponse = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: pkg.title,
                    description: pkg.description,
                    payload,
                    currency: 'XTR', // Telegram Stars currency
                    prices: [{ label: pkg.title, amount: pkg.stars }],
                }),
            });

            const invoiceData = await invoiceResponse.json() as any;

            if (!invoiceData.ok) {
                console.error('[CreateInvoice Error]', invoiceData);
                throw new HttpException('Gagal membuat invoice Stars. Coba lagi.', HttpStatus.INTERNAL_SERVER_ERROR);
            }

            return {
                invoiceUrl: invoiceData.result,
            };
        } catch (e: any) {
            console.error('[BuyBoost Error]', e);
            if (e instanceof HttpException) throw e;
            throw new HttpException(e.message || 'Gagal membeli boost', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('me/lookup-account')
    @UseGuards(TelegramAuthGuard)
    async lookupAccount(@Request() req: any, @Body() body: { method: string, accountNumber: string }) {
        try {
            const { method, accountNumber } = body;

            if (!method || !accountNumber) {
                throw new HttpException('Method dan nomor rekening wajib diisi', HttpStatus.BAD_REQUEST);
            }

            // E-wallet (DANA/OVO/GOPAY) tidak didukung oleh api.co.id — hanya bank
            const E_WALLETS = ['DANA', 'GOPAY', 'OVO'];
            if (E_WALLETS.includes(method)) {
                return { success: false, isEwallet: true, message: 'Verifikasi otomatis tidak tersedia untuk e-wallet. Silakan masukkan nama manual.' };
            }

            // Map frontend method to api.co.id bank_code (full format sesuai API)
            const BANK_CODE_MAP: Record<string, string> = {
                'BANK_BCA': 'bank_bca',
                'BANK_MANDIRI': 'bank_mandiri',
                'BANK_BRI': 'bank_bri',
            };

            const bankCode = BANK_CODE_MAP[method];
            if (!bankCode) {
                throw new HttpException('Metode pembayaran tidak didukung untuk lookup', HttpStatus.BAD_REQUEST);
            }

            const apiKey = process.env.API_CO_ID_KEY;
            if (!apiKey) {
                throw new HttpException('Layanan verifikasi rekening belum dikonfigurasi', HttpStatus.SERVICE_UNAVAILABLE);
            }

            // Call api.co.id validation endpoint (GET with query params)
            // Base URL: https://use.api.co.id | Endpoint: /validation/bank
            const queryParams = new URLSearchParams({
                bank_code: bankCode,
                account_number: accountNumber,
                account_name: 'x', // dummy name — API still returns real masked name
            });

            const response = await fetch(`https://use.api.co.id/validation/bank?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'x-api-co-id': apiKey,
                },
            });

            // Guard: ensure response is JSON (api.co.id may return HTML on error/auth failure)
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                console.error('[LookupAccount] Non-JSON response from api.co.id:', response.status, contentType);
                return { success: false, message: 'Layanan verifikasi sedang gangguan. Coba lagi nanti.' };
            }

            const result = await response.json() as any;

            if (!result.is_success || !result.data) {
                return { success: false, message: result.message || 'Gagal memverifikasi rekening' };
            }

            if (!result.data.name) {
                return { success: false, message: 'Nomor rekening tidak ditemukan atau tidak valid' };
            }

            return {
                success: true,
                name: result.data.name,
                bankCode,
            };
        } catch (e: any) {
            console.error('[LookupAccount Error]', e);
            if (e instanceof HttpException) throw e;
            throw new HttpException(e.message || 'Gagal memverifikasi rekening', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('me/withdraw')
    @UseGuards(TelegramAuthGuard)
    async requestWithdrawal(@Request() req: any) {
        try {
            const reqId = req.user.id === 'mock-user-123' ? '123' : req.user.id;
            const telegramId = BigInt(reqId);
            const { amount, method, accountInfo } = req.body;

            // Target withdrawal minimum — check for boost override
            const targetWithdrawStr = await this.configService.getConfigValue('APP_MIN_WITHDRAW', '500000');
            let TARGET_WITHDRAWAL = parseInt(targetWithdrawStr) || 500000;
            const requestedAmount = Number(amount);

            // Check if user has an active boost that lowers min WD
            const user_pre = await this.prisma.user.findUnique({ where: { telegramId } });
            if (user_pre) {
                const boostBenefits = await this.getActiveBoostBenefits(user_pre.id);
                if (boostBenefits) {
                    TARGET_WITHDRAWAL = boostBenefits.minWithdraw;
                    console.log(`[Withdraw] Boost override: min WD = Rp ${TARGET_WITHDRAWAL} for user ${user_pre.id}`);
                }
            }

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
                        status: 'PENDING',
                        isFake: user.isMarketingAcc
                    }
                });

                return { withdrawal, user };
            });

            // WD Mode Hierarchy: creator's wdMode > admin's global WD_MODE
            let wdMode = await this.configService.getConfigValue('WD_MODE', 'MANUAL');
            if (result.user.isMarketingAcc && (result.user as any).wdMode) {
                wdMode = (result.user as any).wdMode;
            }

            if (wdMode === 'AUTO') {
                const delayStr = await this.configService.getConfigValue('WD_AUTO_DELAY_MINUTES', '5');
                const delayMin = parseInt(delayStr) || 5;
                const autoApproveAt = new Date(Date.now() + delayMin * 60 * 1000);

                // Set autoApproveAt — cron job in withdrawal-cron.service.ts will pick it up
                await this.prisma.withdrawal.update({
                    where: { id: result.withdrawal.id },
                    data: { autoApproveAt }
                });
            }

            return {
                success: true,
                withdrawalId: result.withdrawal.id,
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

            // Read upline bonus config to show actual amount
            const refUplineStr = await this.configService.getConfigValue('APP_REF_UPLINE', '500');
            const refUplineBonus = parseInt(refUplineStr) || 500;

            const mapped = userWithRefs.referrals.map(ref => {
                const fullName = [ref.firstName, ref.lastName].filter(Boolean).join(' ') || 'Anonymous User';
                return {
                    id: ref.id,
                    name: fullName,
                    username: ref.username || null,
                    isCompleted: ref.isReferralActive,
                    reward: ref.isReferralActive ? `+Rp ${refUplineBonus.toLocaleString('id-ID')}` : 'Menunggu',
                    time: ref.createdAt.toISOString()
                };
            });

            return mapped;
        } catch (error: any) {
            console.error('[Fetch Referrals]', error);
            throw new HttpException('Failed retrieving referrals', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ========== Creator Program (User-facing) ==========

    @Get('creator-status')
    @UseGuards(TelegramAuthGuard)
    async getCreatorStatus(@Request() req: any) {
        const reqId = req.user.id === 'mock-user-123' ? '123' : req.user.id;
        const telegramId = BigInt(reqId);
        const user = await this.prisma.user.findUnique({
            where: { telegramId },
            select: {
                id: true, creatorStatus: true, creatorChannels: true,
                isMarketingAcc: true, wdMode: true, marketingDelaySeconds: true,
                referralCode: true, createdAt: true,
                _count: { select: { userTasks: { where: { status: 'APPROVED' } } } }
            }
        });
        if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

        // Check eligibility
        const minDaysStr = await this.configService.getConfigValue('CREATOR_MIN_DAYS', '14');
        const minTasksStr = await this.configService.getConfigValue('CREATOR_MIN_TASKS', '5');
        const minDays = isNaN(parseInt(minDaysStr)) ? 14 : parseInt(minDaysStr);
        const minTasks = isNaN(parseInt(minTasksStr)) ? 5 : parseInt(minTasksStr);

        const accountAgeDays = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        const completedTasks = (user as any)._count?.userTasks || 0;

        return {
            creatorStatus: user.creatorStatus,
            creatorChannels: user.creatorChannels ? JSON.parse(user.creatorChannels) : [],
            isMarketingAcc: user.isMarketingAcc,
            wdMode: user.wdMode,
            marketingDelaySeconds: user.marketingDelaySeconds,
            referralCode: user.referralCode,
            eligible: accountAgeDays >= minDays && completedTasks >= minTasks,
            eligibility: {
                minDays, minTasks,
                currentDays: accountAgeDays,
                currentTasks: completedTasks
            }
        };
    }

    @Post('apply-creator')
    @UseGuards(TelegramAuthGuard)
    async applyCreator(@Request() req: any, @Body() body: { channels: { platform: string, channel: string }[] }) {
        const reqId = req.user.id === 'mock-user-123' ? '123' : req.user.id;
        const telegramId = BigInt(reqId);
        const user = await this.prisma.user.findUnique({ where: { telegramId } });
        if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

        if (user.creatorStatus === 'PENDING' || user.creatorStatus === 'APPROVED') {
            throw new HttpException('Already applied or approved', HttpStatus.BAD_REQUEST);
        }

        // Check eligibility
        const minDaysStr = await this.configService.getConfigValue('CREATOR_MIN_DAYS', '14');
        const minTasksStr = await this.configService.getConfigValue('CREATOR_MIN_TASKS', '5');
        const minDays = isNaN(parseInt(minDaysStr)) ? 14 : parseInt(minDaysStr);
        const minTasks = isNaN(parseInt(minTasksStr)) ? 5 : parseInt(minTasksStr);

        const accountAgeDays = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        const completedTasks = await this.prisma.userTask.count({
            where: { userId: user.id, status: 'APPROVED' }
        });

        if (accountAgeDays < minDays || completedTasks < minTasks) {
            throw new HttpException(`Belum memenuhi syarat: min ${minDays} hari & ${minTasks} tugas`, HttpStatus.FORBIDDEN);
        }

        if (!body.channels || body.channels.length === 0) {
            throw new HttpException('Minimal 1 channel harus diisi', HttpStatus.BAD_REQUEST);
        }

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                creatorStatus: 'PENDING',
                creatorChannels: JSON.stringify(body.channels)
            }
        });

        return { success: true, message: 'Lamaran terkirim! Tunggu persetujuan admin.' };
    }

    @Post('creator-settings')
    @UseGuards(TelegramAuthGuard)
    async updateCreatorSettings(@Request() req: any, @Body() body: { wdMode?: string, marketingDelaySeconds?: number }) {
        const reqId = req.user.id === 'mock-user-123' ? '123' : req.user.id;
        const telegramId = BigInt(reqId);
        const user = await this.prisma.user.findUnique({ where: { telegramId } });
        if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        if (user.creatorStatus !== 'APPROVED') {
            throw new HttpException('Not a creator', HttpStatus.FORBIDDEN);
        }

        const updateData: any = {};
        if (body.wdMode === 'AUTO' || body.wdMode === 'MANUAL') updateData.wdMode = body.wdMode;
        if (body.marketingDelaySeconds && body.marketingDelaySeconds >= 5 && body.marketingDelaySeconds <= 600) {
            updateData.marketingDelaySeconds = body.marketingDelaySeconds;
        }

        await this.prisma.user.update({ where: { id: user.id }, data: updateData });
        return { success: true };
    }

    @Post('inject-demo')
    @UseGuards(TelegramAuthGuard)
    async injectDemo(@Request() req: any) {
        const reqId = req.user.id === 'mock-user-123' ? '123' : req.user.id;
        const telegramId = BigInt(reqId);
        const user = await this.prisma.user.findUnique({ where: { telegramId }, include: { wallet: true } });
        if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        if (!user.isMarketingAcc) throw new HttpException('Not in creator mode', HttpStatus.FORBIDDEN);

        // Inject demo balance
        if (user.wallet) {
            await this.prisma.wallet.update({
                where: { id: user.wallet.id },
                data: { balance: { increment: 500000 } }
            });
            await this.prisma.walletMutation.create({
                data: {
                    walletId: user.wallet.id, amount: 500000,
                    type: 'EARN', description: '[Marketing] Demo Balance Injection'
                }
            });
        }

        // Inject fake referrals, tasks, withdrawals (reuse existing admin patterns)
        const fakeNames = ['Andi', 'Budi', 'Cika', 'Dewi', 'Eka'];
        for (const name of fakeNames) {
            await this.prisma.user.create({
                data: {
                    telegramId: BigInt(Math.floor(Math.random() * 9000000000) + 1000000000),
                    username: name.toLowerCase() + Math.floor(Math.random() * 100),
                    firstName: name,
                    referralCode: `ref_FAKE_${Math.random().toString(36).substring(2, 8)}`,
                    referredById: user.id,
                    isFake: true,
                    isReferralActive: true,
                    wallet: { create: { balance: 0 } }
                }
            });
        }

        // Fake WD history
        const methods = ['DANA', 'GOPAY', 'OVO'];
        for (let i = 0; i < 3; i++) {
            await this.prisma.withdrawal.create({
                data: {
                    userId: user.id,
                    amount: [50000, 100000, 200000][i],
                    method: methods[i] as any,
                    accountInfo: JSON.stringify({ number: '0812****' + (1000 + i) }),
                    status: 'PAID',
                    isFake: true
                }
            });
        }

        return { success: true, message: 'Demo data injected! Saldo +Rp 500.000, 5 referral, 3 WD history' };
    }

    @Post('reset-demo')
    @UseGuards(TelegramAuthGuard)
    async resetDemo(@Request() req: any) {
        const reqId = req.user.id === 'mock-user-123' ? '123' : req.user.id;
        const telegramId = BigInt(reqId);
        const user = await this.prisma.user.findUnique({ where: { telegramId }, include: { wallet: true } });
        if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        if (!user.isMarketingAcc) throw new HttpException('Not in creator mode', HttpStatus.FORBIDDEN);

        await this.prisma.$transaction(async (tx) => {
            // Reset balance
            if (user.wallet) {
                await tx.wallet.update({ where: { id: user.wallet.id }, data: { balance: 0 } });
                await tx.walletMutation.deleteMany({
                    where: { walletId: user.wallet.id, description: { contains: '[Marketing]' } }
                });
            }
            // Delete fake data
            await tx.userTask.deleteMany({ where: { isFake: true, userId: user.id } });
            await tx.withdrawal.deleteMany({ where: { isFake: true, userId: user.id } });
            await tx.user.deleteMany({ where: { isFake: true, referredById: user.id } });
        });

        return { success: true, message: 'Demo data berhasil dihapus. Saldo direset ke Rp 0.' };
    }
}
