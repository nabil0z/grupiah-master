import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskProviderFactory } from './task-provider.factory';
import { AdminConfigService } from '../admin/config/admin-config.service';

// 30-minute cache for external provider tasks (keyed by IP)
const CACHE_TTL_MS = 30 * 60 * 1000;
const externalTaskCache = new Map<string, { data: any[]; timestamp: number }>();

// Auto-clean expired cache entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of externalTaskCache) {
        if (now - entry.timestamp > CACHE_TTL_MS) {
            externalTaskCache.delete(key);
        }
    }
}, 10 * 60 * 1000);

@Injectable()
export class TasksService {
    constructor(
        private prisma: PrismaService,
        private taskProviderFactory: TaskProviderFactory,
        private configService: AdminConfigService
    ) { }

    async getAvailableTasks(userId: string, userIp?: string, userAgent?: string) {
        try {
            console.log(`[TasksService] getAvailableTasks called for User: ${userId}`);
            const userTasks = await this.prisma.userTask.findMany({
                where: { userId },
                select: { taskId: true, status: true }
            });

            const userTaskMap = new Map(userTasks.map(ut => [ut.taskId, ut.status]));
            const completedTaskIds = userTasks.filter(ut => ut.status === 'APPROVED').map(ut => ut.taskId);

            // Fetch our Internal Custom Tasks
            const internalTasksRaw = await this.prisma.task.findMany({
                where: {
                    isActive: true,
                    id: { notIn: completedTaskIds }
                }
            });

            const mappedInternalTasks = internalTasksRaw.map(t => ({
                ...t,
                userSubmissionStatus: userTaskMap.get(t.id) || null
            }));
            // Check cache for external tasks (keyed by IP)
            const cacheKey = userIp || 'default';
            const cached = externalTaskCache.get(cacheKey);
            let providerResults: PromiseSettledResult<any[]>[];

            // Check which providers are enabled
            const ogadsEnabled = (await this.configService.getConfigValue('PROVIDER_OGADS_ENABLED', 'true')) === 'true';
            const adblueEnabled = (await this.configService.getConfigValue('PROVIDER_ADBLUEMEDIA_ENABLED', 'true')) === 'true';
            const cpagripEnabled = (await this.configService.getConfigValue('PROVIDER_CPAGRIP_ENABLED', 'true')) === 'true';

            if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
                // Use cached external tasks (respect enabled flags)
                providerResults = [
                    ogadsEnabled ? { status: 'fulfilled' as const, value: cached.data[0] || [] } : { status: 'rejected' as const, reason: 'disabled' },
                    adblueEnabled ? { status: 'fulfilled' as const, value: cached.data[1] || [] } : { status: 'rejected' as const, reason: 'disabled' },
                    cpagripEnabled ? { status: 'fulfilled' as const, value: cached.data[2] || [] } : { status: 'rejected' as const, reason: 'disabled' }
                ];
            } else {
                // Fetch fresh from enabled providers only
                providerResults = await Promise.allSettled([
                    ogadsEnabled
                        ? this.taskProviderFactory.getAdapter('OGADS').fetchTasks(userId, userIp, userAgent)
                        : Promise.reject('disabled'),
                    adblueEnabled
                        ? this.taskProviderFactory.getAdapter('ADBLUEMEDIA').fetchTasks(userId, userIp, userAgent)
                        : Promise.reject('disabled'),
                    cpagripEnabled
                        ? this.taskProviderFactory.getAdapter('CPAGRIP').fetchTasks(userId, userIp, userAgent)
                        : Promise.reject('disabled'),
                ]);

                // Cache successful results
                const ogData = providerResults[0].status === 'fulfilled' ? providerResults[0].value : [];
                const abData = providerResults[1].status === 'fulfilled' ? providerResults[1].value : [];
                const cgData = providerResults[2].status === 'fulfilled' ? providerResults[2].value : [];
                externalTaskCache.set(cacheKey, { data: [ogData, abData, cgData], timestamp: Date.now() });
            }

            const results = providerResults;

            const globalMultiplierStr = await this.configService.getConfigValue('GLOBAL_OFFER_MULTIPLIER', '1');
            const globalMultiplier = parseFloat(globalMultiplierStr) || 1;
            const exchangeRate = 16000;

            let allExternalOffers: any[] = [];

            // OGAds
            if (results[0].status === 'fulfilled' && results[0].value.length > 0) {
                allExternalOffers = allExternalOffers.concat(
                    results[0].value.map(offer => ({
                        id: offer.externalId || `og_${Math.random()}`,
                        provider: 'OGADS',
                        externalId: offer.externalId || `og_${Math.random()}`,
                        title: offer.title,
                        description: offer.description,
                        reward: Math.floor(offer.reward * exchangeRate * globalMultiplier),
                        type: 'AUTO',
                        isActive: true,
                        providerUrl: offer.providerUrl,
                        logoUrl: offer.logoUrl
                    }))
                );
            } else if (results[0].status === 'rejected' && results[0].reason !== 'disabled') {
                console.error('[TasksService] OGAds Fetch Failed', results[0].reason);
            }

            // AdBlueMedia
            if (results[1].status === 'fulfilled' && results[1].value.length > 0) {
                allExternalOffers = allExternalOffers.concat(
                    results[1].value.map(offer => ({
                        id: offer.externalId || `ab_${Math.random()}`,
                        provider: 'ADBLUEMEDIA',
                        externalId: offer.externalId || `ab_${Math.random()}`,
                        title: offer.title,
                        description: offer.description,
                        reward: Math.floor(offer.reward * exchangeRate * globalMultiplier),
                        type: 'AUTO',
                        isActive: true,
                        providerUrl: offer.providerUrl,
                        logoUrl: offer.logoUrl
                    }))
                );
            } else if (results[1].status === 'rejected' && results[1].reason !== 'disabled') {
                console.error('[TasksService] AdBlueMedia Fetch Failed', results[1].reason);
            }

            // CPAGrip
            if (results[2] && results[2].status === 'fulfilled' && results[2].value.length > 0) {
                allExternalOffers = allExternalOffers.concat(
                    results[2].value.map(offer => ({
                        id: offer.externalId || `cg_${Math.random()}`,
                        provider: 'CPAGRIP',
                        externalId: offer.externalId || `cg_${Math.random()}`,
                        title: offer.title,
                        description: offer.description,
                        reward: Math.floor(offer.reward * exchangeRate * globalMultiplier),
                        type: 'AUTO',
                        isActive: true,
                        providerUrl: offer.providerUrl,
                        logoUrl: offer.logoUrl
                    }))
                );
            } else if (results[2] && results[2].status === 'rejected' && results[2].reason !== 'disabled') {
                console.error('[TasksService] CPAGrip Fetch Failed', results[2].reason);
            }

            const scoresRaw = await this.prisma.offerScore.findMany();
            const scoreMap = new Map();
            for (const s of scoresRaw) {
                scoreMap.set(`${s.provider}_${s.externalId}`, s);
            }

            // Merge Internal + External Tasks and sort by Expected Value descending
            return [...mappedInternalTasks, ...allExternalOffers].sort((a, b) => {
                const rewardA = typeof a.reward === 'object' ? Number(a.reward) : a.reward;
                const rewardB = typeof b.reward === 'object' ? Number(b.reward) : b.reward;

                const scoreA = scoreMap.get(`${a.provider}_${a.externalId || a.id}`);
                const scoreB = scoreMap.get(`${b.provider}_${b.externalId || b.id}`);

                // Default conversion rate for new offers (e.g. 5%) to give them a chance
                const conversionA = scoreA && scoreA.clicks >= 5 ? (scoreA.completions / scoreA.clicks) : 0.05;
                const conversionB = scoreB && scoreB.clicks >= 5 ? (scoreB.completions / scoreB.clicks) : 0.05;

                const expectedValueA = rewardA * conversionA;
                const expectedValueB = rewardB * conversionB;

                return expectedValueB - expectedValueA;
            });
        } catch (error: any) {

            console.error('[TasksService] Caught Error in getAvailableTasks:', error);
            require('fs').writeFileSync('tasks_error.log', error.stack || String(error));
            throw error;
        }
    }

    async submitManualTask(userId: string, taskId: string, proofUrl?: string, proofText?: string) {
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task || task.type !== 'MANUAL') {
            throw new Error('Task not found or not a manual task');
        }

        const existing = await this.prisma.userTask.findFirst({
            where: { userId, taskId }
        });

        if (existing) {
            if (existing.status === 'APPROVED' || existing.status === 'PENDING') {
                throw new Error('Task already submitted');
            }
            // If REJECTED, they can resubmit
            return this.prisma.userTask.update({
                where: { id: existing.id },
                data: {
                    status: 'PENDING',
                    proofUrl,
                    proofText,
                    reward: task.reward
                }
            });
        }

        // Check if user is a Marketing Account → Auto-Approve Bypass
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { wallet: true }
        });

        if (user?.isMarketingAcc) {
            // Immediately approve and credit the reward
            return this.prisma.$transaction(async (tx) => {
                const userTask = await tx.userTask.create({
                    data: {
                        userId,
                        taskId,
                        status: 'APPROVED',
                        proofUrl,
                        proofText,
                        reward: task.reward
                    }
                });

                // Credit the reward
                if (user.wallet) {
                    await tx.wallet.update({
                        where: { id: user.wallet.id },
                        data: { balance: { increment: task.reward } }
                    });

                    await tx.walletMutation.create({
                        data: {
                            walletId: user.wallet.id,
                            amount: task.reward,
                            type: 'EARN',
                            description: `[Auto-Approved] Task: ${task.title}`
                        }
                    });
                }

                console.log(`[TasksService] Marketing Auto-Approve: User ${userId} -> Task ${taskId} ✅`);
                return userTask;
            });
        }

        // Normal flow: Create with PENDING status
        return this.prisma.userTask.create({
            data: {
                userId,
                taskId,
                status: 'PENDING',
                proofUrl,
                proofText,
                reward: task.reward
            }
        });
    }

    async recordClick(provider: string, externalId: string, userId?: string | null, reward?: number) {
        try {
            // Always record the click for analytics
            await this.prisma.offerScore.upsert({
                where: {
                    provider_externalId: { provider, externalId }
                },
                update: {
                    clicks: { increment: 1 }
                },
                create: {
                    provider,
                    externalId,
                    clicks: 1,
                    completions: 0
                }
            });

            // Marketing Mode: Auto-credit after configurable delay
            if (userId && reward && reward > 0) {
                const user = await this.prisma.user.findUnique({
                    where: { id: userId },
                    include: { wallet: true }
                });

                if (user?.isMarketingAcc) {
                    const delayStr = await this.configService.getConfigValue('MARKETING_OFFER_DELAY_MS', '25000');
                    const delayMs = parseInt(delayStr) || 25000;

                    // Reward from frontend is ALREADY converted to IDR (exchangeRate * multiplier applied in getAvailableTasks)
                    // So we use it directly — no conversion needed
                    const rewardInIDR = Math.round(reward);

                    console.log(`[Marketing] Scheduling auto-credit for user ${userId}: Rp ${rewardInIDR} in ${delayMs}ms`);

                    setTimeout(async () => {
                        try {
                            await this.prisma.$transaction(async (tx) => {
                                let wallet = user.wallet;
                                if (!wallet) {
                                    wallet = await tx.wallet.create({ data: { userId: user.id, balance: 0 } });
                                }

                                await tx.wallet.update({
                                    where: { id: wallet.id },
                                    data: { balance: { increment: rewardInIDR } }
                                });

                                await tx.walletMutation.create({
                                    data: {
                                        walletId: wallet.id,
                                        amount: rewardInIDR,
                                        type: 'EARN',
                                        description: `[Marketing] ${provider} offer completed`
                                    }
                                });
                            });

                            console.log(`[Marketing] Auto-credited Rp ${rewardInIDR} to user ${userId} ✅`);

                            // Send private DM notification
                            try {
                                const botToken = process.env.BOT_TOKEN;
                                if (botToken && user.telegramId) {
                                    const message = `✅ *Tugas Selesai!*\n\n` +
                                        `Offer dari *${provider}* berhasil diselesaikan.\n` +
                                        `💰 Reward: *Rp ${rewardInIDR.toLocaleString('id-ID')}*\n\n` +
                                        `Saldo kamu sudah bertambah. Lanjutkan untuk mendapatkan lebih banyak! 🚀`;

                                    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            chat_id: user.telegramId.toString(),
                                            text: message,
                                            parse_mode: 'Markdown'
                                        })
                                    });
                                    console.log(`[Marketing] DM sent to user ${user.telegramId} ✅`);
                                }
                            } catch (dmErr) {
                                console.error('[Marketing] Failed to send DM:', dmErr);
                            }
                        } catch (creditErr) {
                            console.error(`[Marketing] Auto-credit failed for user ${userId}:`, creditErr);
                        }
                    }, delayMs);
                }
            }
        } catch (e) {
            console.error('[TasksService] recordClick error', e);
        }
    }

    async recordCompletion(provider: string, externalId: string) {
        try {
            return await this.prisma.offerScore.upsert({
                where: {
                    provider_externalId: { provider, externalId }
                },
                update: {
                    completions: { increment: 1 }
                },
                create: {
                    provider,
                    externalId,
                    clicks: 1, // Assume at least 1 click if completed unseen
                    completions: 1
                }
            });
        } catch (e) {
            console.error('[TasksService] recordCompletion error', e);
        }
    }

    async getFlashTasks(userId: string, userIp?: string, userAgent?: string) {
        const allTasks = await this.getAvailableTasks(userId, userIp, userAgent);

        const configuredOgAds = await this.configService.getConfigValue('FLASH_TASK_OGADS', '');
        const configuredAdBlue = await this.configService.getConfigValue('FLASH_TASK_ADBLUEMEDIA', '');
        const configuredCustom = await this.configService.getConfigValue('FLASH_TASK_CUSTOM', '');

        const getTask = (provider: string, configuredId: string) => {
            const providerTasks = allTasks.filter(t => t.provider === provider);

            if (configuredId) {
                const found = providerTasks.find(t => (t.externalId || t.id) === configuredId);
                if (found) return found;
            }

            // Fallback: If no ID configured OR configured ID not found, return the highest expected value task for this provider
            if (providerTasks.length > 0) {
                return providerTasks[0];
            }

            return null;
        };

        const flashTasks: any[] = [];

        const ogAdsTask = getTask('OGADS', configuredOgAds);
        if (ogAdsTask) flashTasks.push(ogAdsTask);

        const adBlueTask = getTask('ADBLUEMEDIA', configuredAdBlue);
        if (adBlueTask) flashTasks.push(adBlueTask);

        const customTask = getTask('CUSTOM', configuredCustom);
        if (customTask) flashTasks.push(customTask);

        // Ultimate fallback: If for some reason we still have 0 flash tasks (e.g. database totally empty and providers failed), just return the top 3 available tasks regardless of provider.
        if (flashTasks.length === 0 && allTasks.length > 0) {
            return allTasks.slice(0, 3);
        }

        return flashTasks.filter(t => t !== undefined && t !== null);
    }
}
