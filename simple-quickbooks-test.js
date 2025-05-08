// simple-quickbooks-test.js
// Simple test to check QuickBooks initialization

// Load environment variables manually
const fs = require('fs');
if (fs.existsSync('.env')) {
    const envContent = fs.readFileSync('.env', 'utf8');
    envContent.split('\n').forEach(line => {
        if (line.trim() && !line.startsWith('#')) {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        }
    });
}

async function testQuickBooksSetup() {
    console.log('🔍 Testing QuickBooks Basic Setup...\n');

    // Check environment variables
    const requiredVars = [
        'QB_CLIENT_ID',
        'QB_CLIENT_SECRET',
        'QB_ACCESS_TOKEN',
        'QB_REFRESH_TOKEN',
        'QB_REALM_ID'
    ];

    console.log('Environment Variables:');
    requiredVars.forEach(varName => {
        const value = process.env[varName];
        console.log(`  ${varName}: ${value ? '✅ Set' : '❌ Missing'}`);
    });

    console.log('\nQuickBooks Configuration:');
    try {
        // This require is intentional - we're testing the build output
        const { config } = require('./dist/config');
        console.log('  Config loaded:', config.quickbooks ? '✅' : '❌');
        if (config.quickbooks) {
            console.log(`    Client ID: ${config.quickbooks.clientId ? 'Set' : 'Missing'}`);
            console.log(`    Realm ID: ${config.quickbooks.realmId ? 'Set' : 'Missing'}`);
            console.log(`    Using Sandbox: ${config.quickbooks.useSandbox}`);
        }
    } catch (error) {
        console.log('  Config error:', error.message);
        console.log('\n❌ Config not accessible. Have you built the project?');
        console.log('   Run: npm run build');
        return;
    }

    console.log('\nQuickBooks Service Test:');
    try {
        const { quickbooksService } = require('./dist/services/quickbooks');
        console.log('  Service imported: ✅');

        // Test with a simple method call
        console.log('\nTesting getPaymentsReceived...');
        const payments = await quickbooksService.getPaymentsReceived('2024-01-01', '2024-01-31');
        console.log(`  Payments found: ${payments ? payments.length : 0}`);
        console.log('  Test completed: ✅');
    } catch (error) {
        console.log('  Service error:', error.message || 'An error occurred');
        console.log('\n❌ Service test failed');
        
        // Check for QuickBooks API errors
        if (error.fault?.error?.[0]?.code === '3202') {
            console.log('\n💡 API Response Issue:');
            console.log('   - Error code 3202 indicates a validation error');
            console.log('   - Your tokens might be expired or invalid');
            console.log('   - Try running: node refresh-tokens-manual.js');
        } else if (error.fault?.error?.[0]?.code === '5000') {
            console.log('\n💡 Authentication Issue:');
            console.log('   - Error code 5000 indicates authentication failure');
            console.log('   - Check your QB_CLIENT_ID and QB_CLIENT_SECRET');
        } else if (error.fault?.error?.[0]?.code === '610') {
            console.log('\n💡 Object Not Found:');
            console.log('   - The realm ID or object doesn\'t exist');
            console.log('   - Verify your QB_REALM_ID');
        } else {
            console.log('\nError details:', error);
        }
    }

    console.log('\n✨ Basic setup test complete!\n');
}

testQuickBooksSetup().catch(console.error);