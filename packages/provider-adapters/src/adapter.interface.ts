// Normalized Task interface to keep the DB schema agnostic
export interface NormalizedTask {
    providerName: string;
    externalId: string;
    title: string;
    description: string;
    reward: number; // The raw USD reward amount
    ctaUrl: string; // The URL the user needs to click
    iconUrl?: string;
}

export interface RewardDetail {
    userId: string;
    taskId: string;
    rewardAmount: number;
    provider: string;
    transactionId: string; // From the provider's postback
}

export interface IOfferwallAdapter {
    providerName: string;

    /**
     * Fetches the live task offers from the Ad-Network API
     * and normalizes them into our standard domain format.
     * @param userId telegramId or uuid to append to the postback link
     */
    fetchTasks(userId: string): Promise<NormalizedTask[]>;

    /**
     * Validates the security of the incoming webhook postback.
     * Checks IP whitelists or HMAC Signatures.
     * @param headers HTTP Headers from the request
     * @param body Payload body from the request
     * @param ip Request IP address
     */
    verifyPostback(headers: Record<string, any>, body: any, ip: string): Promise<boolean>;

    /**
     * Processes the postback data and extracts the reward details
     * Returns standard reward details to feed the Prisma DB Mutations.
     * @param body Payload body from the request
     */
    processReward(body: any): Promise<RewardDetail>;
}
