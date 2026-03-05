import { Hono } from 'hono';
import { getDatabase } from '../db/index.js';

const stats = new Hono();

// GET /stats - Get platform statistics
stats.get('/', async (c) => {
  const db = getDatabase();
  
  try {
    // Get instance counts by status
    const instanceStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'stopped' THEN 1 ELSE 0 END) as stopped,
        SUM(allocated_ram_gb) as total_ram_gb,
        SUM(ttl_seconds) as total_ttl_seconds
      FROM instances
    `).get() as {
      total: number;
      running: number;
      pending: number;
      stopped: number;
      total_ram_gb: number;
      total_ttl_seconds: number;
    };
    
    // Get user count
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    
    // Calculate usage hours (sum of time instances have been running)
    // For now, use ttl_seconds as an approximation
    const usageHours = Math.round((instanceStats.total_ttl_seconds || 0) / 3600);
    
    // Mock cost calculation (would come from billing system in production)
    // Assuming $0.10 per GB-hour
    const monthlyCost = Math.round((instanceStats.total_ram_gb || 0) * usageHours * 0.1 * 100) / 100;
    
    // Get instances per model
    const instancesByModel = db.prepare(`
      SELECT model, COUNT(*) as count
      FROM instances
      GROUP BY model
      ORDER BY count DESC
    `).all() as { model: string; count: number }[];
    
    return c.json({
      instances: {
        total: instanceStats.total || 0,
        running: instanceStats.running || 0,
        pending: instanceStats.pending || 0,
        stopped: instanceStats.stopped || 0,
      },
      users: {
        total: userCount.count || 0,
      },
      resources: {
        totalRamGb: instanceStats.total_ram_gb || 0,
        byModel: instancesByModel,
      },
      usage: {
        hours: usageHours,
        monthlyCost: monthlyCost,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return c.json({ error: 'Failed to fetch statistics' }, 500);
  }
});

// GET /stats/user - Get user-specific statistics (requires auth)
stats.get('/user', async (c) => {
  const authUser = c.get('user');
  if (!authUser) {
    return c.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, 401);
  }
  
  const db = getDatabase();
  
  try {
    // Get user instance counts
    const instanceStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'stopped' THEN 1 ELSE 0 END) as stopped,
        SUM(allocated_ram_gb) as total_ram_gb,
        SUM(ttl_seconds) as total_ttl_seconds
      FROM instances
      WHERE user_id = $userId
    `).get({ $userId: authUser.id }) as {
      total: number;
      running: number;
      pending: number;
      stopped: number;
      total_ram_gb: number;
      total_ttl_seconds: number;
    };
    
    // Calculate usage hours
    const usageHours = Math.round((instanceStats.total_ttl_seconds || 0) / 3600);
    
    // Get user's plan
    const userPlan = authUser.plan || 'free';
    
    // Cost calculation based on plan
    const planRates: Record<string, number> = {
      free: 0,
      pro: 0.05,
      enterprise: 0.03,
    };
    const rate = planRates[userPlan] || 0.1;
    const monthlyCost = Math.round((instanceStats.total_ram_gb || 0) * usageHours * rate * 100) / 100;
    
    // Get user's instances by model
    const instancesByModel = db.prepare(`
      SELECT model, COUNT(*) as count
      FROM instances
      WHERE user_id = $userId
      GROUP BY model
      ORDER BY count DESC
    `).all({ $userId: authUser.id }) as { model: string; count: number }[];
    
    return c.json({
      instances: {
        total: instanceStats.total || 0,
        running: instanceStats.running || 0,
        pending: instanceStats.pending || 0,
        stopped: instanceStats.stopped || 0,
      },
      resources: {
        totalRamGb: instanceStats.total_ram_gb || 0,
        byModel: instancesByModel,
      },
      usage: {
        hours: usageHours,
        monthlyCost: monthlyCost,
      },
      plan: {
        name: userPlan,
        ratePerGbHour: rate,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return c.json({ error: 'Failed to fetch user statistics' }, 500);
  }
});

export default stats;