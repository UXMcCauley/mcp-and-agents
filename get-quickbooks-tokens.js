#!/usr/bin/env node
// get-quickbooks-tokens.js
// Helper script to get QuickBooks OAuth tokens

const readline = require('readline');
const QuickBooks = require('node-quickbooks');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function getTokens() {
    console.log('🔐 QuickBooks Token Generator\n');
    
    // Get client credentials
    const clientId = await new Promise(resolve => rl.question('Enter your QuickBooks Client ID: ', resolve));
    const clientSecret = await new Promise(resolve => rl.question('Enter your QuickBooks Client Secret: ', resolve));
    
    console.log('\n📝 To get your tokens, you need to complete the OAuth flow:');
    console.log('\n1. Go to your QuickBooks Developer Dashboard');
    console.log('2. Open your app');
    console.log('3. Go to the "Keys & OAuth" tab');
    console.log('4. Click "Test in Sandbox" or use the OAuth Playground');
    console.log('5. Complete the authorization flow');
    console.log('6. Copy the tokens from the response\n');
    
    // Ask for manual token entry
    console.log('After completing the OAuth flow, paste your tokens here:\n');
    
    const accessToken = await new Promise(resolve => rl.question('Access Token: ', resolve));
    const refreshToken = await new Promise(resolve => rl.question('Refresh Token: ', resolve));
    const realmId = await new Promise(resolve => rl.question('Realm/Company ID: ', resolve));
    
    // Calculate expiration (usually 3600 seconds / 1 hour)
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    
    console.log('\n✨ Success! Add these to your .env file:\n');
    console.log('QB_CLIENT_ID=' + clientId);
    console.log('QB_CLIENT_SECRET=' + clientSecret);
    console.log('QB_ACCESS_TOKEN=' + accessToken);
    console.log('QB_REFRESH_TOKEN=' + refreshToken);
    console.log('QB_REALM_ID=' + realmId);
    console.log('QB_EXPIRES_AT=' + expiresAt);
    console.log('QB_USE_SANDBOX=true');
    console.log('QB_DEBUG=false');
    
    console.log('\n📋 Copy the above lines to your .env file and you\'re ready to go!\n');
    
    rl.close();
}

getTokens().catch(console.error);