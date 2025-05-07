import { MCP } from './types';
import { MCPContextStore } from './context-store';
import { logger } from '../services/logging';

export class MCPOrchestrator {
    private agents: Map<MCP.AgentID, MCP.Agent> = new Map();
    private contextStore: MCPContextStore;
    private processingQueue: Set<MCP.AgentID> = new Set();
    private maxIterations = 10; // Prevent infinite loops

    constructor(contextStore?: MCPContextStore) {
        this.contextStore = contextStore || new MCPContextStore();
    }

    registerAgent(agent: MCP.Agent): void {
        // Validate agent
        if (this.agents.has(agent.id)) {
            throw new Error(`Agent with ID ${agent.id} already registered`);
        }

        this.agents.set(agent.id, agent);
        logger.info(`Registered agent: ${agent.name} (${agent.id})`);
    }

    // Get all agents that can process the current context state
    private getEligibleAgents(): MCP.Agent[] {
        const currentKeys = this.contextStore.getAllKeys();

        return Array.from(this.agents.values()).filter(agent => {
            // Agent is eligible if at least one of its consumed keys is available
            // and it's not already in the processing queue
            return agent.consumesContext.some(key => currentKeys.includes(key)) &&
                !this.processingQueue.has(agent.id);
        });
    }

    // Process context operations returned by an agent
    private async processOperations(
        operations: MCP.ContextOperation[],
        sourceAgent: MCP.AgentID
    ): Promise<string[]> {
        const affectedKeys: string[] = [];

        for (const op of operations) {
            try {
                switch (op.type) {
                    case 'add':
                        this.contextStore.add(op.item);
                        affectedKeys.push(op.item.key);
                        break;

                    case 'update':
                        this.contextStore.update(op.key, op.value, op.confidence);
                        affectedKeys.push(op.key);
                        break;

                    case 'delete':
                        this.contextStore.delete(op.key);
                        affectedKeys.push(op.key);
                        break;

                    case 'merge':
                        this.contextStore.merge(op.items);
                        affectedKeys.push(...op.items.map(item => item.key));
                        break;

                    case 'snapshot':
                        this.contextStore.createSnapshot(op.id);
                        break;
                }
            } catch (error) {
                logger.error(`Error processing operation from agent ${sourceAgent}:`, error);
                // Continue with other operations
            }
        }

        return affectedKeys;
    }

    // Run a single iteration of the agent processing loop
    private async runIteration(): Promise<boolean> {
        const eligibleAgents = this.getEligibleAgents();

        if (eligibleAgents.length === 0) {
            return false; // No more agents to process
        }

        let madeProgress = false;

        // Process each eligible agent
        for (const agent of eligibleAgents) {
            // Mark as processing to prevent concurrent execution
            this.processingQueue.add(agent.id);

            try {
                logger.debug(`Processing agent: ${agent.name} (${agent.id})`);

                // Process the current context
                const operations = await agent.process(this.contextStore);

                // If agent produced operations, we made progress
                if (operations.length > 0) {
                    madeProgress = true;
                    await this.processOperations(operations, agent.id);
                    logger.debug(`Agent ${agent.id} produced ${operations.length} operations`);
                } else {
                    logger.debug(`Agent ${agent.id} produced no operations`);
                }
            } catch (error) {
                logger.error(`Error processing agent ${agent.id}:`, error);
            } finally {
                // Mark as done processing
                this.processingQueue.delete(agent.id);
            }
        }

        return madeProgress;
    }

    // Main entry point to process context through all agents
    async process(initialContext: MCP.ContextItem[]): Promise<MCP.ContextStore> {
        // Reset processing state
        this.processingQueue.clear();

        logger.info(`Starting MCP processing with ${initialContext.length} initial context items`);

        // Add initial context
        this.contextStore.merge(initialContext);

        // Process until no more progress or max iterations reached
        let iterations = 0;
        let madeProgress = true;

        while (madeProgress && iterations < this.maxIterations) {
            madeProgress = await this.runIteration();
            iterations++;

            logger.debug(`Completed iteration ${iterations}, made progress: ${madeProgress}`);
        }

        if (iterations >= this.maxIterations) {
            logger.warn('Reached maximum iterations, processing halted');
        } else {
            logger.info(`Processing complete after ${iterations} iterations`);
        }

        return this.contextStore;
    }

    // Get the current context store
    getContextStore(): MCP.ContextStore {
        return this.contextStore;
    }
}