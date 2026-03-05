import { Hono } from 'hono';

const health = new Hono();

health.get('/', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '0.0.1',
  });
});

health.get('/ready', (c) => {
  // Check database connection
  // In production, check all dependencies
  return c.json({
    status: 'ready',
    checks: {
      database: 'ok',
      orchestrator: 'ok', // Stub
    },
  });
});

health.get('/live', (c) => {
  return c.json({ status: 'alive' });
});

export default health;