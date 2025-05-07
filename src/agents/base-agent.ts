import { MCP } from '../mcp/types';
import { logger } from '../services/logging';

export abstract class BaseAgent implements MCP.Agent {
    abstract id: MCP.AgentID;
    abstract name: string;
    abstract description: string;
    abstract capabilities: string[];
    abstract consumesContext: string[];
    abstract producesContext: string[];

    /**
     * Process the current context and return operations
     */
    abstract process(context: MCP.ReadonlyContextStore): Promise<MCP.ContextOperation[]>;

    /**
     * Helper method to create an 'add' operation
     */
    protected createAddOperation<T>(
        key: string,
        value: T,
        confidence: number,
        reasoning: string,
        parentContextKeys: string[]
    ): MCP.ContextOperation {
        return {
            type: 'add',
            item: {
                key,
                value,
                confidence,
                source: this.id,
                timestamp: new Date(),
                reasoning,
                parentContextKeys
            }
        };
    }

    /**
     * Helper method to create an 'update' operation
     */
    protected createUpdateOperation<T>(
        key: string,
        value: T,
        confidence?: number
    ): MCP.ContextOperation {
        return {
            type: 'update',
            key,
            value,
            confidence
        };
    }

    /**
     * Helper method to log agent activity
     */
    protected log(level: 'info' | 'debug' | 'warn' | 'error', message: string, data?: any): void {
        const agentPrefix = `[${this.id}]`;
        if (data) {
            logger[level](`${agentPrefix} ${message}`, data);
        } else {
            logger[level](`${agentPrefix} ${message}`);
        }
    }
}