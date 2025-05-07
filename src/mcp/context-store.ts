import { MCP } from './types';

export class MCPContextStore implements MCP.ContextStore {
    private items: Map<string, MCP.ContextItem> = new Map();
    private history: Map<string, MCP.ContextItem[]> = new Map();
    private snapshots: Map<string, Map<string, MCP.ContextItem>> = new Map();

    // Read methods
    get<T>(key: string): MCP.ContextItem<T> | undefined {
        return this.items.get(key) as MCP.ContextItem<T> | undefined;
    }

    getBySource(source: MCP.AgentID): MCP.ContextItem[] {
        return Array.from(this.items.values()).filter(item => item.source === source);
    }

    getByConfidence(minConfidence: number): MCP.ContextItem[] {
        return Array.from(this.items.values())
            .filter(item => item.confidence >= minConfidence);
    }

    has(key: string): boolean {
        return this.items.has(key);
    }

    getAllKeys(): string[] {
        return Array.from(this.items.keys());
    }

    getHistory(key: string): MCP.ContextItem[] {
        return this.history.get(key) || [];
    }

    // Write methods
    add<T>(item: MCP.ContextItem<T>): void {
        // Don't allow overwrites with add - use update for that
        if (this.items.has(item.key)) {
            throw new Error(`Context key ${item.key} already exists. Use update instead.`);
        }

        // Add to store
        this.items.set(item.key, item);

        // Initialize history if needed
        if (!this.history.has(item.key)) {
            this.history.set(item.key, []);
        }

        // Add to history
        this.history.get(item.key)!.push({...item}); // Copy to prevent mutation
    }

    update<T>(key: string, value: T, confidence?: number): void {
        const item = this.items.get(key);

        if (!item) {
            throw new Error(`Cannot update non-existent context key: ${key}`);
        }

        // Create updated item
        const updatedItem: MCP.ContextItem = {
            ...item,
            value,
            confidence: confidence !== undefined ? confidence : item.confidence,
            timestamp: new Date()
        };

        // Update in store
        this.items.set(key, updatedItem);

        // Add to history
        this.history.get(key)!.push({...updatedItem}); // Copy to prevent mutation
    }

    delete(key: string): void {
        if (!this.items.has(key)) {
            return; // No-op if key doesn't exist
        }

        // Remove from store but keep history
        this.items.delete(key);
    }

    merge(items: MCP.ContextItem[]): void {
        for (const item of items) {
            if (this.items.has(item.key)) {
                this.update(item.key, item.value, item.confidence);
            } else {
                this.add(item);
            }
        }
    }

    createSnapshot(id: string): string {
        // Deep copy the current items
        const snapshot = new Map(
            Array.from(this.items.entries()).map(
                ([k, v]) => [k, JSON.parse(JSON.stringify(v))]
            )
        );

        this.snapshots.set(id, snapshot);
        return id;
    }

    restoreSnapshot(id: string): boolean {
        const snapshot = this.snapshots.get(id);

        if (!snapshot) {
            return false;
        }

        // Replace current items with snapshot
        this.items = new Map(snapshot);
        return true;
    }
}