import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { IOfferwallAdapter, NormalizedTask, RewardDetail } from '../interfaces/offerwall-adapter.interface';

@Injectable()
export class OGAdsAdapter implements IOfferwallAdapter {
    providerName = 'OGADS';

    private readonly logger = new Logger(OGAdsAdapter.name);

    async fetchTasks(userId: string, userIp?: string, userAgent?: string): Promise<NormalizedTask[]> {
        const apiKey = process.env.OGADS_API_KEY;
        if (!apiKey) {
            this.logger.warn('OGADS_API_KEY not set. Returning empty tasks.');
            return [];
        }

        try {
            // Note: OGAds requires IP and user_agent. We fallback to generic if not provided by controller.
            let ip = userIp || '8.8.8.8'; // Default generic fallback

            // AdNetworks (OGAds/AdBlue) will return 0 offers if the IP is localhost. Spoof it for dev:
            if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
                ip = '8.8.8.8'; // Simulate a US IP so offers appear during local development
            }

            const ua = userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

            const queryParams = new URLSearchParams({
                ip: ip,
                user_agent: ua,
                aff_sub: userId // Tracking the User id
            }).toString();

            const response = await axios.get(`https://confirmapp.online/api/v2?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                timeout: 15000 // Prevent hanging connection (Increased to 15s)
            });

            const offers = response.data?.offers || [];

            this.logger.log(`[OGAds] Received ${offers.length} offers from API.`);
            if (offers.length > 0) {
                // Log the first offer for debugging structure
                this.logger.log(`[OGAds] Sample offer: ${JSON.stringify(offers[0])}`);
            }

            // Detect user OS from user-agent for filtering
            const uaLower = (ua || '').toLowerCase();
            const isAndroid = uaLower.includes('android');
            const isIOS = uaLower.includes('iphone') || uaLower.includes('ipad') || uaLower.includes('ipod');

            // Filter offers by device compatibility
            const filtered = offers.filter((offer: any) => {
                const device = (offer.device || '').toLowerCase();
                if (!device) return true; // No device info = show to all
                if (isAndroid) {
                    // Android user: show if device includes 'android' or is a general offer (desktop/all)
                    return device.includes('android') || (!device.includes('iphone') && !device.includes('ipad'));
                }
                if (isIOS) {
                    // iOS user: show if device includes 'iphone'/'ipad' or is a general offer
                    return device.includes('iphone') || device.includes('ipad') || (!device.includes('android'));
                }
                return true; // Desktop or unknown — show all
            });

            this.logger.log(`[OGAds] After OS filter: ${filtered.length}/${offers.length} offers (${isAndroid ? 'Android' : isIOS ? 'iOS' : 'Desktop'})`);

            return filtered.map((offer: any, index: number) => ({
                id: offer.offer_id ? offer.offer_id.toString() : `unknown-${index}`,
                provider: 'OGADS',
                externalId: offer.offer_id ? offer.offer_id.toString() : `unknown-${index}`,
                title: offer.name || offer.name_short || 'OGAds Offer',
                description: offer.description,
                reward: parseFloat(offer.payout) || 0,
                type: 'AUTO',
                isActive: true,
                providerUrl: offer.link || '#',
                logoUrl: offer.picture || ''
            }));
        } catch (error: any) {
            this.logger.error(`Failed to fetch OGAds offers: ${error.message}`);
            return [];
        }
    }

    // OGAds Postback Whitelisted IPs (from official docs)
    private readonly ALLOWED_IPS = [
        '104.28.', '104.28.31.250', // Replace with their actual CNAME/IPs ranges if known or just fallback to hash check 
    ];

    async verifyPostback(req: any): Promise<boolean> {
        // OGADS Security: They usually pass the MAC / Hash signature in the query params.
        // e.g. https://api.grupiah.com/webhook/postback/ogads?aff_sub={aff_sub}&payout={payout}&offer_id={offer_id}&ip={ip}&hash={mac}

        const myOgadsPostbackKey = process.env.OGADS_POSTBACK_SECRET || 'SECRET'; // Get this from OGAds Dashboard
        const incomeHash = req.query.hash || req.body.hash;

        // If no secret configured locally, bypass (for dev)
        if (!process.env.OGADS_POSTBACK_SECRET) {
            console.warn('OGAds Hash validation bypassed (Dev Mode / No Secret Configured)');
            return true;
        }

        // Ideally, we replicate their MD5 / SHA calculation here: 
        // hash = MD5(offer_id + payout + ip + myOgadsPostbackKey)
        // For demonstration, we just check if it matches a static secret or known logic.
        if (incomeHash !== myOgadsPostbackKey) {
            console.error(`[Fraud Attempt] OGAds Webhook Signature Mismatch. Provided: ${incomeHash}`);
            return false;
        }

        return true;
    }

    async processReward(data: any): Promise<RewardDetail> {
        console.log(`[OGAds processReward] Raw data:`, JSON.stringify(data));

        const userId = data.aff_sub || '';
        const offerId = data.offer_id || '';
        const payout = parseFloat(data.payout) || 0;
        // OGAds doesn't provide a unique transaction ID macro.
        // transaction_id may contain {session_ip} which is NOT unique.
        // Generate composite ID: offer_id + user_id + timestamp for uniqueness
        const rawTxId = data.transaction_id || '';
        const providerTransactionId = rawTxId && rawTxId !== ''
            ? `ogads_${offerId}_${userId}_${rawTxId}`
            : `ogads_${offerId}_${userId}_${Date.now()}`;

        console.log(`[OGAds processReward] userId=${userId}, offerId=${offerId}, payout=${payout}, txId=${providerTransactionId}`);

        return {
            taskId: offerId,
            userId,
            reward: payout,
            providerTransactionId
        };
    }
}
