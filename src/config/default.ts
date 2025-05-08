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
    },
    quickbooks: {
        clientId: process.env.QB_CLIENT_ID || '',
        clientSecret: process.env.QB_CLIENT_SECRET || '',
        accessToken: process.env.QB_ACCESS_TOKEN || '',
        refreshToken: process.env.QB_REFRESH_TOKEN || '',
        realmId: process.env.QB_REALM_ID || '',
        expiresAt: parseInt(process.env.QB_EXPIRES_AT || '0'),
        useSandbox: process.env.QB_USE_SANDBOX === 'true',
        debug: process.env.QB_DEBUG === 'true'
    }
};