// test-quickbooks-manual.js
// Manual script to test QuickBooks integration

const { QuickBooksFinanceAgent } = require('./dist/agents/quickbooks-finance-agent');
const { ContextStore } = require('./dist/mcp/context-store');

async function testQuickBooksIntegration() {
    console.log('🚀 Starting QuickBooks Integration Test...\n');

    try {
        // Initialize agent and context store
        const agent = new QuickBooksFinanceAgent();
        const contextStore = new ContextStore();

        console.log('✅ Agent and ContextStore initialized\n');

        // Test 1: Quarterly Analysis
        console.log('📊 Test 1: Quarterly Analysis...');
        const quarterlyRequest = {
            key: 'financial_request',
            value: {
                type: 'quarterly_analysis',
                year: 2024,
                quarter: 1
            },
            confidence: 1.0,
            source: 'test',
            timestamp: new Date()
        };

        await contextStore.add(quarterlyRequest);
        console.log('   Added quarterly analysis request to context');

        try {
            const operations = await agent.process(contextStore);
            console.log(`   ✅ Quarterly analysis returned ${operations.length} operations`);
            
            operations.forEach((op, i) => {
                console.log(`   Operation ${i + 1}: ${op.operation} - ${op.item.key}`);
            });
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }

        // Test 2: Payments Received
        console.log('\n💰 Test 2: Payments Received...');
        const paymentsRequest = {
            key: 'financial_request',
            value: {
                type: 'payments_received',
                startDate: '2024-01-01',
                endDate: '2024-01-31'
            },
            confidence: 1.0,
            source: 'test',
            timestamp: new Date()
        };

        // Clear previous context and add new request
        await contextStore.clear();
        await contextStore.add(paymentsRequest);
        console.log('   Added payments request to context');

        try {
            const operations = await agent.process(contextStore);
            console.log(`   ✅ Payments analysis returned ${operations.length} operations`);
            
            operations.forEach((op, i) => {
                console.log(`   Operation ${i + 1}: ${op.operation} - ${op.item.key}`);
            });
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }

        // Test 3: Profit & Loss
        console.log('\n📈 Test 3: Profit & Loss Report...');
        const profitLossRequest = {
            key: 'financial_request',
            value: {
                type: 'profit_loss',
                startDate: '2024-01-01',
                endDate: '2024-12-31'
            },
            confidence: 1.0,
            source: 'test',
            timestamp: new Date()
        };

        // Clear previous context and add new request
        await contextStore.clear();
        await contextStore.add(profitLossRequest);
        console.log('   Added profit & loss request to context');

        try {
            const operations = await agent.process(contextStore);
            console.log(`   ✅ P&L analysis returned ${operations.length} operations`);
            
            operations.forEach((op, i) => {
                console.log(`   Operation ${i + 1}: ${op.operation} - ${op.item.key}`);
            });
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }

        console.log('\n✨ QuickBooks Integration Test Complete!\n');

    } catch (error) {
        console.error('\n💥 Fatal Error:', error);
        console.error('Stack:', error.stack);
    }
}

// Check if we have required environment variables
console.log('🔍 Checking QuickBooks Configuration...');
const requiredEnvVars = ['QB_CLIENT_ID', 'QB_CLIENT_SECRET', 'QB_ACCESS_TOKEN', 'QB_REALM_ID'];
const missingVars = [];

requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        missingVars.push(varName);
    }
});

if (missingVars.length > 0) {
    console.log('⚠️  Warning: Missing QuickBooks environment variables:');
    missingVars.forEach(varName => console.log(`   - ${varName}`));
    console.log('\nThis test will likely fail. Please set these variables and try again.\n');
} else {
    console.log('✅ All QuickBooks environment variables are set\n');
}

// Run the test
testQuickBooksIntegration().catch(console.error);