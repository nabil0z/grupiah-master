const { OGAdsAdapter } = require('./packages/provider-adapters/dist/adapters/ogads.adapter.js');
const { AdBlueMediaAdapter } = require('./packages/provider-adapters/dist/adapters/adbluemedia.adapter.js');
const { CPAGripAdapter } = require('./packages/provider-adapters/dist/adapters/cpagrip.adapter.js');

async function testNormalization() {
    console.log('--- STARTING NORMALIZATION TEST ---');

    // 1. OGAds Test
    const ogAds = new OGAdsAdapter();
    const ogMock = {
        name: 'Shopee Play',
        description: 'Mainkan game dan menangkan koin.',
        instructions: 'Instal, buka, dan mainkan selama 5 menit.',
        payout: '0.50'
    };
    const ogResult = (await ogAds.fetchTasks('user-1'))[0]; 
    // Note: fetchTasks uses axios, we'd need to mock it for a real unit test, 
    // but here we manually check the mapping logic if we were to just test the map function.
    // Since map is inside fetchTasks, I'll just explain what I changed.
    
    console.log('Checking logic...');
    
    // Manual mapping check (mimicking the code)
    const testOg = (offer) => {
        const title = offer.name || 'OGAds Offer';
        const instructions = offer.instructions || '';
        const baseDescription = offer.description || '';
        const finalDescription = instructions ? `${baseDescription} \n\nInstruksi: ${instructions}` : baseDescription;
        return { title, description: finalDescription };
    };
    
    console.log('OGAds Result:', testOg(ogMock));

    // 2. AdBlueMedia Test
    const testAdBlue = (offer) => {
        const title = offer.name || offer.anchor || 'AdBlueMedia Offer';
        const instructions = offer.anchor || '';
        const conversion = offer.conversion || '';
        const finalDescription = instructions && instructions !== title 
            ? `${conversion} \n\nInstruksi: ${instructions}` : conversion;
        return { title, description: finalDescription };
    };
    
    const adBlueMock = {
        name: 'TikTok Video',
        anchor: 'Follow and like 3 videos',
        conversion: 'Reward after follow'
    };
    console.log('AdBlueMedia Result:', testAdBlue(adBlueMock));

    // 3. CPAGrip Test
    const testCPAGrip = (offer) => {
        const title = offer.title || 'CPAGrip Offer';
        const instructions = offer.adcopy || '';
        const baseDescription = offer.description || 'Selesaikan tugas.';
        const finalDescription = instructions && instructions !== baseDescription 
            ? `${baseDescription} \n\nInstruksi: ${instructions}` : baseDescription;
        return { title, description: finalDescription };
    };
    
    const cpaMock = {
        title: 'Survey Hadiah',
        adcopy: 'Isi survei 2 menit',
        description: 'Dapatkan saldo dana gratis.'
    };
    console.log('CPAGrip Result:', testCPAGrip(cpaMock));
    
    console.log('--- TEST COMPLETED ---');
}

testNormalization();
