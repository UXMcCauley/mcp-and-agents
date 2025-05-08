// quickbooks-demo.js
// Demo script showing how to use QuickBooks with the MCP orchestrator

const { MCPOrchestrator } = require('./dist/mcp/orchestrator');
const { QuickBooksFinanceAgent } = require('./dist/agents/quickbooks-finance-agent');
const { NLPAgent } = require('./dist/agents/nlp-agent');

async function runQuickBooksDemo() {
    console.log('🎭 QuickBooks + MCP Demo\n');
    
    // Initialize orchestrator
    const orchestrator = new MCPOrchestrator();
    
    // Register agents
    orchestrator.registerAgent(new NLPAgent());
    orchestrator.registerAgent(new QuickBooksFinanceAgent());
    
    console.log('✅ Orchestrator initialized with agents\n');
    
    // Demo scenarios
    const scenarios = [
        {
            name: 'Quarterly Financial Analysis',
            input: 'Show me the Q1 2024 financial performance including revenue, expenses, and profit margins',
            expectedContext: {
                key: 'financial_request',
                value: {
                    type: 'quarterly_analysis',
                    year: 2024,
                    quarter: 1
                }
            }
        },
        {
            name: 'Recent Payments Report',
            input: 'Get all payments received in January 2024 and analyze them by payment method',
            expectedContext: {
                key: 'financial_request',
                value: {
                    type: 'payments_received',
                    startDate: '2024-01-01',
                    endDate: '2024-01-31'
                }
            }
        },
        {
            name: 'Full Year P&L Analysis',
            input: 'Generate a profit and loss report for the entire year 2024',
            expectedContext: {
                key: 'financial_request',
                value: {
                    type: 'profit_loss',
                    startDate: '2024-01-01',
                    endDate: '2024-12-31'
                }
            }
        }
    ];
    
    // Run each scenario
    for (const scenario of scenarios) {
        console.log(`\n🔍 Scenario: ${scenario.name}`);
        console.log(`📝 User Input: "${scenario.input}"\n`);
        
        try {
            // Create initial context from user input
            const initialContext = [
                {
                    key: 'user_input',
                    value: scenario.input,
                    confidence: 1.0,
                    source: 'user',
                    timestamp: new Date()
                }
            ];
            
            // Process through orchestrator
            await orchestrator.process(initialContext);
            
            // Get results from context store
            const store = orchestrator.getContextStore();
            const allItems = store.getAllItems();
            
            // Display results
            console.log('📊 Processing Results:');
            allItems.forEach(item => {
                if (item.key === 'financial_data') {
                    console.log(`  ✅ Financial Data Retrieved (${item.timestamp})`);
                    if (item.value.period) {
                        console.log(`     Period: ${item.value.period.startDate} to ${item.value.period.endDate}`);
                        console.log(`     Revenue: $${item.value.summary?.totalRevenue || 'N/A'}`);
                        console.log(`     Net Income: $${item.value.summary?.netIncome || 'N/A'}`);
                    }
                } else if (item.key === 'financial_analysis') {
                    console.log(`  📈 Analysis Generated (${item.timestamp})`);
                    if (item.value.overview) {
                        console.log(`     ${item.value.overview}`);
                    }
                    if (item.value.profitabilityAssessment) {
                        console.log(`     ${item.value.profitabilityAssessment}`);
                    }
                } else if (item.key === 'financial_report') {
                    console.log(`  📑 Report Generated (${item.timestamp})`);
                    if (item.value.title) {
                        console.log(`     ${item.value.title}`);
                    }
                    if (item.value.executiveSummary) {
                        console.log(`     Summary: ${item.value.executiveSummary}`);
                    }
                }
            });
            
            // Check if the expected context was created
            const expectedItem = store.get(scenario.expectedContext.key);
            if (expectedItem && expectedItem.value.type === scenario.expectedContext.value.type) {
                console.log(`\n  ✅ Scenario completed successfully!`);
            } else {
                console.log(`\n  ⚠️  Expected context not found. The NLP agent may need tuning.`);
            }
            
        } catch (error) {
            console.error(`\n  ❌ Error in scenario: ${error.message}`);
            console.error(`     Stack: ${error.stack}`);
        }
        
        console.log('\n' + '─'.repeat(60));
    }
    
    console.log('\n🎯 Demo Complete!\n');
    
    // Show tips for real usage
    console.log('💡 Tips for using QuickBooks with MCP:');
    console.log('   1. Ensure QB_ACCESS_TOKEN and QB_REFRESH_TOKEN are set');
    console.log('   2. The NLP agent will parse user queries into structured requests');
    console.log('   3. QuickBooks agent handles API calls and data transformation');
    console.log('   4. Context store maintains state between agent interactions');
    console.log('   5. Financial reports include automatic recommendations\n');
}

// Check environment before running
if (!process.env.QB_ACCESS_TOKEN || !process.env.QB_REALM_ID) {
    console.log('⚠️  Warning: QuickBooks tokens not configured in environment');
    console.log('   Set QB_ACCESS_TOKEN, QB_REFRESH_TOKEN, and QB_REALM_ID');
    console.log('   Demo will show structure but may fail API calls\n');
}

// Run the demo
runQuickBooksDemo().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});