import express from 'express';
import cors from 'cors';
import { json } from 'body-parser';
import { config } from './config';
import { logger } from './services/logging';
// import { metricsMiddleware } from './services/metrics';
import { apiRoutes } from './api/routes';

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(json({ limit: '10mb' }));
// app.use(metricsMiddleware);

// API routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req: any, res: express.Response) => {
    res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: config.environment === 'development' ? err.message : 'Something went wrong'
    });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
    logger.info(`MCP Server running on port ${PORT} in ${config.environment} mode`);
});

export default app;