// refresh-and-update.js
import axios from 'axios';
import fs from 'fs';
import 'dotenv/config';

async function refreshAndUpdateTokens() {
    const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: process.env.QB_REFRESH_TOKEN
    });

    const auth = Buffer.from(
        `${process.env.QB_CLIENT_ID}:${process.env.QB_CLIENT_SECRET}`
    ).toString('base64');

    try {
        console.log('Refreshing tokens...');
        const response = await axios.post(tokenUrl, params, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        // Read current .env
        let envContent = fs.readFileSync('.env', 'utf8');

        // Update tokens in .env content
        envContent = envContent.replace(/QB_ACCESS_TOKEN=.*/m, `QB_ACCESS_TOKEN=${response.data.access_token}`);
        envContent = envContent.replace(/QB_REFRESH_TOKEN=.*/m, `QB_REFRESH_TOKEN=${response.data.refresh_token}`);
        envContent = envContent.replace(/QB_EXPIRES_AT=.*/m, `QB_EXPIRES_AT=${Math.floor(Date.now() / 1000) + response.data.expires_in}`);

        // Write back to .env
        fs.writeFileSync('.env', envContent);

        console.log('✅ Tokens refreshed and updated in .env file');
        console.log('New expiration:', new Date((Math.floor(Date.now() / 1000) + response.data.expires_in) * 1000));

    } catch (error) {
        console.error('Failed to refresh tokens:', error.response?.data || error.message);
    }
}

refreshAndUpdateTokens();