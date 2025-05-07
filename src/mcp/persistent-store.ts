import { MongoClient, Db, Collection } from 'mongodb';
import { MCP } from './types';
import { logger } from '../services/logging';
import { config } from '../config';

export class PersistentContextStore implements MCP.ContextStore {
    private items: Map<string, MCP.ContextItem> = new Map();
    private history: Map<string, MCP.ContextItem[]> = new Map();
    private snapshots: Map<string, Map<string, MCP.ContextItem>> = new Map();
    private db?: Db;
    private collection?: Collection;
    private historyCollection?: Collection;
    private snapshotCollection?: Collection;
    private readonly sessionId: string;
    private connected = false;

    constructor(sessionId: string) {
        this.sessionId = sessionId;
    }

    async connect(uri: string = config.mongoUri): Promise<void> {
        try {
            const client = new MongoClient(uri);
            await client.connect();

            this.db = client.db('mcp-database');
            this.collection = this.db.collection('context-items');
            this.historyCollection = this.db.collection('history-items');
            this.snapshotCollection = this.db.collection('snapshots');

            this.connected = true;

            // Create indexes for better query performance
            await this.collection.createIndex({ sessionId: 1, key: 1 }, { unique: true });
            await this.historyCollection.createIndex({ sessionId: 1, key: 1 });
            await this.snapshotCollection.createIndex({ sessionId: 1, id: 1 }, { unique: true });

            // Load existing context for this session
            await this.loadContext();

            logger.info(`Connected to MongoDB for session ${this.sessionId}`);
        } catch (error) {
            logger.error('Failed to connect to MongoDB:', error);
            throw new Error('Database connection failed');
        }
    }

    private async loadContext(): Promise<void> {
        if (!this.connected || !this.collection || !this.historyCollection) {
            throw new Error('Not connected to database');
        }

        try {
            // Load context items
            const contextItems = await this.collection.find({
                sessionId: this.sessionId
            }).toArray();

            for (const item of contextItems) {
                // Convert a stored document to ContextItem
                const contextItem: MCP.ContextItem = {
                    key: item.key,
                    value: item.value,
                    confidence: item.confidence,
                    source: item.source,
                    timestamp: new Date(item.timestamp),
                    reasoning: item.reasoning,
                    parentContextKeys: item.parentContextKeys
                };

                this.items.set(item.key, contextItem);
            }

            // Load history
            for (const key of Array.from(this.items.keys())) {
                const historyItems = this.historyCollection.find({
                    sessionId: this.sessionId,
                    key: key
                }).sort({timestamp: 1}).toArray();

                // @ts-ignore
                this.history.set(key, historyItems.map((item: { key: any; value: any; confidence: any; source: any; timestamp: string | number | Date; reasoning: any; parentContextKeys: any; }) => ({
                    key: item.key,
                    value: item.value,
                    confidence: item.confidence,
                    source: item.source,
                    timestamp: new Date(item.timestamp),
                    reasoning: item.reasoning,
                    parentContextKeys: item.parentContextKeys
                })));
            }

            // Load snapshots
            if (!this.snapshotCollection || this.snapshotCollection.collectionName !== 'snapshots') {
                throw new Error('Snapshot collection is not initialized');
            }
            const snapshots = await this.snapshotCollection.find({
                sessionId: this.sessionId
            }).toArray();

            for (const snapshot of snapshots) {
                this.snapshots.set(snapshot.id, new Map(
                    Object.entries(snapshot.items).map(([k, v]) => [k, v as MCP.ContextItem])
                ));
            }

            logger.info(`Loaded ${this.items.size} context items, ${this.history.size} history entries, and ${this.snapshots.size} snapshots`);
        } catch (error) {
            logger.error('Failed to load context:', error);
            throw new Error('Failed to load context from database');
        }
    }

    // ReadonlyContextStore implementation
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

    // Mutable ContextStore implementation
    async add<T>(item: MCP.ContextItem<T>): Promise<void> {
        if (!this.connected || !this.collection || !this.historyCollection) {
            throw new Error('Not connected to database');
        }

        // Don't allow overwriting with add - use update instead
        if (this.items.has(item.key)) {
            throw new Error(`Context key ${item.key} already exists. Use update instead.`);
        }

        try {
            // Add to in-memory store
            this.items.set(item.key, item as MCP.ContextItem);

            // Initialize history if needed
            if (!this.history.has(item.key)) {
                this.history.set(item.key, []);
            }

            // Add to history
            this.history.get(item.key)!.push({...item as MCP.ContextItem});

            // Persist to a database
            await this.collection.updateOne(
                { sessionId: this.sessionId, key: item.key },
                { $set: {
                        ...item,
                        sessionId: this.sessionId,
                        timestamp: item.timestamp.toISOString()
                    }},
                { upsert: true }
            );

            // Persist to a history collection
            await this.historyCollection.insertOne({
                ...item,
                sessionId: this.sessionId,
                timestamp: item.timestamp.toISOString()
            });

            logger.debug(`Added context item: ${item.key}`);
        } catch (error) {
            logger.error(`Failed to add context item ${item.key}:`, error);
            throw new Error(`Failed to add context item ${item.key}`);
        }
    }

