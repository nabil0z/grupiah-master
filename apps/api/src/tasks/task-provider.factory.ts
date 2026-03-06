import { Injectable } from '@nestjs/common';
import { IOfferwallAdapter, OGAdsAdapter, AdBlueMediaAdapter, CPAGripAdapter } from '@grupiah/provider-adapters';

@Injectable()
export class TaskProviderFactory {
    // Inject all supported Offerwall Networks here
    constructor(
        private readonly ogAdsAdapter: OGAdsAdapter,
        private readonly adBlueMediaAdapter: AdBlueMediaAdapter,
        private readonly cpaGripAdapter: CPAGripAdapter
    ) { }

    getAdapter(providerName: string): IOfferwallAdapter {
        switch (providerName.toUpperCase()) {
            case 'OGADS':
                return this.ogAdsAdapter;
            case 'ADBLUEMEDIA':
                return this.adBlueMediaAdapter;
            case 'CPAGRIP':
                return this.cpaGripAdapter;
            default:
                throw new Error(`Unsupported Task Provider: ${providerName}`);
        }
    }
}
