import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { closeDatabase } from './db/index.js';
import { instances } from './db/index.js';
import { getConsoleWsUrl } from './services/orchestrator-client.js';

// Routes
import authRoutes from './routes/auth.js';
import instancesRoutes from './routes/instances.js';
import healthRoutes from './routes/health.js';
import statsRoutes from './routes/stats.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173', // Vite dev server
    'http://localhost:8787',
    'https://hyperclaw.io',
    'https://app.hyperclaw.io',
    'https://dashboard.hyperclaw.io',
  ],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Error handling
app.use('*', errorHandler);

// Health checks (no auth required)
app.route('/health', healthRoutes);

// Auth routes
app.route('/auth', authRoutes);

// Instance routes
app.route('/instances', instancesRoutes);

// Stats routes
app.route('/stats', statsRoutes);

// Terminal info endpoint (HTTP)
app.get('/instances/:id/terminal-info', async (c) => {
  const instanceId = c.req.param('id');
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return c.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, 401);
  }
  
  const inst = instances.findById(instanceId) as any;
  if (!inst) {
    return c.json({ error: 'Instance not found', code: 'NOT_FOUND' }, 404);
  }
  
  return c.json({
    instanceId,
    wsEndpoint: `/ws/instances/${instanceId}/terminal`,
    status: inst.status,
  });
});

// 404 handler
app.notFound(notFoundHandler);

// Startup
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

console.log(`🚀 HyperClaw API Server`);
console.log(`   Port: ${PORT}`);
console.log(`   Host: ${HOST}`);
console.log(`   Orchestrator: ${process.env.ORCHESTRATOR_URL || 'http://localhost:8080'}`);
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

// WebSocket proxy connections
// Maps client WebSocket -> orchestrator WebSocket
const proxyConnections = new Map<any, WebSocket>();

// Bun server with WebSocket support
const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  
  // HTTP requests go to Hono
  fetch(req, server) {
    const url = new URL(req.url);
    
    // WebSocket upgrade for terminal
    if (url.pathname.startsWith('/ws/instances/') && url.pathname.endsWith('/terminal')) {
      const parts = url.pathname.split('/');
      const instanceId = parts[3]; // /ws/instances/:id/terminal
      const token = url.searchParams.get('token') || req.headers.get('Authorization')?.replace('Bearer ', '');
      
      // TODO: Validate auth token
      // For now, just verify the instance exists
      const inst = instances.findById(instanceId);
      if (!inst) {
        return new Response('Instance not found', { status: 404 });
      }
      
      const upgraded = server.upgrade(req, { 
        data: { 
          instanceId,
          token,
        } 
      });
      if (upgraded) return undefined; // Bun handles it
      
      return new Response('WebSocket upgrade failed', { status: 500 });
    }
    
    return app.fetch(req, server);
  },
  
  websocket: {
    open(ws) {
      const instanceId = (ws.data as any)?.instanceId;
      console.log(`[WS] Client connected for instance ${instanceId}`);
      
      // Connect to orchestrator's WebSocket
      const orchestratorWsUrl = getConsoleWsUrl(instanceId);
      console.log(`[WS] Connecting to orchestrator: ${orchestratorWsUrl}`);
      
      try {
        const orchWs = new WebSocket(orchestratorWsUrl);
        
        // Store the proxy connection
        proxyConnections.set(ws, orchWs);
        
        // Forward messages from orchestrator to client
        orchWs.addEventListener('message', (event) => {
          try {
            if (typeof event.data === 'string') {
              ws.send(event.data);
            } else if (event.data instanceof ArrayBuffer) {
              ws.send(new Uint8Array(event.data));
            }
          } catch (err) {
            console.error(`[WS] Error forwarding to client:`, err);
          }
        });
        
        // Handle orchestrator connection close
        orchWs.addEventListener('close', () => {
          console.log(`[WS] Orchestrator connection closed for ${instanceId}`);
          try {
            ws.close();
          } catch {}
          proxyConnections.delete(ws);
        });
        
        // Handle orchestrator errors
        orchWs.addEventListener('error', (err) => {
          console.error(`[WS] Orchestrator error for ${instanceId}:`, err);
          ws.send(`[Gateway] Error connecting to instance console: ${err}`);
          try {
            ws.close();
          } catch {}
          proxyConnections.delete(ws);
        });
        
        // Send welcome when connected
        orchWs.addEventListener('open', () => {
          console.log(`[WS] Connected to orchestrator for ${instanceId}`);
        });
        
      } catch (err) {
        console.error(`[WS] Failed to connect to orchestrator:`, err);
        ws.send(`[Gateway] Failed to connect to orchestrator: ${err instanceof Error ? err.message : 'Unknown error'}`);
        ws.close();
      }
    },
    
    message(ws, message) {
      const instanceId = (ws.data as any)?.instanceId;
      const orchWs = proxyConnections.get(ws);
      
      if (!orchWs || orchWs.readyState !== WebSocket.OPEN) {
        console.log(`[WS] No orchestrator connection for ${instanceId}`);
        ws.send(`[Gateway] Not connected to instance. Please reconnect.`);
        return;
      }
      
      // Forward message to orchestrator
      try {
        if (typeof message === 'string') {
          orchWs.send(message);
        } else {
          orchWs.send(message);
        }
      } catch (err) {
        console.error(`[WS] Error forwarding to orchestrator:`, err);
      }
    },
    
    close(ws) {
      const instanceId = (ws.data as any)?.instanceId;
      console.log(`[WS] Client disconnected for instance ${instanceId}`);
      
      // Close orchestrator connection
      const orchWs = proxyConnections.get(ws);
      if (orchWs) {
        try {
          orchWs.close();
        } catch {}
        proxyConnections.delete(ws);
      }
    },
  },
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  closeDatabase();
  server.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  closeDatabase();
  server.stop();
  process.exit(0);
});

export default app;