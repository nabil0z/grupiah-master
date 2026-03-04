import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskProviderFactory } from './task-provider.factory';
import { AdminConfigService } from '../admin/config/admin-config.service';

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
            // Concept: Dynamically fetch active ad networks. We now fetch both OGADS and ADBLUEMEDIA concurrently.
            console.log('[TasksService] Requesting Offerwall Adapters...');
            const ogadsAdapter = this.taskProviderFactory.getAdapter('OGADS');
            const adBlueMediaAdapter = this.taskProviderFactory.getAdapter('ADBLUEMEDIA');

            console.log('[TasksService] Executing parallel fetchTasks()...');

            // Use Promise.allSettled so if one network falls over, the other still succeeds
            const results = await Promise.allSettled([
                ogadsAdapter.fetchTasks(userId, userIp, userAgent),
                adBlueMediaAdapter.fetchTasks(userId, userIp, userAgent)
            ]);

            const globalMultiplierStr = await this.configService.getConfigValue('GLOBAL_OFFER_MULTIPLIER', '1');
            const globalMultiplier = parseFloat(globalMultiplierStr) || 1;
            const exchangeRate = 16000;

            let allExternalOffers: any[] = [];

            if (results[0].status === 'fulfilled') {
                let ogAdsValue = results[0].value;
                if (ogAdsValue.length === 0) {
                    ogAdsValue = [
                        { externalId: 'og_mock_1', title: 'Rise of Kingdoms (OGAds)', description: 'Reach level 5.', reward: 3.12 * exchangeRate * globalMultiplier, providerUrl: '#', logoUrl: '' },
                        { externalId: 'og_mock_2', title: 'Bank Jago KYC', description: 'Complete KYC.', reward: 4.68 * exchangeRate * globalMultiplier, providerUrl: '#', logoUrl: '' }
                    ];
                    allExternalOffers = allExternalOffers.concat(ogAdsValue);
                } else {
                    allExternalOffers = allExternalOffers.concat(
                        ogAdsValue.map(offer => ({
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
                }
            } else {
                console.error('[TasksService] OGAds Fetch Failed', results[0].reason);
                // INJECT DUMMIES ON FAIL
                allExternalOffers = allExternalOffers.concat([
                    { id: `og_mock_1`, provider: 'OGADS', externalId: 'og_mock_1', title: 'Rise of Kingdoms (OGAds)', description: 'Reach level 5.', reward: Math.floor(3.12 * exchangeRate * globalMultiplier), type: 'AUTO', isActive: true, providerUrl: '#', logoUrl: '' },
                    { id: `og_mock_2`, provider: 'OGADS', externalId: 'og_mock_2', title: 'Bank Jago KYC', description: 'Complete KYC.', reward: Math.floor(4.68 * exchangeRate * globalMultiplier), type: 'AUTO', isActive: true, providerUrl: '#', logoUrl: '' }
                ]);
            }

            if (results[1].status === 'fulfilled') {
                let adBlueValue = results[1].value;
                if (adBlueValue.length === 0) {
                    adBlueValue = [
                        { externalId: 'ab_mock_1', title: 'Survey Pertanian AdBlue', description: 'Isi Survey.', reward: Math.floor(1.56 * exchangeRate * globalMultiplier), providerUrl: '#', logoUrl: '' },
                        { externalId: 'ab_mock_2', title: 'Download Lords Mobile', description: 'Main 5 Menit.', reward: Math.floor(2.81 * exchangeRate * globalMultiplier), providerUrl: '#', logoUrl: '' }
                    ];
                    allExternalOffers = allExternalOffers.concat(adBlueValue);
                } else {
                    allExternalOffers = allExternalOffers.concat(
                        adBlueValue.map(offer => ({
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
                }

            } else {
                console.error('[TasksService] AdBlueMedia Fetch Failed', results[1].reason);
                // INJECT DUMMIES ON FAIL
                allExternalOffers = allExternalOffers.concat([
                    { id: `ab_mock_1`, provider: 'ADBLUEMEDIA', externalId: 'ab_mock_1', title: 'Survey Pertanian AdBlue', description: 'Isi Survey.', reward: Math.floor(1.56 * exchangeRate * globalMultiplier), type: 'AUTO', isActive: true, providerUrl: '#', logoUrl: '' },
                    { id: `ab_mock_2`, provider: 'ADBLUEMEDIA', externalId: 'ab_mock_2', title: 'Download Lords Mobile', description: 'Main 5 Menit.', reward: Math.floor(2.81 * exchangeRate * globalMultiplier), type: 'AUTO', isActive: true, providerUrl: '#', logoUrl: '' }
                ]);
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

    async recordClick(provider: string, externalId: string) {
        try {
            return await this.prisma.offerScore.upsert({
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
