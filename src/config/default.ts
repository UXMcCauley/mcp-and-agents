export const defaultConfig = {
    port: 3000,
    environment: 'development',
    logLevel: 'info',
    mongoUri: 'mongodb://localhost:27017/mcp',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: 'gpt-4', // or 'gpt-3.5-turbo' for faster but less accurate results
    maxTokens: 8000,
    sessionTtl: 60 * 60 * 1000, // 1 hour in milliseconds
    agents: {
        nlp: { enabled: true },
        biasDetection: { enabled: true },
        jobRequisite: { enabled: true },
        compliance: { enabled: true },
        hrResponse: { enabled: true }
    }
};