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
            // Find tasks that are active, and the user hasn't completed or is currently pending
            const userTasks = await this.prisma.userTask.findMany({
                where: { userId },
                select: { taskId: true }
            });

            const completedTaskIds = userTasks.map(t => t.taskId);

            // Fetch our Internal Custom Tasks
            const internalTasks = await this.prisma.task.findMany({
                where: {
                    isActive: true,
                    id: { notIn: completedTaskIds }
                }
            });

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
                // Inject mock tasks for development if 0
                if (ogAdsValue.length === 0 && process.env.NODE_ENV !== 'production') {
                    ogAdsValue = [
                        { externalId: 'og1', title: 'Rise of Kingdoms (OGAds)', description: 'Reach level 5.', reward: 3.12, providerUrl: '#', logoUrl: '' },
                        { externalId: 'og2', title: 'Bank Jago KYC', description: 'Complete KYC.', reward: 4.68, providerUrl: '#', logoUrl: '' }
                    ];
                }
                console.log(`[TasksService] Received ${ogAdsValue.length} tasks from OGAds.`);
                allExternalOffers = allExternalOffers.concat(
                    ogAdsValue.map(offer => ({
                        id: offer.externalId,
                        provider: 'OGADS',
                        externalId: offer.externalId,
                        title: offer.title,
                        description: offer.description,
                        reward: Math.floor(offer.reward * exchangeRate * globalMultiplier),
                        type: 'AUTO',
                        isActive: true,
                        providerUrl: offer.providerUrl,
                        logoUrl: offer.logoUrl
                    }))
                );
            } else {
                console.error('[TasksService] OGAds Fetch Failed', results[0].reason);
            }

            if (results[1].status === 'fulfilled') {
                let adBlueValue = results[1].value;
                // Inject mock tasks for development if 0
                if (adBlueValue.length === 0 && process.env.NODE_ENV !== 'production') {
                    adBlueValue = [
                        { externalId: 'ab1', title: 'Survey Pertanian AdBlue', description: 'Isi Survey.', reward: 1.56, providerUrl: '#', logoUrl: '' },
                        { externalId: 'ab2', title: 'Download Lords Mobile', description: 'Main 5 Menit.', reward: 2.81, providerUrl: '#', logoUrl: '' }
                    ];
                }
                console.log(`[TasksService] Received ${adBlueValue.length} tasks from AdBlueMedia.`);
                allExternalOffers = allExternalOffers.concat(
                    adBlueValue.map(offer => ({
                        id: offer.externalId,
                        provider: 'ADBLUEMEDIA',
                        externalId: offer.externalId,
                        title: offer.title,
                        description: offer.description,
                        reward: Math.floor(offer.reward * exchangeRate * globalMultiplier),
                        type: 'AUTO',
                        isActive: true,
                        providerUrl: offer.providerUrl,
                        logoUrl: offer.logoUrl
                    }))
                );
            } else {
                console.error('[TasksService] AdBlueMedia Fetch Failed', results[1].reason);
            }

            // Merge Internal + External Tasks 
            return [...internalTasks, ...allExternalOffers];
        } catch (error: any) {
            console.error('[TasksService] Caught Error in getAvailableTasks:', error);
            require('fs').writeFileSync('tasks_error.log', error.stack || String(error));
            throw error;
        }
    }
}
