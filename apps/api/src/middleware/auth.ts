import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { sessions, users } from '../db/index.js';

export interface AuthUser {
  id: string;
  email: string;
  plan: string;
  stripeCustomerId?: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '') 
    || getCookie(c, 'session_token');

  if (!token) {
    return c.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, 401);
  }

  const session = sessions.findByToken(token);
  if (!session) {
    return c.json({ error: 'Invalid or expired session', code: 'SESSION_INVALID' }, 401);
  }

  // Set user in context
  c.set('user', {
    id: (session as any).user_id,
    email: (session as any).email,
    plan: (session as any).plan,
    stripeCustomerId: (session as any).stripe_customer_id,
  });

  await next();
}

export function requirePlan(allowedPlans: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!user || !allowedPlans.includes(user.plan)) {
      return c.json({ 
        error: 'Plan upgrade required', 
        code: 'PLAN_UPGRADE_REQUIRED',
        requiredPlans: allowedPlans 
      }, 403);
    }
    await next();
  };
}

export function getAuthUser(c: Context): AuthUser {
  return c.get('user');
}