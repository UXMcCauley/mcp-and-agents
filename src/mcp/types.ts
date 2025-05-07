// Core types for the Model Context Protocol
export namespace MCP {
    // The fundamental unit of shared knowledge
    export interface ContextItem<T = any> {
        key: string;           // Unique identifier for this piece of context
        value: T;              // The actual data
        confidence: number;    // 0-1 score of reliability
        source: AgentID;       // Which agent produced this?
        timestamp: Date;       // When this was added/updated
        reasoning?: string;    // Optional explanation of how this was derived
        parentContextKeys?: string[]; // What context was used to derive this
    }

    // Type alias for agent identifiers
    export type AgentID = string;

    // Typing for context operations
    export type ContextOperation =
        | { type: 'add'; item: ContextItem }
        | { type: 'update'; key: string; value: any; confidence?: number }
        | { type: 'delete'; key: string }
        | { type: 'merge'; items: ContextItem[] }
        | { type: 'snapshot'; id: string };

    // Primary interfaces that agents must implement
    export interface Agent {
        id: AgentID;
        name: string;
        description: string;
        capabilities: string[];

        // Core processing method that receives context and returns operations
        process(context: ReadonlyContextStore): Promise<ContextOperation[]>;

        // Define what context keys this agent can consume
        consumesContext: string[];

        // Define what context keys this agent can produce
        producesContext: string[];
    }

    // Context store interface
    export interface ReadonlyContextStore {
        get<T>(key: string): ContextItem<T> | undefined;
        getBySource(source: AgentID): ContextItem[];
        getByConfidence(minConfidence: number): ContextItem[];
        has(key: string): boolean;
        getAllKeys(): string[];
        getHistory(key: string): ContextItem[];
    }

    // Mutable extension of the context store
    export interface ContextStore extends ReadonlyContextStore {
        add<T>(item: ContextItem<T>): void;
        update<T>(key: string, value: T, confidence?: number): void;
        delete(key: string): void;
        merge(items: ContextItem[]): void;
        createSnapshot(id: string): string;
        restoreSnapshot(id: string): boolean;
    }
}