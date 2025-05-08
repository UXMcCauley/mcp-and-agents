import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { MCPOrchestrator } from '../mcp/orchestrator';
import { PersistentContextStore } from '../mcp/persistent-store';
import { NLPAgent, BiasDetectionAgent, JobRequisiteAgent, ComplianceAgent, HRResponseAgent } from '../agents';
import { logger } from '../services/logging';
import { MCP } from '../mcp/types';
import {QuickBooksFinanceAgent} from "../agents/quickbooks-finance-agent";

// Session storage
// @ts-ignore
const sessions = new Map<string, MCPOrchestrator>();

// Process a candidate evaluation
export async function processEvaluation(req: Request, res: Response) {
    try {
        const { evaluation, jobDescription, sessionId } = req.body;

        if (!evaluation) {
            return res.status(400).json({ error: 'Evaluation text is required' });
        }

        // Get or create an orchestrator for this session
        let orchestrator = sessionId ? sessions.get(sessionId) : undefined;

        if (!orchestrator) {
            // Create a new session if none exists
            const newSessionId = sessionId || uuidv4();
            orchestrator = await createOrchestrator(newSessionId);
            sessions.set(newSessionId, orchestrator);
        }

        // Create initial context
        const initialContext: MCP.ContextItem[] = [
            {
                key: 'user_input',
                value: evaluation,
                confidence: 1.0,
                source: 'user',
                timestamp: new Date()
            }
        ];

        // Add a job description if provided
        if (jobDescription) {
            initialContext.push({
                key: 'job_description',
                value: jobDescription,
                confidence: 1.0,
                source: 'system',
                timestamp: new Date()
            });
        }

        // Process through the MCP
        await orchestrator.process(initialContext);

        // Extract results
        const store = orchestrator.getContextStore();

        // Build response with all relevant context items
        const results = {
            sessionId: sessionId || uuidv4(),
            revisedEvaluation: store.get('revised_evaluation')?.value,
            biasAnalysis: store.get('bias_analysis')?.value,
            biasDetected: store.has('bias_analysis'),
            mitigationSuggestions: store.get('bias_mitigation_suggestions')?.value,
            fairnessScore: store.get('fairness_score')?.value,
            legalRisks: store.get('legal_risks')?.value,
            entities: store.get('entities')?.value,
            sentiment: store.get('sentiment')?.value,
            intent: store.get('intent')?.value
        };

        res.json(results);
    } catch (error) {
        logger.error('Error processing evaluation:', error);
        res.status(500).json({ error: 'Failed to process evaluation' });
    }
}

// Analyze text for bias without job context
export async function analyzeText(req: Request, res: Response) {
    try {
        const { text, sessionId } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        // Get or create an orchestrator for this session
        let orchestrator = sessionId ? sessions.get(sessionId) : undefined;

        if (!orchestrator) {
            // Create a new session with just NLP and bias detection
            const newSessionId = sessionId || uuidv4();
            orchestrator = new MCPOrchestrator();
            orchestrator.registerAgent(new NLPAgent());
            orchestrator.registerAgent(new BiasDetectionAgent());
            sessions.set(newSessionId, orchestrator);
        }

        // Create initial context
        const initialContext: MCP.ContextItem[] = [
            {
                key: 'user_input',
                value: text,
                confidence: 1.0,
                source: 'user',
                timestamp: new Date()
            }
        ];

        // Process through the MCP
        await orchestrator.process(initialContext);

        // Extract results
        const store = orchestrator.getContextStore();

        // Build response
        const results = {
            sessionId: sessionId || uuidv4(),
            entities: store.get('entities')?.value,
            sentiment: store.get('sentiment')?.value,
            intent: store.get('intent')?.value,
            biasAnalysis: store.get('bias_analysis')?.value,
            biasDetected: store.has('bias_analysis'),
            mitigationSuggestions: store.get('bias_mitigation_suggestions')?.value
        };

        res.json(results);
    } catch (error) {
        logger.error('Error analyzing text:', error);
        res.status(500).json({ error: 'Failed to analyze text' });
    }
}

