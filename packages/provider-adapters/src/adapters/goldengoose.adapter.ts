import { Injectable, Logger } from '@nestjs/common';
import { IOfferwallAdapter, NormalizedTask, RewardDetail } from '../interfaces/offerwall-adapter.interface';

@Injectable()
export class GoldenGooseAdapter implements IOfferwallAdapter {
    providerName = 'GOLDENGOOSE';
    private readonly logger = new Logger(GoldenGooseAdapter.name);

    async fetchTasks(userId: string, userIp?: string, userAgent?: string): Promise<NormalizedTask[]> {
        const smartLinkUrl = process.env.GOLDENGOOSE_SMARTLINK_URL;
        
        if (!smartLinkUrl) {
            return [];
        }

        // Since Golden Goose has no API feed, we return a single "Special Task"
        // representing their SmartLink. 
        // We append the userId to the tracking parameter (usually p1 or p2)
        const trackingParam = process.env.GOLDENGOOSE_TRACKING_PARAM || 'p1';
        const separator = smartLinkUrl.includes('?') ? '&' : '?';
        const finalUrl = `${smartLinkUrl}${separator}${trackingParam}=${userId}`;

        return [{
            externalId: 'smartlink-mainstream',
            title: 'Tugas Kilat ⚡ (Pin Submit)',
            description: 'Selesaikan tugas cepat ini. Estimasi hadiah besar & cair instan!',
            reward: 0.50, // Payout placeholder
            providerUrl: finalUrl,
            logoUrl: 'https://cdn-icons-png.flaticon.com/512/616/616490.png'
        }];
    }

    async verifyPostback(req: any): Promise<boolean> {
        // Golden Goose postback verification logic
        // If GG_POSTBACK_SECRET is set, we could verify IPs or a secret param
        const secret = process.env.GOLDENGOOSE_POSTBACK_SECRET;
        if (secret) {
             const incomingSecret = req.query?.secret || req.body?.secret;
             if (incomingSecret !== secret) {
                 this.logger.error('[Fraud Attempt] Golden Goose Secret Mismatch');
                 return false;
             }
        }
        return true;
    }

    async processReward(data: any): Promise<RewardDetail> {
        this.logger.log(`[GoldenGoose processReward] Raw data: ${JSON.stringify(data)}`);

        // Typical GG postback macros mapped to our query params:
        // clickid/userId -> data.userId
        // payout/money -> data.payout
        // conversion_id -> data.txId

        const userId = data.userId || '';
        const rawPayout = parseFloat(data.payout) || 0;
        const txId = data.txId || `gg_${Date.now()}`;

        // Get multiplier from ENV or default to 0.5 (50%)
        const multiplier = parseFloat(process.env.GOLDENGOOSE_REWARD_MULTIPLIER || '0.5');
        const calculatedReward = rawPayout * multiplier;

        this.logger.log(`[GoldenGoose] User: ${userId}, Raw: $${rawPayout}, Net: $${calculatedReward}, Tx: ${txId}`);

        return {
            taskId: 'smartlink-mainstream',
            userId: userId,
            reward: calculatedReward,
            providerTransactionId: `gg_${txId}`
        };
    }
}
