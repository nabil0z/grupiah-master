import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) { }
    async approveWithdrawalByPartner(withdrawalId: string, adminTelegramId: number) {
        // 1. Prisma Query: update Withdrawal status to 'PAID'
        const updated = await this.prisma.withdrawal.update({
            where: { id: withdrawalId },
            data: { status: 'PAID', processedBy: adminTelegramId.toString() }
        });

        // 2. Insert into AuditLog table (ActorType: 'ADMIN')
        await this.prisma.auditLog.create({
            data: {
                actorId: adminTelegramId.toString(),
                actorType: 'ADMIN',
                action: 'WITHDRAWAL_APPROVED',
                entityType: 'Withdrawal',
                entityId: withdrawalId,
                changes: JSON.stringify({ previous: 'PENDING', new: 'PAID' })
            }
        });

        // 3. (Future) Trigger Xendit/Flip Disbursement API

        return {
            status: 'success',
            message: `Withdrawal ${withdrawalId} approved by Admin ${adminTelegramId}`,
            data: updated
        };
    }

    async rejectWithdrawalByPartner(withdrawalId: string, adminTelegramId: number) {
        return await this.prisma.$transaction(async (tx) => {
            const withdrawal = await tx.withdrawal.findUnique({
                where: { id: withdrawalId },
                include: { user: { include: { wallet: true } } }
            });

            if (!withdrawal || withdrawal.status !== 'PENDING') {
                throw new Error('Withdrawal not found or not PENDING');
            }

            // 1. Update status to REJECTED
            const updated = await tx.withdrawal.update({
                where: { id: withdrawalId },
                data: { status: 'REJECTED', processedBy: adminTelegramId.toString() }
            });

            // 2. Refund User Wallet Balance
            const walletId = withdrawal.user.wallet?.id;
            if (walletId) {
                await tx.wallet.update({
                    where: { id: walletId },
                    data: { balance: { increment: withdrawal.amount } }
                });

                // 3. Log Refund Mutation
                await tx.walletMutation.create({
                    data: {
                        walletId: walletId,
                        amount: withdrawal.amount,
                        type: 'ADMIN_ADJUSTMENT',
                        description: `Refund for Rejected Withdrawal ${withdrawalId}`
                    }
                });
            }

            // 4. Audit Log
            await tx.auditLog.create({
                data: {
                    actorId: adminTelegramId.toString(),
                    actorType: 'ADMIN',
                    action: 'WITHDRAWAL_REJECTED',
                    entityType: 'Withdrawal',
                    entityId: withdrawalId,
                    changes: JSON.stringify({ reason: 'Admin Rejected and Refunded' })
                }
            });

            return {
                status: 'success',
                message: `Withdrawal ${withdrawalId} REJECTED by Admin. Balance refunded.`,
                data: updated
            };
        });
    }

    async generateFakeFeed(amount: number, method: string) {
        const masks = ['budi_***', 'indah***', '0812****901', 'raja****', 'agung_**', 'dian***'];
        const randomMask = masks[Math.floor(Math.random() * masks.length)];

        // Prisma Query: insert FakeWithdrawHistory 
        const fakeRecord = await this.prisma.fakeWithdrawHistory.create({
            data: {
                maskedUsername: randomMask,
                amount,
                method
            }
        });

        return {
            success: true,
            fakeRecord
        };
    }

    async getPendingList() {
        return this.prisma.withdrawal.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { firstName: true, telegramId: true } } } // Include minimal user data for admin review
        });
    }

    async getUsersList() {
        const users = await this.prisma.user.findMany({
            where: { isFake: false },
            orderBy: { createdAt: 'desc' },
            include: {
                wallet: { select: { balance: true } },
                _count: { select: { referrals: { where: { isFake: true } } } }
            }
        });
        return users.map(u => ({
            ...u,
            fakeReferralCount: (u as any)._count?.referrals || 0,
            _count: undefined
        }));
    }

    async toggleUserBan(userId: string, adminTelegramId: number) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        const newBanStatus = !user.isBanned;

        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: { isBanned: newBanStatus }
        });

        await this.prisma.auditLog.create({
            data: {
                actorId: adminTelegramId.toString(),
                actorType: 'ADMIN',
                action: newBanStatus ? 'USER_BANNED' : 'USER_UNBANNED',
                entityType: 'User',
                entityId: userId,
                changes: JSON.stringify({ isBanned: newBanStatus })
            }
        });

        return updated;
    }

    async getPendingCustomTasks() {
        return this.prisma.userTask.findMany({
            where: {
                status: 'PENDING',
                task: { type: 'MANUAL' }
            },
            include: {
                user: { select: { username: true, telegramId: true } },
                task: { select: { title: true, reward: true } }
            },
            orderBy: { createdAt: 'asc' }
        });
    }

    async reviewCustomTask(userTaskId: string, action: 'APPROVE' | 'REJECT', adminTelegramId: number) {
        return await this.prisma.$transaction(async (tx) => {
            const userTask = await tx.userTask.findUnique({
                where: { id: userTaskId },
                include: { task: true, user: { include: { wallet: true } } }
            });

            if (!userTask || userTask.status !== 'PENDING') {
                throw new Error('UserTask not found or not PENDING');
            }

            // 1. Update Status
            const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
            const updated = await tx.userTask.update({
                where: { id: userTaskId },
                data: { status: newStatus as any }
            });

            // 2. Give Reward if Approved
            if (action === 'APPROVE') {
                const rewardAmount = userTask.reward || userTask.task.reward;
                const walletId = userTask.user.wallet?.id;

                if (walletId) {
                    await tx.wallet.update({
                        where: { id: walletId },
                        data: { balance: { increment: rewardAmount } }
                    });

                    await tx.walletMutation.create({
                        data: {
                            walletId: walletId,
                            amount: rewardAmount,
                            type: 'EARN',
                            description: `Approved Manual Task: ${userTask.task.title}`
                        }
                    });
                }

                // Record completion for Analytics
                await tx.offerScore.upsert({
                    where: { provider_externalId: { provider: 'CUSTOM', externalId: userTask.taskId } },
                    update: { completions: { increment: 1 } },
                    create: {
                        provider: 'CUSTOM',
                        externalId: userTask.taskId,
                        clicks: 1, // Assume at least 1 click if they submitted it
                        completions: 1
                    }
                });
            }

            // 3. Audit Log
            await tx.auditLog.create({
                data: {
                    actorId: adminTelegramId.toString(),
                    actorType: 'ADMIN',
                    action: action === 'APPROVE' ? 'MANUAL_TASK_APPROVED' : 'MANUAL_TASK_REJECTED',
                    entityType: 'UserTask',
                    entityId: userTaskId,
                    changes: JSON.stringify({ previous: 'PENDING', new: newStatus })
                }
            });

            return {
                status: 'success',
                message: `UserTask ${userTaskId} ${newStatus}`,
                data: updated
            };
        });
    }

    async createCustomTask(title: string, description: string, reward: number, instructions: string | undefined, logoUrl: string | undefined, link: string | undefined, adminTelegramId: number) {
        const newTask = await this.prisma.task.create({
            data: {
                provider: 'CUSTOM',
                title,
                description,
                instructions,
                logoUrl,
                link,
                reward,
                type: 'MANUAL',
                isActive: true
            }
        });

        await this.prisma.auditLog.create({
            data: {
                actorId: adminTelegramId.toString(),
                actorType: 'ADMIN',
                action: 'MANUAL_TASK_CREATED',
                entityType: 'Task',
                entityId: newTask.id,
                changes: JSON.stringify({ title, reward })
            }
        });

        return newTask;
    }

    async getDashboardStats() {
        const now = new Date();
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
        const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);

        // Online users (real — users who logged in within last 15 min)
        const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);
        const onlineUsers = await this.prisma.user.count({
            where: { isFake: false, lastLogin: { gte: fifteenMinAgo } }
        });

        // Total users
        const totalUsers = await this.prisma.user.count({ where: { isFake: false } });

        // Pending withdrawals
        const pendingWdList = await this.prisma.withdrawal.findMany({
            where: { status: 'PENDING', isFake: false },
            include: { user: { select: { username: true, firstName: true, telegramId: true } } },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        const pendingWdTotal = pendingWdList.reduce((sum, w) => sum + Number(w.amount), 0);

        // Tasks completed today vs yesterday
        const tasksToday = await this.prisma.userTask.count({
            where: { status: 'APPROVED', isFake: false, updatedAt: { gte: todayStart } }
        });
        const tasksYesterday = await this.prisma.userTask.count({
            where: { status: 'APPROVED', isFake: false, updatedAt: { gte: yesterdayStart, lt: todayStart } }
        });

        // Pending custom tasks for review
        const pendingTasks = await this.getPendingCustomTasks();

        // Profit per provider — count completions in OfferCompletion to get raw USD revenue
        const earningsToday = await this.prisma.offerCompletion.findMany({
            where: { createdAt: { gte: todayStart } }
        });
        const earningsYesterday = await this.prisma.offerCompletion.findMany({
            where: { createdAt: { gte: yesterdayStart, lt: todayStart } }
        });

        const calcProviderProfit = (completions: any[]) => {
            let ogads = 0, adblue = 0, cpagrip = 0, other = 0;
            for (const c of completions) {
                const provider = (c.provider || '').toLowerCase();
                const amount = Math.abs(Number(c.revenue || 0));

                if (provider.includes('ogads')) ogads += amount;
                else if (provider.includes('adbluemedia')) adblue += amount;
                else if (provider.includes('cpagrip')) cpagrip += amount;
                else other += amount;
            }
            return { ogads, adblue, cpagrip, other, total: ogads + adblue + cpagrip + other };
        };

        const profitToday = calcProviderProfit(earningsToday);
        const profitYesterday = calcProviderProfit(earningsYesterday);

        // Provider stats (clicks/completions)
        const providerStats = await this.prisma.offerScore.groupBy({
            by: ['provider'],
            _sum: { clicks: true, completions: true }
        });

        // EPC Optimizer data
        const allScores = await this.prisma.offerScore.findMany();
        const deadOfferCount = allScores.filter(s => s.clicks >= 50 && s.completions === 0).length;
        const topByConversion = allScores
            .filter(s => s.clicks >= 10)
            .map(s => ({
                provider: s.provider,
                externalId: s.externalId,
                clicks: s.clicks,
                completions: s.completions,
                cr: s.clicks > 0 ? +(s.completions / s.clicks * 100).toFixed(1) : 0
            }))
            .sort((a, b) => b.cr - a.cr)
            .slice(0, 10);

        // Recent postbacks (last 20 EARN mutations for live feed)
        const recentPostbacks = (await this.prisma.walletMutation.findMany({
            where: { type: 'EARN' },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: { id: true, amount: true, description: true, createdAt: true }
        })).map(p => ({
            id: p.id,
            amount: Number(p.amount),
            description: p.description,
            createdAt: p.createdAt,
            provider: (p.description || '').toLowerCase().includes('ogads') ? 'OGAds'
                : (p.description || '').toLowerCase().includes('adblue') ? 'AdBlue'
                    : (p.description || '').toLowerCase().includes('cpagrip') ? 'CPAGrip'
                        : 'Other'
        }));

        return {
            onlineUsers,
            totalUsers,
            pendingWithdrawals: { count: pendingWdList.length, total: pendingWdTotal, list: pendingWdList },
            tasks: { today: tasksToday, yesterday: tasksYesterday },
            pendingTasks,
            profit: { today: profitToday, yesterday: profitYesterday },
            providerStats,
            deadOfferCount,
            totalOffersTracked: allScores.length,
            topByConversion,
            recentPostbacks,
        };
    }

    async getAnalytics() {
        const livePostbacksRaw = await this.prisma.walletMutation.findMany({
            where: { type: 'EARN' },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { wallet: { include: { user: { select: { username: true, telegramId: true } } } } }
        });

        // Convert BigInt telegramId to string to prevent JSON serialization crash
        const livePostbacks = livePostbacksRaw.map(p => ({
            ...p,
            wallet: p.wallet ? {
                ...p.wallet,
                user: p.wallet.user ? {
                    ...p.wallet.user,
                    telegramId: p.wallet.user.telegramId?.toString() || null
                } : null
            } : null
        }));

        const topOffers = await this.prisma.offerScore.findMany({
            orderBy: { completions: 'desc' },
            take: 10
        });

        // EPC Optimizer analytics
        const allScores = await this.prisma.offerScore.findMany();
        const deadOfferCount = allScores.filter(s => s.clicks >= 50 && s.completions === 0).length;
        const topByConversion = allScores
            .filter(s => s.clicks >= 10)
            .map(s => ({
                provider: s.provider,
                externalId: s.externalId,
                clicks: s.clicks,
                completions: s.completions,
                cr: s.clicks > 0 ? +(s.completions / s.clicks * 100).toFixed(1) : 0
            }))
            .sort((a, b) => b.cr - a.cr)
            .slice(0, 10);

        // Calculate a rough completion rate per provider
        const providerStats = await this.prisma.offerScore.groupBy({
            by: ['provider'],
            _sum: { clicks: true, completions: true }
        });

        // Aggregate metrics for the God Eye dashboard
        const totalBalanceResult = await this.prisma.wallet.aggregate({
            _sum: { balance: true }
        });
        const totalFictionalBalance = totalBalanceResult._sum.balance || 0;

        const totalUsers = await this.prisma.user.count({ where: { isFake: false } });

        const pendingPayoutsResult = await this.prisma.withdrawal.aggregate({
            where: { status: 'PENDING', isFake: false },
            _sum: { amount: true }
        });
        const pendingPayouts = pendingPayoutsResult._sum.amount || 0;

        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);
        const tasksCompletedToday = await this.prisma.userTask.count({
            where: {
                status: 'APPROVED',
                isFake: false,
                updatedAt: { gte: yesterday }
            }
        });

        return {
            livePostbacks,
            topOffers,
            topByConversion,
            deadOfferCount,
            totalOffersTracked: allScores.length,
            providerStats,
            totalFictionalBalance,
            totalUsers,
            pendingPayouts,
            tasksCompletedToday
        };
    }

    async getCustomTasks() {
        return this.prisma.task.findMany({
            where: { provider: 'CUSTOM', type: 'MANUAL', isFake: false },
            orderBy: { createdAt: 'desc' }
        });
    }

    async updateCustomTask(taskId: string, updateData: any, adminTelegramId: number) {
        const updated = await this.prisma.task.update({
            where: { id: taskId, provider: 'CUSTOM', type: 'MANUAL' },
            data: updateData
        });

        await this.prisma.auditLog.create({
            data: {
                actorId: adminTelegramId.toString(),
                actorType: 'ADMIN',
                action: 'MANUAL_TASK_UPDATED',
                entityType: 'Task',
                entityId: taskId,
                changes: JSON.stringify(updateData)
            }
        });

        return updated;
    }

    async deleteCustomTask(taskId: string, adminTelegramId: number) {
        // First delete any related UserTask records to prevent foreign key errors
        await this.prisma.userTask.deleteMany({
            where: { taskId }
        });

        // Then delete the task itself
        const deleted = await this.prisma.task.delete({
            where: { id: taskId, provider: 'CUSTOM', type: 'MANUAL' }
        });

        await this.prisma.auditLog.create({
            data: {
                actorId: adminTelegramId.toString(),
                actorType: 'ADMIN',
                action: 'MANUAL_TASK_DELETED',
                entityType: 'Task',
                entityId: taskId,
                changes: JSON.stringify({ deletedTitle: deleted.title })
            }
        });

        return deleted;
    }
    async getConfig(key: string) {
        const config = await this.prisma.platformConfig.findUnique({ where: { key } });
        return config?.value || '';
    }

    async setConfig(key: string, value: string, adminId: number) {
        return this.prisma.platformConfig.upsert({
            where: { key },
            update: { value, updatedBy: adminId.toString() },
            create: { key, value, updatedBy: adminId.toString() }
        });
    }

    async getAllConfigs() {
        const configs = await this.prisma.platformConfig.findMany();
        const result: Record<string, string> = {};
        configs.forEach(c => result[c.key] = c.value);
        return result;
    }

    async setConfigs(configs: Record<string, string>, adminId: number) {
        const updates = Object.entries(configs).map(([key, value]) => {
            return this.prisma.platformConfig.upsert({
                where: { key },
                update: { value: value.toString(), updatedBy: adminId.toString() },
                create: { key, value: value.toString(), updatedBy: adminId.toString() }
            });
        });
        await this.prisma.$transaction(updates);
        return { success: true };
    }


    async getOnlineUserCount() {
        const date = new Date();
        const hour = date.getHours();
        const day = date.getDay(); // 0 is Sunday, 6 is Saturday

        // Base online count
        let baseCount = 8000;

        // Apply a sine wave to simulate daily peaks & valleys
        // Peak at 20:00 (8 PM, highest at +1), lowest at 08:00 (8 AM, lowest at -1)
        const timeFactor = Math.sin((hour - 14) * Math.PI / 12);

        // Multipliers depending on the day of the week
        // Weekends typically have more traffic
        const dayMultipliers = [1.5, 1.0, 1.0, 1.1, 1.1, 1.3, 1.4];
        const dayMultiplier = dayMultipliers[day];

        // Combine base, time sine wave, and day multiplier
        const simulatedCount = Math.floor((baseCount + (timeFactor * 4000)) * dayMultiplier);

        // Add 5% random noise
        const randomNoise = Math.floor(simulatedCount * 0.05 * (Math.random() - 0.5));

        return Math.max(100, simulatedCount + randomNoise);
    }

    // ========== Marketing Mode Tools ==========

    async toggleMarketingFlag(userId: string, adminTelegramId: number) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        const newFlag = !user.isMarketingAcc;

        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: { isMarketingAcc: newFlag }
        });

        await this.prisma.auditLog.create({
            data: {
                actorId: adminTelegramId.toString(),
                actorType: 'ADMIN',
                action: newFlag ? 'MARKETING_MODE_ENABLED' : 'MARKETING_MODE_DISABLED',
                entityType: 'User',
                entityId: userId,
                changes: JSON.stringify({ isMarketingAcc: newFlag })
            }
        });

        return { success: true, isMarketingAcc: newFlag, userId };
    }

    async adjustBalance(userId: string, amount: number, description: string, adminTelegramId: number) {
        return await this.prisma.$transaction(async (tx) => {
            const wallet = await tx.wallet.findUnique({ where: { userId } });
            if (!wallet) throw new Error('Wallet not found for user');

            const updatedWallet = await tx.wallet.update({
                where: { userId },
                data: { balance: { increment: amount } }
            });

            await tx.walletMutation.create({
                data: {
                    walletId: wallet.id,
                    amount: amount,
                    type: 'ADMIN_ADJUSTMENT',
                    description: description || `Admin Balance Adjustment: ${amount > 0 ? '+' : ''}${amount}`
                }
            });

            await tx.auditLog.create({
                data: {
                    actorId: adminTelegramId.toString(),
                    actorType: 'ADMIN',
                    action: 'BALANCE_ADJUSTED',
                    entityType: 'Wallet',
                    entityId: wallet.id,
                    changes: JSON.stringify({ userId, amount, description, newBalance: updatedWallet.balance })
                }
            });

            return { success: true, userId, newBalance: updatedWallet.balance };
        });
    }

    async injectFakeStats(userId: string, tasksCount: number, withdrawalsCount: number, referralsCount: number, adminTelegramId: number) {
        return await this.prisma.$transaction(async (tx) => {
            // 1. Inject fake completed tasks
            const names = ['Install App & Play', 'Survey Completion', 'Register Promo', 'Download & Run', 'Watch Video Ad', 'Complete Quiz', 'Join Community', 'Rate App 5 Stars'];
            for (let i = 0; i < tasksCount; i++) {
                const randomTitle = names[Math.floor(Math.random() * names.length)];
                const randomReward = Math.floor(Math.random() * 40000 + 10000); // 10k - 50k

                // Create task record
                const task = await tx.task.create({
                    data: {
                        provider: 'CUSTOM',
                        title: randomTitle,
                        description: `Simulated marketing task #${i + 1}`,
                        reward: randomReward,
                        type: 'AUTO',
                        isActive: false,
                        isFake: true // ← Marketing flag
                    }
                });

                await tx.userTask.create({
                    data: {
                        userId,
                        taskId: task.id,
                        status: 'APPROVED',
                        reward: randomReward,
                        isFake: true // ← Marketing flag
                    }
                });
            }

            // 2. Inject fake withdrawal history
            const methods = ['DANA', 'GOPAY', 'OVO', 'BANK_TRANSFER'] as const;
            for (let i = 0; i < withdrawalsCount; i++) {
                const fakeAmount = Math.floor(Math.random() * 900000 + 100000); // 100k - 1M
                const method = methods[Math.floor(Math.random() * methods.length)];

                await tx.withdrawal.create({
                    data: {
                        userId,
                        amount: fakeAmount,
                        method: method,
                        accountInfo: JSON.stringify({ name: 'Marketing Sim', number: '08XX****XXXX' }),
                        status: 'PAID',
                        isFake: true // ← Marketing flag
                    }
                });
            }

            // 3. Inject fake referral users with realistic names
            const firstNames = ['Adi', 'Budi', 'Cahya', 'Dian', 'Eka', 'Fajar', 'Gita', 'Hana', 'Indra', 'Joko', 'Karina', 'Lina', 'Maya', 'Nadia', 'Omar', 'Putri', 'Rina', 'Sari', 'Tari', 'Umar', 'Vina', 'Wati', 'Yuni', 'Zahra', 'Rizki', 'Ayu', 'Dewi', 'Fitri', 'Gilang', 'Hendra', 'Ika', 'Jaya', 'Kurnia', 'Laras', 'Melani', 'Nur', 'Okta', 'Reza', 'Sinta', 'Tio'];
            const lastNames = ['Pratama', 'Saputra', 'Wijaya', 'Kusuma', 'Hidayat', 'Rahmawati', 'Setiawan', 'Putra', 'Lestari', 'Handoko', 'Susanto', 'Wibowo', 'Hartono', 'Suryadi', 'Permana', 'Anggraini', 'Utami', 'Purnama', 'Nugraha', 'Wahyudi'];

            for (let i = 0; i < referralsCount; i++) {
                const fakeTelegramId = BigInt(Math.floor(Math.random() * 9000000000 + 1000000000));
                const fakeRefCode = `MKT${Date.now()}${i}`;
                const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
                const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
                const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 99)}`;

                await tx.user.create({
                    data: {
                        telegramId: fakeTelegramId,
                        referralCode: fakeRefCode,
                        referredById: userId,
                        firstName: firstName,
                        lastName: lastName,
                        username: username,
                        isReferralActive: true,
                        isFake: true // ← Marketing flag
                    }
                });
            }

            // Audit Log
            await tx.auditLog.create({
                data: {
                    actorId: adminTelegramId.toString(),
                    actorType: 'ADMIN',
                    action: 'FAKE_STATS_INJECTED',
                    entityType: 'User',
                    entityId: userId,
                    changes: JSON.stringify({ tasksCount, withdrawalsCount, referralsCount })
                }
            });

            return { success: true, injected: { tasks: tasksCount, withdrawals: withdrawalsCount, referrals: referralsCount } };
        });
    }

    async cleanupFakeData(userId: string, adminTelegramId: number) {
        return await this.prisma.$transaction(async (tx) => {
            // 1. Delete fake UserTasks (must delete before fake Tasks due to FK)
            const deletedUserTasks = await tx.userTask.deleteMany({
                where: { isFake: true, userId }
            });

            // 2. Delete fake Tasks created for this user
            const deletedTasks = await tx.task.deleteMany({
                where: { isFake: true, isActive: false }
            });

            // 3. Delete fake Withdrawals
            const deletedWithdrawals = await tx.withdrawal.deleteMany({
                where: { isFake: true, userId }
            });

            // 4. Delete fake referral Users (those with isFake=true referred by this user)
            const deletedUsers = await tx.user.deleteMany({
                where: { isFake: true, referredById: userId }
            });

            // Audit Log
            await tx.auditLog.create({
                data: {
                    actorId: adminTelegramId.toString(),
                    actorType: 'ADMIN',
                    action: 'FAKE_DATA_CLEANED',
                    entityType: 'User',
                    entityId: userId,
                    changes: JSON.stringify({
                        deletedUserTasks: deletedUserTasks.count,
                        deletedTasks: deletedTasks.count,
                        deletedWithdrawals: deletedWithdrawals.count,
                        deletedUsers: deletedUsers.count
                    })
                }
            });

            return {
                success: true,
                cleaned: {
                    tasks: deletedUserTasks.count,
                    withdrawals: deletedWithdrawals.count,
                    referrals: deletedUsers.count
                }
            };
        });
    }

    // ========== Creator Program ==========

    async getCreatorList() {
        const creators = await this.prisma.user.findMany({
            where: { creatorStatus: { in: ['PENDING', 'APPROVED'] } },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true, telegramId: true, username: true, firstName: true,
                creatorStatus: true, creatorChannels: true, isMarketingAcc: true,
                createdAt: true, updatedAt: true
            }
        });
        return JSON.parse(JSON.stringify(creators, (k, v) => typeof v === 'bigint' ? v.toString() : v));
    }

    async approveCreator(userId: string, adminTelegramId: number) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        await this.prisma.user.update({
            where: { id: userId },
            data: { creatorStatus: 'APPROVED', isMarketingAcc: true }
        });

        await this.prisma.auditLog.create({
            data: {
                actorId: adminTelegramId.toString(), actorType: 'ADMIN',
                action: 'CREATOR_APPROVED', entityType: 'User', entityId: userId
            }
        });

        // Send DM notification
        const botToken = process.env.BOT_TOKEN;
        if (botToken && user.telegramId) {
            fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: user.telegramId.toString(),
                    text: `🎉 *Selamat! Kamu Diterima Sebagai Creator GRupiah!*\n\nAkun kamu sekarang memiliki Creator Mode aktif. Buka Settings di aplikasi untuk melihat panduan dan pengaturan creator.\n\n🚀 Mulai buat konten dan dapatkan penghasilan!`,
                    parse_mode: 'Markdown'
                })
            }).catch(() => { });
        }

        return { success: true };
    }

    async rejectCreator(userId: string, adminTelegramId: number) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { creatorStatus: 'REJECTED' }
        });

        await this.prisma.auditLog.create({
            data: {
                actorId: adminTelegramId.toString(), actorType: 'ADMIN',
                action: 'CREATOR_REJECTED', entityType: 'User', entityId: userId
            }
        });

        return { success: true };
    }

    async revokeCreator(userId: string, adminTelegramId: number) {
        return await this.prisma.$transaction(async (tx) => {
            // 1. Reset creator flags
            await tx.user.update({
                where: { id: userId },
                data: { creatorStatus: 'NONE', isMarketingAcc: false, wdMode: null, marketingDelaySeconds: 30 }
            });

            // 2. Reset wallet balance to 0
            const wallet = await tx.wallet.findUnique({ where: { userId } });
            if (wallet) {
                await tx.wallet.update({ where: { id: wallet.id }, data: { balance: 0 } });
                // Delete marketing mutations
                await tx.walletMutation.deleteMany({
                    where: { walletId: wallet.id, description: { contains: '[Marketing]' } }
                });
            }

            // 3. Cleanup fake data
            await tx.userTask.deleteMany({ where: { isFake: true, userId } });
            await tx.withdrawal.deleteMany({ where: { isFake: true, userId } });
            await tx.user.deleteMany({ where: { isFake: true, referredById: userId } });

            // Audit
            await tx.auditLog.create({
                data: {
                    actorId: adminTelegramId.toString(), actorType: 'ADMIN',
                    action: 'CREATOR_REVOKED', entityType: 'User', entityId: userId
                }
            });

            return { success: true };
        });
    }
}


