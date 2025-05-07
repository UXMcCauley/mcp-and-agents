import { Collection } from 'mongodb';
import { db } from './index';
import { logger } from '../services/logging';
import { MCP } from '../mcp/types';

// Session model
export interface Session {
    sessionId: string;
    created: Date;
    lastAccessed: Date;
    metadata?: Record<string, any>;
}

// Models for database operations
export class SessionModel {
    private static collection(): Collection<Session> {
        return db.getDb().collection('sessions');
    }

    // Create a new session
    static async create(sessionId: string, metadata?: Record<string, any>): Promise<Session> {
        const now = new Date();

        const session: Session = {
            sessionId,
            created: now,
            lastAccessed: now,
            metadata
        };

        await this.collection().insertOne(session);

        return session;
    }

    // Get a session by ID
    static async getById(sessionId: string): Promise<Session | null> {
        return this.collection().findOne({ sessionId });
    }

    // Update last accessed time
    static async updateLastAccessed(sessionId: string): Promise<void> {
        await this.collection().updateOne(
            { sessionId },
            { $set: { lastAccessed: new Date() } }
        );
    }

    // Delete a session
    static async delete(sessionId: string): Promise<boolean> {
        const result = await this.collection().deleteOne({ sessionId });
        return result.deletedCount === 1;
    }

    // Get all sessions
    static async getAll(): Promise<Session[]> {
        return this.collection().find().toArray();
    }

    // Cleanup old sessions
    static async cleanupOldSessions(olderThan: Date): Promise<number> {
        const result = await this.collection().deleteMany({
            lastAccessed: { $lt: olderThan }
        });

        return result.deletedCount || 0;
    }
}

// Context item model
export interface ContextItemModel extends Omit<MCP.ContextItem, 'timestamp'> {
    sessionId: string;
    timestamp: string; // ISO string
}

// Models for context items
export class ContextItemModel {
    private static collection(): Collection<ContextItemModel> {
        return db.getDb().collection('context_items');
    }

    // Save a context item
    static async save(sessionId: string, item: MCP.ContextItem): Promise<void> {
        const dbItem: ContextItemModel = {
            ...item,
            sessionId,
            timestamp: item.timestamp.toISOString()
        };

        await this.collection().updateOne(
            { sessionId, key: item.key },
            { $set: dbItem },
            { upsert: true }
        );
    }

    // Get all context items for a session
    static async getAllForSession(sessionId: string): Promise<MCP.ContextItem[]> {
        const items = await this.collection().find({ sessionId }).toArray();

        return items.map(item => ({
            ...item,
            timestamp: new Date(item.timestamp)
        }));
    }

    // Delete all context items for a session
    static async deleteAllForSession(sessionId: string): Promise<number> {
        const result = await this.collection().deleteMany({ sessionId });
        return result.deletedCount || 0;
    }
}

// History item model
export interface HistoryItemModel extends Omit<MCP.ContextItem, 'timestamp'> {
    sessionId: string;
    timestamp: string; // ISO string
    version: number;
}

// Models for history items
export class HistoryItemModel {
    private static collection(): Collection<HistoryItemModel> {
        return db.getDb().collection('history_items');
    }

    // Save a history item
    static async save(sessionId: string, item: MCP.ContextItem): Promise<void> {
        // Get current version
        const currentVersion = await this.getCurrentVersion(sessionId, item.key);

        const dbItem: HistoryItemModel = {
            ...item,
            sessionId,
            timestamp: item.timestamp.toISOString(),
            version: currentVersion + 1
        };

        await this.collection().insertOne(dbItem);
    }

    // Get history for a context item
    static async getHistory(sessionId: string, key: string): Promise<MCP.ContextItem[]> {
        const items = this.collection().find({sessionId, key})
            .sort({version: 1})
            .toArray();

        // @ts-ignore
        return items.map((item: { timestamp: string | number | Date; }) => ({
            ...item,
            timestamp: new Date(item.timestamp)
        }));
    }

    // Get the current version number
    private static async getCurrentVersion(sessionId: string, key: string): Promise<number> {
        const latestItem = await this.collection().findOne(
            { sessionId, key },
            { sort: { version: -1 } }
        );

        return latestItem?.version || 0;
    }
}