    async update<T>(key: string, value: T, confidence?: number): Promise<void> {
        if (!this.connected || !this.collection || !this.historyCollection) {
            throw new Error('Not connected to database');
        }

        const item = this.items.get(key);

        if (!item) {
            throw new Error(`Cannot update non-existent context key: ${key}`);
        }

        try {
            // Create an updated item
            const updatedItem: MCP.ContextItem = {
                ...item,
                value,
                confidence: confidence !== undefined ? confidence : item.confidence,
                timestamp: new Date()
            };

            // Update in-memory store
            this.items.set(key, updatedItem);

            // Add to history
            this.history.get(key)!.push({...updatedItem});

            // Update in database
            await this.collection.updateOne(
                { sessionId: this.sessionId, key },
                { $set: {
                        value,
                        confidence: updatedItem.confidence,
                        timestamp: updatedItem.timestamp.toISOString()
                    }}
            );

            // Add to a history collection
            await this.historyCollection.insertOne({
                ...updatedItem,
                sessionId: this.sessionId,
                timestamp: updatedItem.timestamp.toISOString()
            });

            logger.debug(`Updated context item: ${key}`);
        } catch (error) {
            logger.error(`Failed to update context item ${key}:`, error);
            throw new Error(`Failed to update context item ${key}`);
        }
    }

    async delete(key: string): Promise<void> {
        if (!this.connected || !this.collection) {
            throw new Error('Not connected to database');
        }

        if (!this.items.has(key)) {
            return; // No-op if key doesn't exist
        }

        try {
            // Remove from the in-memory store
            this.items.delete(key);

            // Remove from database
            await this.collection.deleteOne({ sessionId: this.sessionId, key });

            // Note: We keep the history

            logger.debug(`Deleted context item: ${key}`);
        } catch (error) {
            logger.error(`Failed to delete context item ${key}:`, error);
            throw new Error(`Failed to delete context item ${key}`);
        }
    }

    async merge(items: MCP.ContextItem[]): Promise<void> {
        for (const item of items) {
            if (this.items.has(item.key)) {
                await this.update(item.key, item.value, item.confidence);
            } else {
                await this.add(item);
            }
        }
    }

    createSnapshot(id: string): string {
        if (!this.connected || !this.snapshotCollection) {
            throw new Error('Not connected to database');
        }

        try {
            // Create an in-memory snapshot
            const itemsObj: Record<string, MCP.ContextItem> = {};

            for (const entry of Array.from(this.items.entries())) {
                const [key, value] = entry;
                itemsObj[key] = JSON.parse(JSON.stringify(value));
            }

            this.snapshots.set(id, new Map(this.items));

            // Persist to a database
            this.snapshotCollection.updateOne(
                { sessionId: this.sessionId, id },
                { $set: {
                        sessionId: this.sessionId,
                        id,
                        items: itemsObj,
                        created: new Date().toISOString()
                    }},
                { upsert: true }
            );

            logger.debug(`Created snapshot: ${id}`);

            return id;
        } catch (error) {
            logger.error(`Failed to create snapshot ${id}:`, error);
            throw new Error(`Failed to create snapshot ${id}`);
        }
    }

    restoreSnapshot(id: string): boolean {
        if (!this.connected || !this.collection || !this.snapshotCollection) {
            throw new Error('Not connected to database');
        }

        try {
            // Try to get from in-memory first
            let snapshot = this.snapshots.get(id);

            // If not in memory, try to load from a database
            if (!snapshot) {
                // @ts-ignore
                const snapshotDoc = this.snapshotCollection.findOneSync({
                    sessionId: this.sessionId,
                    id
                });

                if (!snapshotDoc) {
                    return false;
                }

                // Convert to Map
                snapshot = new Map(
                    Object.entries(snapshotDoc.items).map(([k, v]) => [k, v as MCP.ContextItem])
                );

                // Cache in memory
                this.snapshots.set(id, snapshot);
            }

            // Replace current items with a snapshot
            this.items = new Map(snapshot);

            // Update a database to match snapshot
            // First, delete all current items
            // @ts-ignore
            this.collection.deleteManySync({ sessionId: this.sessionId });

            // Then, insert all snapshot items
            const bulkOps = Array.from(snapshot.entries()).map(([key, item]) => ({
                updateOne: {
                    filter: { sessionId: this.sessionId, key },
                    update: { $set: { ...item, sessionId: this.sessionId } },
                    upsert: true
                }
            }));

            if (bulkOps.length > 0) {
                // @ts-ignore
                this.collection.bulkWriteSync(bulkOps);
            }

            logger.info(`Restored snapshot: ${id}`);

            return true;
        } catch (error) {
            logger.error(`Failed to restore snapshot ${id}:`, error);
            throw new Error(`Failed to restore snapshot ${id}`);
        }
    }
}