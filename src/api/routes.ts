import { Router } from 'express';
import * as controllers from './controllers';

const router = Router();

// MCP endpoints
router.post('/process-evaluation', controllers.processEvaluation);
router.post('/analyze-text', controllers.analyzeText);
router.post('/create-session', controllers.createSession);
router.get('/sessions/:sessionId', controllers.getSession);

// QuickBooks financial endpoints
router.post('/financial/quarterly-analysis', controllers.quarterlyAnalysis);
router.post('/financial/payments', controllers.paymentsAnalysis);
router.post('/financial/profit-loss', controllers.profitLossAnalysis);

// Agent management
router.get('/agents', controllers.listAgents);
router.post('/agents/:agentId/toggle', controllers.toggleAgent);

export const apiRoutes = router;