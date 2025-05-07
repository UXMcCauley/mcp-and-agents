import { defaultConfig } from './default';

// Production environment configuration overrides
export const productionConfig = {
    ...defaultConfig,
    environment: 'production',
    port: 8080,
    logLevel: 'info',
    mongoUri: 'mongodb://mongodb:27017/mcp', // Docker Compose service name
    openaiModel: 'gpt-4', // Use the most capable model in production
    corsOrigins: ['https://your-production-domain.com'],
    maxIterations: 15, // Allow more processing iterations in production
    sessionTtl: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    useCache: true, // Enable caching in production
    rateLimits: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // Limit each IP to 100 requests per windowMs
    }
};