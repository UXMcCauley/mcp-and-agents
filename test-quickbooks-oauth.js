// test-quickbooks-oauth.js
// Script to test and refresh QuickBooks OAuth tokens

const QuickBooks = require('node-quickbooks');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function testQuickBooksOAuth() {
    console.log('🔐 QuickBooks OAuth Token Test\n');

    // Check current environment variables
    const config = {
        clientId: process.env.QB_CLIENT_ID,
        clientSecret: process.env.QB_CLIENT_SECRET,
        accessToken: process.env.QB_ACCESS_TOKEN,
        refreshToken: process.env.QB_REFRESH_TOKEN,
        realmId: process.env.QB_REALM_ID,
        useSandbox: process.env.QB_USE_SANDBOX === 'true',
        expiresAt: process.env.QB_EXPIRES_AT
    };

    console.log('Current Configuration:');
    console.log('  Client ID:', config.clientId ? '✓ Set' : '✗ Missing');
    console.log('  Client Secret:', config.clientSecret ? '✓ Set' : '✗ Missing');
    console.log('  Access Token:', config.accessToken ? '✓ Set' : '✗ Missing');
    console.log('  Refresh Token:', config.refreshToken ? '✓ Set' : '✗ Missing');
    console.log('  Realm ID:', config.realmId ? '✓ Set' : '✗ Missing');
    console.log('  Using Sandbox:', config.useSandbox);
    console.log('  Expires At:', config.expiresAt || 'Not set\n');

    // Check if tokens are expired or missing
    if (!config.accessToken || !config.refreshToken) {
        console.log('\n❌ Missing tokens! You need to get new OAuth tokens.\n');
        
        // Option 1: Manual token entry
        const enterManually = await askQuestion('Do you want to enter tokens manually? (y/n): ');
        
        if (enterManually.toLowerCase() === 'y') {
            const newAccessToken = await askQuestion('Enter Access Token: ');
            const newRefreshToken = await askQuestion('Enter Refresh Token: ');
            const newRealmId = await askQuestion('Enter Realm/Company ID: ');
            const newExpiresAt = await askQuestion('Enter Expires At (Unix timestamp): ');
            
            console.log('\n📝 Add these to your .env file:');
            console.log(`QB_ACCESS_TOKEN="${newAccessToken}"`);
            console.log(`QB_REFRESH_TOKEN="${newRefreshToken}"`);
            console.log(`QB_REALM_ID="${newRealmId}"`);
            console.log(`QB_EXPIRES_AT="${newExpiresAt}"`);
            
            process.exit(0);
        }
    }

    // Option 2: Test current tokens and refresh if needed
    if (config.accessToken && config.refreshToken) {
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = parseInt(config.expiresAt) || now;
        
        if (expiresAt < now + 3600) { // If expiring within 1 hour
            console.log('\n⏰ Tokens are expiring soon. Attempting to refresh...');
            
            try {
                QuickBooks.setOauthVersion('2.0', config.useSandbox);
                const qbo = new QuickBooks(
                    config.clientId,
                    config.clientSecret,
                    config.accessToken,
                    undefined,
                    config.realmId,
                    config.useSandbox,
                    false,
                    60,
                    '2.0',
                    config.refreshToken
                );

                // Test a simple API call
                console.log('  Testing current tokens...');
                try {
                    await new Promise((resolve, reject) => {
                        qbo.getCompanyInfo(config.realmId, (err, companyInfo) => {
                            if (err) reject(err);
                            else resolve(companyInfo);
                        });
                    });
                    console.log('  ✅ Current tokens work!\n');
                } catch (error) {
                    console.log('  ❌ Current tokens failed. Error:', error.message);
                    console.log('  Attempting to refresh tokens...\n');
                    
                    // Refresh tokens
                    const refreshResult = await new Promise((resolve, reject) => {
                        qbo.refreshAccessToken((err, refreshedTokens) => {
                            if (err) reject(err);
                            else resolve(refreshedTokens);
                        });
                    });

                    console.log('✅ Tokens refreshed successfully!\n');
                    console.log('📝 Update your .env file with these new tokens:');
                    console.log(`QB_ACCESS_TOKEN="${refreshResult.access_token}"`);
                    console.log(`QB_REFRESH_TOKEN="${refreshResult.refresh_token}"`);
                    console.log(`QB_EXPIRES_AT="${Math.floor(Date.now() / 1000) + refreshResult.expires_in}"`);
                }
            } catch (error) {
                console.log('\n❌ Token refresh failed:', error.message);
                console.log('You may need to re-authenticate with QuickBooks.\n');
            }
        } else {
            console.log('\n✅ Tokens are still valid!\n');
            
            // Test with a simple API call
            try {
                QuickBooks.setOauthVersion('2.0', config.useSandbox);
                const qbo = new QuickBooks(
                    config.clientId,
                    config.clientSecret,
                    config.accessToken,
                    undefined,
                    config.realmId,
                    config.useSandbox,
                    false,
                    60,
                    '2.0',
                    config.refreshToken
                );

                console.log('🔍 Testing QuickBooks connection...');
                
                const companyInfo = await new Promise((resolve, reject) => {
                    qbo.getCompanyInfo(config.realmId, (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    });
                });

                console.log('✅ Successfully connected to QuickBooks!');
                console.log(`  Company: ${companyInfo.CompanyInfo.CompanyName}`);
                console.log(`  Country: ${companyInfo.CompanyInfo.Country}`);
                console.log(`  Legal Name: ${companyInfo.CompanyInfo.LegalName}\n`);

                // Try a simple query
                console.log('💰 Testing payments query...');
                
                const payments = await new Promise((resolve, reject) => {
                    qbo.findPayments({
                        query: "TxnDate >= '2024-01-01'",
                        limit: 5
                    }, (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    });
                });

                const paymentCount = payments?.QueryResponse?.Payment?.length || 0;
                console.log(`✅ Found ${paymentCount} recent payments\n`);

            } catch (error) {
                console.log(`❌ API test failed: ${error.message}`);
                console.log('Your tokens may be invalid or permissions may be limited.\n');
            }
        }
    }

    console.log('🏁 OAuth test complete!');
    rl.close();
}

// Run the test
testQuickBooksOAuth().catch(error => {
    console.error('Fatal error:', error);
    console.error('Stack:', error.stack);
    rl.close();
    process.exit(1);
});