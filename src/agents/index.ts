import { BaseAgent } from './base-agent';
import { NLPAgent } from './nlp-agent';
import { BiasDetectionAgent } from './bias-detection-agent';
import { JobRequisiteAgent } from './job-requisite-agent';
import { ComplianceAgent } from './compliance-agent';
import { HRResponseAgent } from './hr-response-agent';

// Re-export all agents
export {
    BaseAgent,
    NLPAgent,
    BiasDetectionAgent,
    JobRequisiteAgent,
    ComplianceAgent,
    HRResponseAgent
};

// Factory function to create an agent by ID
export function createAgent(agentId: string): BaseAgent {
    switch (agentId) {
        case 'nlp-agent':
            return new NLPAgent();
        case 'bias-detection-agent':
            return new BiasDetectionAgent();
        case 'job-requisite-agent':
            return new JobRequisiteAgent();
        case 'compliance-agent':
            return new ComplianceAgent();
        case 'hr-response-agent':
            return new HRResponseAgent();
        default:
            throw new Error(`Unknown agent ID: ${agentId}`);
    }
}

// Get a list of all available agent types
export function getAvailableAgents() {
    return [
        {
            id: 'nlp-agent',
            name: 'Natural Language Processing Agent',
            description: 'Analyzes text for entities, sentiment, and intent'
        },
        {
            id: 'bias-detection-agent',
            name: 'Bias Detection Agent',
            description: 'Detects and flags potential biases in content'
        },
        {
            id: 'job-requisite-agent',
            name: 'Job Requisite Agent',
            description: 'Identifies job requirements and skills from context'
        },
        {
            id: 'compliance-agent',
            name: 'Compliance Agent',
            description: 'Ensures evaluations comply with employment laws'
        },
        {
            id: 'hr-response-agent',
            name: 'HR Response Agent',
            description: 'Generates bias-free HR responses'
        }
    ];
}