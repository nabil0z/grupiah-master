import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { IOfferwallAdapter, NormalizedTask, RewardDetail } from '../interfaces/offerwall-adapter.interface';

@Injectable()
export class CPAGripAdapter implements IOfferwallAdapter {
    providerName = 'CPAGRIP';

    private readonly logger = new Logger(CPAGripAdapter.name);

    async fetchTasks(userId: string, userIp?: string, userAgent?: string): Promise<NormalizedTask[]> {
        const userId_cpa = process.env.CPAGRIP_USER_ID;      // 153630
        const privateKey = process.env.CPAGRIP_PRIVATE_KEY;   // d21a27ee91b9b4e746d61195da59a4f6

        if (!userId_cpa || !privateKey) {
            this.logger.warn('CPAGRIP_USER_ID or CPAGRIP_PRIVATE_KEY not set. Returning empty tasks.');
            return [];
        }

        try {
            const ip = userIp || '8.8.8.8';
            const ua = userAgent || 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36';

            const response = await axios.get('https://doctoredits.com/common/offer_feed_json.php', {
                params: {
                    user_id: userId_cpa,
                    key: privateKey,
                    ip: ip,
                    ua: ua,
                    tracking_id: userId,
                    showmobile: 'yes',
                    limit: 30
                },
                timeout: 15000
            });

            const offers = response.data?.offers || (Array.isArray(response.data) ? response.data : []);

            if (offers.length > 0) {
                this.logger.log(`[CPAGrip] Fetched ${offers.length} offers. Sample: ${JSON.stringify(offers[0])}`);
            } else {
                this.logger.warn('[CPAGrip] No offers returned');
            }

            // Detect user OS from user-agent for filtering
            const uaStr = userAgent || '';
            const uaLower = uaStr.toLowerCase();
            const isAndroid = uaLower.includes('android');
            const isIOS = uaLower.includes('iphone') || uaLower.includes('ipad') || uaLower.includes('ipod');

            // Filter offers by OS compatibility using 'type' field
            // Known types: mobile_droid, mobile_ios, email_submit, pin_submit, etc.
            const filtered = offers.filter((offer: any) => {
                const offerType = (offer.type || '').toLowerCase();
                if (!offerType) return true; // No type = show to all
                if (isAndroid && offerType === 'mobile_ios') return false;
                if (isIOS && offerType === 'mobile_droid') return false;
                return true;
            });

            this.logger.log(`[CPAGrip] After OS filter: ${filtered.length}/${offers.length} offers (${isAndroid ? 'Android' : isIOS ? 'iOS' : 'Desktop'})`);

            return filtered.map((offer: any, index: number) => {
                const title = offer.title || offer.offer_name || 'CPAGrip Offer';
                
                // Combine description with adcopy if adcopy provides more context/instructions
                const instructions = offer.adcopy || '';
                const baseDescription = offer.description || offer.conversion || 'Selesaikan tugas ini.';
                const finalDescription = instructions && instructions !== baseDescription
                    ? `${baseDescription} \n\nInstruksi: ${instructions}`
                    : baseDescription;

                return {
                    id: `cpagrip_${offer.offerid || index}`,
                    provider: 'CPAGRIP',
                    externalId: `cpagrip_${offer.offerid || index}`,
                    title,
                    description: finalDescription,
                    reward: parseFloat(offer.payout || offer.amount || '0'),
                    type: 'AUTO',
                    isActive: true,
                    providerUrl: offer.offerlink || offer.link || offer.url || '#',
                    logoUrl: offer.offerphoto || offer.image || offer.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=6366f1&color=fff&size=128`
                };
            });
        } catch (error: any) {
            this.logger.error(`Failed to fetch CPAGrip offers: ${error.message}`);
            return [];
        }
    }

    async verifyPostback(req: any): Promise<boolean> {
        // CPAGrip postback URL format:
        // https://api.grupiah.online/webhook/postback/cpagrip?tracking_id={tracking_id}&payout={payout}&offer_id={offer_id}&lead_id={lead_id}

        // In production, validate IP against CPAGrip's known server IPs
        if (process.env.NODE_ENV !== 'production') {
            this.logger.warn('CPAGrip IP validation bypassed (Dev Mode)');
            return true;
        }

        // CPAGrip postbacks come from their servers
        // Add their IPs to this list when you get them from CPAGrip support
        const ALLOWED_IPS = process.env.CPAGRIP_POSTBACK_IPS?.split(',') || [];

        if (ALLOWED_IPS.length === 0) {
            // No IPs configured = accept all (early stage)
            return true;
        }

        const incomingIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const isAllowed = ALLOWED_IPS.some(ip => incomingIp.includes(ip.trim()));

        if (!isAllowed) {
            this.logger.error(`[Fraud] CPAGrip postback from unauthorized IP: ${incomingIp}`);
            return false;
        }

        return true;
    }

    async processReward(data: any): Promise<RewardDetail> {
        console.log(`[CPAGrip processReward] Raw data:`, JSON.stringify(data));

        const userId = data.tracking_id || '';
        const offerId = data.offer_id || 'unknown';
        const payout = parseFloat(data.payout || '0') || 0;
        const providerTransactionId = data.lead_id || `cpagrip_${offerId}_${userId}_${Date.now()}`;

        console.log(`[CPAGrip processReward] userId=${userId}, offerId=${offerId}, payout=${payout}, txId=${providerTransactionId}`);

        return {
            taskId: `cpagrip_${offerId}`,
            userId,
            reward: payout,
            providerTransactionId
        };
    }
}
