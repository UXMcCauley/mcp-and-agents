import express from 'express';
import * as http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { MCPOrchestrator } from './mcp/orchestrator';
import { NLPAgent, BiasDetectionAgent, QuickBooksFinanceAgent } from './agents';
import { logger } from './services/logging';
import { config } from './config';
import { MCP } from './mcp/types';

// Initialize Express app
const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
    cors: {
        // @ts-ignore
        origin: config.corsOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Session storage for active connections
const sessions = new Map<string, MCPOrchestrator>();

// WebSocket connection handler
io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Create a new orchestrator for this connection
    const orchestrator = new MCPOrchestrator();
    orchestrator.registerAgent(new NLPAgent());
    orchestrator.registerAgent(new BiasDetectionAgent());
    orchestrator.registerAgent(new QuickBooksFinanceAgent());

    // Store in session map
    sessions.set(socket.id, orchestrator);

    // Handle real-time text analysis
    socket.on('analyze-text', async (data) => {
        try {
            const { text } = data;

            if (!text) {
                socket.emit('error', { message: 'Text is required' });
                return;
            }

            // Create initial context
            const initialContext: MCP.ContextItem[] = [
                {
                    key: 'user_input',
                    value: text,
                    confidence: 1.0,
                    source: 'user',
                    timestamp: new Date()
                }
            ];

            // Process through NLP and bias detection
            await orchestrator.process(initialContext);

            // Extract results
            const store = orchestrator.getContextStore();

            // Send results to client
            const results = {
                entities: store.get('entities')?.value,
                sentiment: store.get('sentiment')?.value,
                biasAnalysis: store.get('bias_analysis')?.value,
                biasDetected: store.has('bias_analysis')
            };

            socket.emit('analysis-results', results);
        } catch (error) {
            logger.error('WebSocket analyze-text error:', error);
            socket.emit('error', { message: 'Failed to analyze text' });
        }
    });

    // Handle QuickBooks financial analysis
    socket.on('analyze-financials', async (data) => {
        try {
            const { type, ...params } = data;

            if (!type) {
                socket.emit('error', { message: 'Financial request type is required' });
                return;
            }

            // Create initial context for financial request
            const initialContext: MCP.ContextItem[] = [
                {
                    key: 'financial_request',
                    value: { type, ...params },
                    confidence: 1.0,
                    source: 'user',
                    timestamp: new Date()
                }
            ];

            // Process through the orchestrator
            await orchestrator.process(initialContext);

            // Extract results
            const store = orchestrator.getContextStore();

            // Send financial results to client
            const results = {
                financialData: store.get('financial_data')?.value,
                analysis: store.get('financial_analysis')?.value,
                report: store.get('financial_report')?.value
            };

            socket.emit('financial-results', results);
        } catch (error) {
            logger.error('WebSocket analyze-financials error:', error);
            socket.emit('error', { message: 'Failed to analyze financials' });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
        sessions.delete(socket.id);
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Start server
// @ts-ignore
const PORT = config.websocketPort || 3001;
server.listen(PORT, () => {
    logger.info(`WebSocket server running on port ${PORT}`);
});

export default server;