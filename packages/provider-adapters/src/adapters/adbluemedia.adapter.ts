import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { IOfferwallAdapter, NormalizedTask, RewardDetail } from '../interfaces/offerwall-adapter.interface';

@Injectable()
export class AdBlueMediaAdapter implements IOfferwallAdapter {
    providerName = 'ADBLUEMEDIA';

    // List of known AdBlueMedia Postback IP Subnets for security validation
    private readonly ALLOWED_IPS = [
        // Populate with real AdBlueMedia IPs. Usually provided in their dashboard.
        // e.g., '192.168.1.1', '10.0.0.1' 
    ];

    private readonly logger = new Logger(AdBlueMediaAdapter.name);

    async fetchTasks(userId: string, userIp?: string, userAgent?: string): Promise<NormalizedTask[]> {
        const publisherId = process.env.ADBLUEMEDIA_USER_ID; // Found in their URL string (e.g., 18081)
        const apiKey = process.env.ADBLUEMEDIA_API_KEY;      // e.g., 65ec...

        if (!publisherId || !apiKey) {
            this.logger.warn('ADBLUEMEDIA_USER_ID or ADBLUEMEDIA_API_KEY not set. Returning empty tasks.');
            return [];
        }

        try {
            const ip = userIp || '8.8.8.8';
            const ua = userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

            // Based on their documentation snippet
            const response = await axios.get('https://d2dzcaq3bhqk1m.cloudfront.net/public/offers/feed.php', {
                params: {
                    user_id: publisherId,
                    api_key: apiKey,
                    ip: ip,
                    user_agent: ua,
                    s1: userId // Groupiah User ID mapped to s1 tracking sub-param
                },
                timeout: 15000 // Increased from 5s to 15s to prevent latency drops
            });

            // The response structure based on their jQuery script appears to be a direct array: `[ { anchor, url, conversion, payout? } ]`
            const offers = Array.isArray(response.data) ? response.data : (response.data?.offers || []);

            if (offers.length > 0) {
                this.logger.log(`[AdBlueMedia] Sample offer: ${JSON.stringify(offers[0])}`);
            }

            return offers.map((offer: any, index: number) => ({
                id: `adblue_${index}_${offer.anchor || '1'}`,
                provider: 'ADBLUEMEDIA',
                externalId: `adblue_${index}`,
                title: offer.anchor || offer.name || 'AdBlueMedia Offer', // Depending on their exact json keys
                description: offer.conversion || 'Complete this task to earn reward.',
                reward: parseFloat(offer.payout || offer.rate || '0'),
                type: 'AUTO',
                isActive: true,
                providerUrl: offer.url,
                logoUrl: offer.network_icon || offer.picture || offer.image // network_icon confirmed by user
            }));
        } catch (error: any) {
            this.logger.error(`Failed to fetch AdBlueMedia offers: ${error.message}`);
            return [];
        }
    }

    async verifyPostback(req: any): Promise<boolean> {
        // 1. IP Validation
        const incomingIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // Skip IP validation in development or if array is empty (pending setting from user)
        if (process.env.NODE_ENV !== 'production' || this.ALLOWED_IPS.length === 0) {
            console.warn('AdBlueMedia IP validation bypassed (Dev Mode / No IPs specified)');
            return true;
        }

        const isAllowed = this.ALLOWED_IPS.some(ip => incomingIp.includes(ip));
        if (!isAllowed) {
            console.error(`[Fraud Attempt] AdBlueMedia Webhook from Unauthorized IP: ${incomingIp}`);
            return false;
        }

        // 2. Secret Key / Hash Validation (AdBlueMedia often uses 'password' or MD5 hash in the query)
        // e.g., https://api.grupiah.com/webhook/postback/adbluemedia?secret=YOUR_SECRET_KEY
        const secret = req.query.secret || req.body.secret;
        if (process.env.ADBLUEMEDIA_POSTBACK_SECRET && secret !== process.env.ADBLUEMEDIA_POSTBACK_SECRET) {
            console.error('[Fraud Attempt] AdBlueMedia Webhook Invalid Secret Key');
            return false;
        }

        return true;
    }

    async processReward(data: any): Promise<RewardDetail> {
        console.log(`[AdBlueMedia processReward] Raw data:`, JSON.stringify(data));

        const userId = data.aff_sub || data.s1 || '';
        const payout = parseFloat(data.payout || data.rate || '0') || 0;
        const taskId = data.campaign_name || data.offer_id || 'adblue_unknown_task';
        // Use lead_id as unique transaction ID, fallback to composite if missing
        const providerTransactionId = data.transaction_id || data.lead_id
            || `adblue_${taskId}_${userId}_${Date.now()}`;

        console.log(`[AdBlueMedia processReward] userId=${userId}, taskId=${taskId}, payout=${payout}, txId=${providerTransactionId}`);

        return {
            taskId,
            userId,
            reward: payout,
            providerTransactionId
        };
    }
}
