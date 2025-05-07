import { defaultConfig } from './default';
import { productionConfig } from './production';

// Choose config based on environment
const environment = process.env.NODE_ENV || 'development';
const baseConfig = environment === 'production' ? productionConfig : defaultConfig;

// Override with environment variables
export const config = {
    ...baseConfig,
    port: parseInt(process.env.PORT || baseConfig.port.toString(), 10),
    mongoUri: process.env.MONGODB_URI || baseConfig.mongoUri,
    openaiApiKey: process.env.OPENAI_API_KEY || baseConfig.openaiApiKey,
    logLevel: process.env.LOG_LEVEL || baseConfig.logLevel
};