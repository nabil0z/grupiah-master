require('dotenv').config();
const { OGAdsAdapter } = require('./packages/provider-adapters/dist/adapters/ogads.adapter.js');

async function run() {
    const adapter = new OGAdsAdapter();
    console.log('Testing Adapter Fetch...');
    const result = await adapter.fetchTasks('test-user', '8.8.8.8', 'Mozilla/5.0');
    console.log('Adapter Result Count:', result.length);
    if (result.length > 0) {
        console.log('Sample Task:', result[0]);
    }
}
run().catch(console.error);
