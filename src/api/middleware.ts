import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { logger } from '../services/logging';

// Basic authentication middleware
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'];

    // @ts-ignore
    if (!apiKey || apiKey !== config.apiKey) {
        logger.warn('Unauthorized API access attempt', {
            ip: req.ip,
            path: req.path
        });

        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or missing API key'
        });
    }

    next();
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Log request start
    logger.debug(`${req.method} ${req.path} started`, {
        query: req.query,
        ip: req.ip
    });

    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;

        logger.debug(`${req.method} ${req.path} completed in ${duration}ms`, {
            statusCode: res.statusCode
        });
    });

    next();
};

// Error handling middleware
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error:', err);

    res.status(500).json({
        error: 'Internal Server Error',
        message: config.environment === 'development' ? err.message : 'Something went wrong'
    });
};

// Rate limiting middleware

export const rateLimiter = rateLimit({
    // @ts-ignore
    windowMs: config.rateLimits?.windowMs || 15 * 60 * 1000, // 15 minutes
    // @ts-ignore
    max: config.rateLimits?.max || 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests',
        message: 'Please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Validate session ID middleware
export const validateSessionId = (req: Request, res: Response, next: NextFunction) => {
    const { sessionId } = req.params;

    if (!sessionId || !sessionId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
        return res.status(400).json({
            error: 'Invalid session ID',
            message: 'Session ID must be a valid UUID'
        });
    }

    next();
};

// Check content type middleware
export const requireJson = (req: Request, res: Response, next: NextFunction) => {
    if (!req.is('application/json')) {
        return res.status(415).json({
            error: 'Unsupported Media Type',
            message: 'Content-Type must be application/json'
        });
    }

    next();
};