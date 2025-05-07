import winston from 'winston';
import { config } from '../config';

// Configure winston logger
const logger = winston.createLogger({
    level: config.logLevel,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'mcp-server' },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, ...rest }) => {
                    const restString = Object.keys(rest).length ?
                        `\n${JSON.stringify(rest, null, 2)}` : '';
                    return `${timestamp} ${level}: ${message}${restString}`;
                })
            )
        })
    ]
});

// Add file transport in production
if (config.environment === 'production') {
    logger.add(new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error'
    }));
    logger.add(new winston.transports.File({
        filename: 'logs/combined.log'
    }));
}

export { logger };