// Create a new session
export async function createSession(req: Request, res: Response) {
    try {
        const sessionId = uuidv4();
        const orchestrator = await createOrchestrator(sessionId);

        sessions.set(sessionId, orchestrator);

        res.json({ sessionId });
    } catch (error) {
        logger.error('Error creating session:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
}

// Get session state
export async function getSession(req: Request, res: Response) {
    try {
        const { sessionId } = req.params;

        const orchestrator = sessions.get(sessionId);

        if (!orchestrator) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const store = orchestrator.getContextStore();

        // Build response with session info
        const sessionInfo = {
            sessionId,
            contextKeys: store.getAllKeys(),
            hasAnalysis: store.has('bias_analysis')
        };

        res.json(sessionInfo);
    } catch (error) {
        logger.error('Error getting session:', error);
        res.status(500).json({ error: 'Failed to get session' });
    }
}

// List available agents
export function listAgents(req: Request, res: Response) {
    // This would be dynamic in a real implementation
    const agents = [
        {
            id: 'nlp-agent',
            name: 'Natural Language Processing Agent',
            description: 'Analyzes text for entities, sentiment, and intent',
            enabled: true
        },
        {
            id: 'bias-detection-agent',
            name: 'Bias Detection Agent',
            description: 'Detects and flags potential biases in content',
            enabled: true
        },
        {
            id: 'job-requisite-agent',
            name: 'Job Requisite Agent',
            description: 'Identifies job requirements and skills from context',
            enabled: true
        },
        {
            id: 'compliance-agent',
            name: 'Compliance Agent',
            description: 'Ensures evaluations comply with employment laws',
            enabled: true
        },
        {
            id: 'hr-response-agent',
            name: 'HR Response Agent',
            description: 'Generates bias-free HR responses',
            enabled: true
        }
    ];

    res.json(agents);
}

// Toggle agent enabled state
export function toggleAgent(req: Request, res: Response) {
    // This would modify agent configuration in a real implementation
    res.json({ success: true });
}

// Helper to create a fully configured orchestrator
// @ts-ignore
async function createOrchestrator(sessionId: string): Promise<MCPOrchestrator> {
    try {
        // Create a persistent store for this session
        const store = new PersistentContextStore(sessionId);
        await store.connect();

        // Create an orchestrator with this store
        // @ts-ignore
        const orchestrator = new MCPOrchestrator(store);

        // Register all agents
        orchestrator.registerAgent(new NLPAgent());
        orchestrator.registerAgent(new BiasDetectionAgent());
        orchestrator.registerAgent(new JobRequisiteAgent());
        orchestrator.registerAgent(new ComplianceAgent());
        orchestrator.registerAgent(new HRResponseAgent());

        return orchestrator;
    } catch (error) {
        logger.error('Error creating orchestrator:', error);

        // Fallback to in-memory orchestrator if the database connection fails
        const orchestrator = new MCPOrchestrator();

        orchestrator.registerAgent(new NLPAgent());
        orchestrator.registerAgent(new BiasDetectionAgent());
        orchestrator.registerAgent(new JobRequisiteAgent());
        orchestrator.registerAgent(new ComplianceAgent());
        orchestrator.registerAgent(new HRResponseAgent());

        return orchestrator;
    }
}

// src/api/controllers.ts (add new methods)

// Quarterly financial analysis
export async function quarterlyAnalysis(req: Request, res: Response) {
    try {
        const { year, quarter, sessionId } = req.body;
        
        logger.info('Quarterly analysis request received', { year, quarter, sessionId });

        if (!year || !quarter) {
            return res.status(400).json({ error: 'Year and quarter are required' });
        }

        // Get or create an orchestrator for this session
        let orchestrator = sessionId ? sessions.get(sessionId) : undefined;

        if (!orchestrator) {
            // Create a new session with the QuickBooks agent
            const newSessionId = sessionId || uuidv4();
            logger.info('Creating new orchestrator with QuickBooks agent', { sessionId: newSessionId });
            
            orchestrator = new MCPOrchestrator();
            orchestrator.registerAgent(new QuickBooksFinanceAgent());
            sessions.set(newSessionId, orchestrator);
            
            logger.info('QuickBooks agent registered');
        }

        // Create initial context
        const initialContext: MCP.ContextItem[] = [
            {
                key: 'financial_request',
                value: {
                    type: 'quarterly_analysis',
                    year: parseInt(year),
                    quarter: parseInt(quarter)
                },
                confidence: 1.0,
                source: 'user',
                timestamp: new Date()
            }
        ];
        
        logger.info('Initial context created', { initialContext });

        // Process through the MCP
        logger.info('Processing through orchestrator...');
        await orchestrator.process(initialContext);
        logger.info('Orchestrator processing complete');

        // Extract results
        const store = orchestrator.getContextStore();
        
        // Log all context keys that are available
        const allKeys = store.getAllKeys();
        logger.info('Available context keys after processing', { keys: allKeys });
        
        // Check each expected key
        const financialData = store.get('financial_data');
        const financialAnalysis = store.get('financial_analysis');
        const financialReport = store.get('financial_report');
        
        logger.info('Context store contents', {
            has_financial_data: !!financialData,
            has_financial_analysis: !!financialAnalysis,
            has_financial_report: !!financialReport,
            financial_data_value: financialData?.value,
            financial_analysis_value: financialAnalysis?.value,
            financial_report_value: financialReport?.value
        });

        // Build response
        const results = {
            sessionId: sessionId || uuidv4(),
            data: financialData?.value,
            analysis: financialAnalysis?.value,
            report: financialReport?.value,
            debug: {
                availableKeys: allKeys,
                hasData: !!financialData,
                hasAnalysis: !!financialAnalysis,
                hasReport: !!financialReport
            }
        };
        
        logger.info('Sending response', { results });
        res.json(results);
    } catch (error) {
        logger.error('Error processing quarterly analysis:', error);
        res.status(500).json({ error: 'Failed to process quarterly analysis', details: error instanceof Error ? error.message : 'Unknown error' });
    }
}

// Payments analysis
export async function paymentsAnalysis(req: Request, res: Response) {
    try {
        const { startDate, endDate, sessionId } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        // Get or create an orchestrator for this session
        let orchestrator = sessionId ? sessions.get(sessionId) : undefined;

        if (!orchestrator) {
            // Create a new session with the QuickBooks agent
            const newSessionId = sessionId || uuidv4();
            orchestrator = new MCPOrchestrator();
            orchestrator.registerAgent(new QuickBooksFinanceAgent());
            sessions.set(newSessionId, orchestrator);
        }

        // Create initial context
        const initialContext: MCP.ContextItem[] = [
            {
                key: 'financial_request',
                value: {
                    type: 'payments_received',
                    startDate,
                    endDate
                },
                confidence: 1.0,
                source: 'user',
                timestamp: new Date()
            }
        ];

        // Process through the MCP
        await orchestrator.process(initialContext);

        // Extract results
        const store = orchestrator.getContextStore();

        // Build response
        const results = {
            sessionId: sessionId || uuidv4(),
            data: store.get('financial_data')?.value,
            analysis: store.get('financial_analysis')?.value
        };

        res.json(results);
    } catch (error) {
        logger.error('Error processing payments analysis:', error);
        res.status(500).json({ error: 'Failed to process payments analysis' });
    }
}

// Profit and loss analysis
export async function profitLossAnalysis(req: Request, res: Response) {
    try {
        const { startDate, endDate, sessionId } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        // Get or create an orchestrator for this session
        let orchestrator = sessionId ? sessions.get(sessionId) : undefined;

        if (!orchestrator) {
            // Create a new session with the QuickBooks agent
            const newSessionId = sessionId || uuidv4();
            orchestrator = new MCPOrchestrator();
            orchestrator.registerAgent(new QuickBooksFinanceAgent());
            sessions.set(newSessionId, orchestrator);
        }

        // Create initial context
        const initialContext: MCP.ContextItem[] = [
            {
                key: 'financial_request',
                value: {
                    type: 'profit_loss',
                    startDate,
                    endDate
                },
                confidence: 1.0,
                source: 'user',
                timestamp: new Date()
            }
        ];

        // Process through the MCP
        await orchestrator.process(initialContext);

        // Extract results
        const store = orchestrator.getContextStore();

        // Build response
        const results = {
            sessionId: sessionId || uuidv4(),
            data: store.get('financial_data')?.value,
            analysis: store.get('financial_analysis')?.value
        };

        res.json(results);
    } catch (error) {
        logger.error('Error processing profit and loss analysis:', error);
        res.status(500).json({ error: 'Failed to process profit and loss analysis' });
    }
}