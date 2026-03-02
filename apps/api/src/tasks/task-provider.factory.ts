import { Injectable } from '@nestjs/common';
import { IOfferwallAdapter, OGAdsAdapter, AdBlueMediaAdapter } from '@grupiah/provider-adapters';

@Injectable()
export class TaskProviderFactory {
    // Inject all supported Offerwall Networks here
    constructor(
        private readonly ogAdsAdapter: OGAdsAdapter,
        private readonly adBlueMediaAdapter: AdBlueMediaAdapter
    ) { }

    getAdapter(providerName: string): IOfferwallAdapter {
        switch (providerName.toUpperCase()) {
            case 'OGADS':
                return this.ogAdsAdapter;
            case 'ADBLUEMEDIA':
                return this.adBlueMediaAdapter;
            default:
                throw new Error(`Unsupported Task Provider: ${providerName}`);
        }
    }
}
