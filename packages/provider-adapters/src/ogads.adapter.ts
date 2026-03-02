import { IOfferwallAdapter, NormalizedTask, RewardDetail } from './adapter.interface';

export class OGAdsAdapter implements IOfferwallAdapter {
    providerName = 'OGADS';
    private readonly ogadsApiKey = process.env.OGADS_API_KEY || 'dummy_key';
    private readonly postbackSecret = process.env.OGADS_POSTBACK_SECRET || 'dummy_secret';

    async fetchTasks(userId: string): Promise<NormalizedTask[]> {
        // In a real scenario, this would make an Axios GET request to OGAds API.
        // For now, we return mock data adhering to the adapter format.
        return [
            {
                providerName: this.providerName,
                externalId: 'ogads_offer_123',
                title: 'Install Rise of Kingdoms & Play 5 Minutes',
                description: 'Install and open the app for at least 5 minutes to earn your reward.',
                reward: 0.50, // 50 cents
                ctaUrl: `https://ogads.com/offer?id=123&user=${userId}`,
            },
            {
                providerName: this.providerName,
                externalId: 'ogads_offer_456',
                title: 'Complete Survey - Your Preferences',
                description: 'Answer a quick 5-minute survey about your habits.',
                reward: 0.80, // 80 cents
                ctaUrl: `https://ogads.com/offer?id=456&user=${userId}`,
            },
        ];
    }

    async verifyPostback(headers: Record<string, any>, body: any, ip: string): Promise<boolean> {
        // Verify OGAds IP Whitelist or IP Header matching
        const whitelistedIPs = ['104.28.1.1', '104.28.2.1']; // Example OGAds IPs
        if (!whitelistedIPs.includes(ip) && process.env.NODE_ENV !== 'development') {
            // We bypass in development for local testing
            return false;
        }
        return true;
    }

    async processReward(body: any): Promise<RewardDetail> {
        // OGAds typically sends data via application/x-www-form-urlencoded or JSON
        // e.g., ?userId=xxx&offerId=yyy&payout=zzz&txId=aaa
        return {
            userId: body.userId || body.custom_id,
            taskId: body.offerId || 'unknown_task',
            rewardAmount: parseFloat(body.payout || '0'),
            provider: this.providerName,
            transactionId: body.txId || `tx_${Date.now()}`
        };
    }
}
