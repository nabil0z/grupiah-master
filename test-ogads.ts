import * as dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

async function testOGAds() {
    console.log('Testing OGAds with API Key:', process.env.OGADS_API_KEY);
    try {
        const queryParams = new URLSearchParams({
            ip: '8.8.8.8',
            user_agent: 'Mozilla/5.0',
            aff_sub: 'test-user-123'
        }).toString();

        console.log('Sending URL: https://confirmapp.online/api/v2?' + queryParams);
        const response = await axios.get('https://confirmapp.online/api/v2?' + queryParams, {
            headers: { 'Authorization': 'Bearer ' + process.env.OGADS_API_KEY }
        });
        console.log('Status:', response.status);
        if (response.data.offers) {
            console.log('Offers count:', response.data.offers.length);
        } else {
            console.log('No offers array in response:', response.data);
        }
    } catch (e: any) {
        if (e.response) {
            console.error('Error Status:', e.response.status);
            console.error('Error Data:', e.response.data);
        } else {
            console.error('Error Message:', e.message);
        }
    }
}
testOGAds();
