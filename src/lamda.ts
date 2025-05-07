import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { MCPOrchestrator } from './mcp/orchestrator';
import { NLPAgent } from './agents';
import { BiasDetectionAgent } from './agents';
import { JobRequisiteAgent } from './agents';
import { ComplianceAgent } from './agents';
import { HRResponseAgent } from './agents';
import { logger } from './services/logging';
import { MCP } from './mcp/types';

// Initialize the orchestrator with agents
const orchestrator = new MCPOrchestrator();
orchestrator.registerAgent(new NLPAgent());
orchestrator.registerAgent(new BiasDetectionAgent());
orchestrator.registerAgent(new JobRequisiteAgent());
orchestrator.registerAgent(new ComplianceAgent());
orchestrator.registerAgent(new HRResponseAgent());

/**
 * AWS Lambda handler for processing MCP requests
 */
export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        // Parse request body
        const body = JSON.parse(event.body || '{}');
        const { evaluation, jobDescription } = body;

        if (!evaluation) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Evaluation text is required' })
            };
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

        // Add job description if provided
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

        return {
            statusCode: 200,
            body: JSON.stringify(results)
        };
    } catch (error) {
        logger.error('Lambda handler error:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};