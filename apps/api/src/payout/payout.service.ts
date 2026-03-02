import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PayoutService {
    private readonly logger = new Logger(PayoutService.name);
    private readonly xenditApiKey = process.env.XENDIT_API_KEY;

    async disburseFunds(
        withdrawalId: string,
        userId: string,
        amount: number,
        bankCode: string,
        accountNumber: string,
        accountHolderName: string
    ) {
        this.logger.log(`Initiating automated disbursement for withdrawal ${withdrawalId} via Xendit`);

        // In production, this would fire an API call to Xendit / Flip
        /*
        try {
          const disbursementResponse = await axios.post(
            'https://api.xendit.co/disbursements',
            {
              external_id: withdrawalId,
              amount,
              bank_code: bankCode,
              account_holder_name: accountHolderName,
              account_number: accountNumber,
              description: `Grupiah Payout - ${userId}`,
            },
            {
              headers: {
                Authorization: `Basic ${Buffer.from(this.xenditApiKey + ':').toString('base64')}`,
                'Content-Type': 'application/json',
              },
            },
          );
          
          return { success: true, apiResponse: disbursementResponse.data };
        } catch (error) {
          this.logger.error(`Disbursement failed for ${withdrawalId}`, error);
          return { success: false, error: error.message };
        }
        */

        // Placeholder simulated success
        return {
            success: true,
            apiResponse: {
                id: `disb_${Date.now()}`,
                status: 'PENDING',
                external_id: withdrawalId
            }
        };
    }
}
