import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { users, sessions } from '../db/index.js';
import { generateId, generateToken, hashPassword, verifyPassword } from '../utils/crypto.js';
import { registerSchema, loginSchema } from '../utils/validation.js';
import { ConflictError, ValidationError } from '../middleware/error.js';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';

const auth = new Hono();

// Session cookie config
const SESSION_COOKIE = 'session_token';
const SESSION_TTL_DAYS = 7;
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Lax' as const,
  path: '/',
  maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
};

// Register new user
auth.post('/register', async (c) => {
  const body = await c.req.json();
  const result = registerSchema.safeParse(body);
  
  if (!result.success) {
    throw new ValidationError(result.error.errors);
  }

  const { email, password, name } = result.data;

  // Check if user already exists
  const existingUser = users.findByEmail(email);
  if (existingUser) {
    throw new ConflictError('Email already registered');
  }

  // Create user
  const userId = generateId();
  const passwordHash = hashPassword(password);
  
  users.create(userId, email, passwordHash, 'free');

  // Create session
  const sessionId = generateId();
  const sessionToken = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  
  sessions.create(sessionId, userId, sessionToken, expiresAt);

  // Set cookie and return user
  setCookie(c, SESSION_COOKIE, sessionToken, COOKIE_OPTIONS);
  
  return c.json({
    success: true,
    user: {
      id: userId,
      email,
      plan: 'free',
    },
    sessionToken, // Also return in body for API clients
  });
});

// Login
auth.post('/login', async (c) => {
  const body = await c.req.json();
  const result = loginSchema.safeParse(body);
  
  if (!result.success) {
    throw new ValidationError(result.error.errors);
  }

  const { email, password } = result.data;

  // Find user
  const user = users.findByEmail(email) as any;
  if (!user) {
    return c.json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }, 401);
  }

  // Verify password
  if (!verifyPassword(password, user.password_hash)) {
    return c.json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }, 401);
  }

  // Create session
  const sessionId = generateId();
  const sessionToken = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  
  sessions.create(sessionId, user.id, sessionToken, expiresAt);

  setCookie(c, SESSION_COOKIE, sessionToken, COOKIE_OPTIONS);
  
  return c.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      plan: user.plan,
    },
    sessionToken,
  });
});

// Logout
auth.post('/logout', authMiddleware, async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '') 
    || c.cookie('session_token');
  
  if (token) {
    sessions.deleteByToken(token);
  }
  
  deleteCookie(c, SESSION_COOKIE);
  
  return c.json({ success: true });
});

// Get current session
auth.get('/session', authMiddleware, (c) => {
  const user = getAuthUser(c);
  
  return c.json({
    user: {
      id: user.id,
      email: user.email,
      plan: user.plan,
    },
  });
});

export default auth;