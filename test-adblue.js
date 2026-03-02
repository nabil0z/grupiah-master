const https = require('https');
require('dotenv').config({ path: './.env' });

const url = `https://api.adbluemedia.com/v2/offers?user_id=${process.env.ADBLUEMEDIA_USER_ID}&api_key=${process.env.ADBLUEMEDIA_API_KEY}&ip=114.124.237.151&user_agent=Mozilla/5.0`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.offers && json.offers.length > 0) {
                console.log(JSON.stringify(json.offers[0], null, 2));
            } else {
                console.log(json);
            }
        } catch (e) { console.error('Parse error:', e) }
    });
}).on('error', (e) => console.error(e));
