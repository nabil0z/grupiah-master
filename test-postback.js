/**
 * Test Postback Handlers - Simulate OGAds/AdBlueMedia/CPAGrip postbacks
 * Usage: node test-postback.js [local|production]
 * 
 * Default: production (api.grupiah.online)
 */

const BASE = process.argv[2] === 'local' 
    ? 'http://127.0.0.1:53000' 
    : 'https://api.grupiah.online';

async function testPostback(provider, params) {
    const query = new URLSearchParams(params).toString();
    const url = `${BASE}/webhook/postback/${provider}?${query}`;
    
    console.log(`\n🔄 Testing ${provider.toUpperCase()} postback...`);
    console.log(`   URL: ${url}`);
    
    try {
        const res = await fetch(url);
        const text = await res.text();
        console.log(`   Status: ${res.status}`);
        console.log(`   Response: ${text}`);
        return { provider, status: res.status, body: text };
    } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
        return { provider, status: 'ERROR', body: err.message };
    }
}

async function main() {
    console.log(`\n📡 Testing postbacks against: ${BASE}\n`);

    // Test OGAds postback
    await testPostback('ogads', {
        aff_sub: 'test-user-id-123',
        payout: '0.50',
        offer_id: '99999',
        transaction_id: '1.2.3.4'  // Simulating {session_ip}
    });

    // Test AdBlueMedia postback  
    await testPostback('adbluemedia', {
        aff_sub: 'test-user-id-123',
        payout: '0.30',
        campaign_name: 'Test Campaign',
        transaction_id: 'lead_abc123'
    });

    // Test CPAGrip postback
    await testPostback('cpagrip', {
        tracking_id: 'test-user-id-123',
        payout: '0.40',
        offer_id: '88888',
        lead_id: 'lead_xyz456'
    });

    // Test Golden Goose postback
    await testPostback('goldengoose', {
        userId: 'test-user-id-123',
        payout: '1.20',
        txId: 'gg_test_789',
        secret: 'test_secret' // Optional
    });

    console.log('\n✅ All postback tests completed!\n');
    console.log('💡 Check server logs: pm2 logs grupiah-api --lines 30');
}

main();
