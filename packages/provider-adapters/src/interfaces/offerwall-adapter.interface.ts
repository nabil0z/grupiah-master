export interface RewardDetail {
    taskId: string;
    userId: string;
    reward: number;
    providerTransactionId: string;
}

export interface NormalizedTask {
    externalId: string;
    title: string;
    description: string;
    reward: number; // Raw float value
    providerUrl: string; // The URL the user should visit
    logoUrl?: string; // Optional app icon/logo URL from the Ad Network 
}

export interface IOfferwallAdapter {
    providerName: string;
    /**
     * Fetch active tasks/offers for a specific user from the Ad Network API.
     * @param userId Internal User ID to tie the tracking postback
     * @param userIp The end-user's REAL IP address (required by OGAds/AdBlueMedia)
     * @param userAgent The end-user's REAL Device User-Agent
     */
    fetchTasks(userId: string, userIp?: string, userAgent?: string): Promise<NormalizedTask[]>;
    verifyPostback(req: any): Promise<boolean>;
    processReward(data: any): Promise<RewardDetail>;
}
