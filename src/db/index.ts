import { MongoClient, Db } from 'mongodb';
import { logger } from '../services/logging';
import { config } from '../config';

// Database connection singleton
class Database {
    private static instance: Database;
    private client: MongoClient | null = null;
    private db: Db | null = null;
    private isConnected = false;

    private constructor() {}

    // Get singleton instance
    public static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database();
        }

        return Database.instance;
    }

    // Connect to MongoDB
    public async connect(): Promise<void> {
        if (this.isConnected) {
            return; // Already connected
        }

        try {
            this.client = new MongoClient(config.mongoUri);
            await this.client.connect();

            this.db = this.client.db();
            this.isConnected = true;

            logger.info('Connected to MongoDB');

            // Create indexes
            await this.createIndexes();
        } catch (error) {
            logger.error('Failed to connect to MongoDB:', error);
            throw new Error('Database connection failed');
        }
    }

    // Disconnect from MongoDB
    public async disconnect(): Promise<void> {
        if (!this.isConnected || !this.client) {
            return; // Not connected
        }

        try {
            await this.client.close();

            this.client = null;
            this.db = null;
            this.isConnected = false;

            logger.info('Disconnected from MongoDB');
        } catch (error) {
            logger.error('Failed to disconnect from MongoDB:', error);
            throw new Error('Database disconnection failed');
        }
    }

    // Get database instance
    public getDb(): Db {
        if (!this.isConnected || !this.db) {
            throw new Error('Not connected to database');
        }

        return this.db;
    }

    // Check connection status
    public isConnectedToDb(): boolean {
        return this.isConnected;
    }

    // Create database indexes
    private async createIndexes(): Promise<void> {
        if (!this.isConnected || !this.db) {
            return; // Not connected
        }

        try {
            // Sessions collection
            await this.db.collection('sessions').createIndex({ sessionId: 1 }, { unique: true });

            // Context items collection
            await this.db.collection('context_items').createIndex({ sessionId: 1, key: 1 }, { unique: true });

            // History collection
            await this.db.collection('history_items').createIndex({ sessionId: 1, key: 1 });

            // Snapshots collection
            await this.db.collection('snapshots').createIndex({ sessionId: 1, id: 1 }, { unique: true });

            logger.info('Database indexes created');
        } catch (error) {
            logger.error('Failed to create database indexes:', error);
        }
    }
}

// Export singleton instance
export const db = Database.getInstance();