import { Context } from 'hono';
import { getNeonClient } from '../db/connection';
import fs from 'fs';
import path from 'path';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  expiresAt: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'auth_sessions.json');
const USERS_FILE = path.join(DATA_DIR, 'auth_users.json');

function ensureAuthDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getLocalUsers(): any[] {
  ensureAuthDir();
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveLocalUsers(users: any[]) {
  ensureAuthDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

function getLocalSessions(): any[] {
  ensureAuthDir();
  if (!fs.existsSync(SESSIONS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveLocalSessions(sessions: any[]) {
  ensureAuthDir();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
}

/**
 * Gets the deployed Neon Auth Base URL from environment or configuration
 */
export function getNeonAuthBaseUrl(): string {
  if (process.env.NEON_AUTH_BASE_URL) {
    return process.env.NEON_AUTH_BASE_URL.replace(/\/$/, '');
  }
  if (process.env.NEON_AUTH_JWKS_URL) {
    return process.env.NEON_AUTH_JWKS_URL.replace(/\/\.well-known\/jwks\.json$/, '');
  }
  return 'https://ep-sweet-paper-b36cwgg2.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth';
}

/**
 * Extracts session token from Authorization header or cookies
 */
export function extractToken(c: Context): string | null {
  const authHeader = c.req.header('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  const cookieHeader = c.req.header('cookie') || '';
  const cookies = cookieHeader.split(';').map(s => s.trim());
  for (const cookie of cookies) {
    if (
      cookie.startsWith('session_token=') ||
      cookie.startsWith('neon-auth.session_token=') ||
      cookie.startsWith('__Secure-neon-auth.session_token=')
    ) {
      const parts = cookie.split('=');
      if (parts.length >= 2) {
        return decodeURIComponent(parts.slice(1).join('=')).split('.')[0];
      }
    }
  }

  return null;
}

/**
 * Verifies active session against Neon PostgreSQL neon_auth schema or local fallback
 */
export async function verifySession(c: Context): Promise<AuthUser | null> {
  const token = extractToken(c);
  if (!token) return null;

  const neon = getNeonClient();
  if (neon) {
    try {
      const rows = await neon`
        SELECT s.id as session_id, s."userId" as user_id, s."expiresAt" as expires_at, u.email, u.name
        FROM neon_auth.session s
        JOIN neon_auth.user u ON u.id = s."userId"
        WHERE s.token = ${token} AND s."expiresAt" > CURRENT_TIMESTAMP
        LIMIT 1;
      `;
      if (rows && rows.length > 0) {
        return {
          id: String(rows[0].user_id),
          email: String(rows[0].email),
          name: String(rows[0].name || rows[0].email.split('@')[0]),
        };
      }
    } catch (err) {
      console.warn('Neon session verification fallback error:', err);
    }
  }

  // Local fallback session lookup
  const localSessions = getLocalSessions();
  const session = localSessions.find(
    s => s.token === token && new Date(s.expiresAt).getTime() > Date.now()
  );
  if (session) {
    return session.user;
  }

  return null;
}

/**
 * Sign up a user using Neon Auth API or resilient local store
 */
export async function handleSignUp(data: { email: string; password: string; name?: string }): Promise<{
  success: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
}> {
  const email = data.email.trim().toLowerCase();
  const password = data.password;
  const name = data.name?.trim() || email.split('@')[0];

  if (!email || !email.includes('@')) {
    return { success: false, error: 'A valid email address is required.' };
  }
  if (!password || password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long.' };
  }

  const authBaseUrl = getNeonAuthBaseUrl();
  try {
    const res = await fetch(`${authBaseUrl}/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173',
      },
      body: JSON.stringify({ email, password, name }),
    });

    const body = await res.json().catch(() => ({}));
    if (res.ok && body.token) {
      return {
        success: true,
        token: body.token,
        user: {
          id: body.user?.id || `user-${Date.now()}`,
          email: body.user?.email || email,
          name: body.user?.name || name,
        },
      };
    }

    if (body.message || body.error) {
      return { success: false, error: body.message || body.error };
    }
  } catch (err: any) {
    console.warn('Neon Auth remote sign-up unreachable, falling back to local store:', err.message);
  }

  // Resilient local store fallback
  const localUsers = getLocalUsers();
  if (localUsers.some(u => u.email === email)) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  const newUser: AuthUser = {
    id: `local-user-${Date.now()}`,
    email,
    name,
  };
  localUsers.push({ ...newUser, password });
  saveLocalUsers(localUsers);

  const token = `token-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const localSessions = getLocalSessions();
  localSessions.push({ token, user: newUser, expiresAt });
  saveLocalSessions(localSessions);

  return { success: true, token, user: newUser };
}

/**
 * Sign in a user using Neon Auth API or resilient local store
 */
export async function handleSignIn(data: { email: string; password: string }): Promise<{
  success: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
}> {
  const email = data.email.trim().toLowerCase();
  const password = data.password;

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  const authBaseUrl = getNeonAuthBaseUrl();
  try {
    const res = await fetch(`${authBaseUrl}/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173',
      },
      body: JSON.stringify({ email, password }),
    });

    const body = await res.json().catch(() => ({}));
    if (res.ok && body.token) {
      return {
        success: true,
        token: body.token,
        user: {
          id: body.user?.id || `user-${Date.now()}`,
          email: body.user?.email || email,
          name: body.user?.name || email.split('@')[0],
        },
      };
    }

    if (body.message || body.error) {
      return { success: false, error: body.message || body.error };
    }
  } catch (err: any) {
    console.warn('Neon Auth remote sign-in unreachable, checking local store:', err.message);
  }

  // Resilient local store fallback
  const localUsers = getLocalUsers();
  const user = localUsers.find(u => u.email === email && u.password === password);
  if (!user) {
    return { success: false, error: 'Invalid email or password.' };
  }

  const token = `token-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const localSessions = getLocalSessions();
  localSessions.push({
    token,
    user: { id: user.id, email: user.email, name: user.name },
    expiresAt,
  });
  saveLocalSessions(localSessions);

  return {
    success: true,
    token,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

/**
 * Sign out
 */
export async function handleSignOut(token: string | null): Promise<boolean> {
  if (!token) return true;

  const authBaseUrl = getNeonAuthBaseUrl();
  try {
    await fetch(`${authBaseUrl}/sign-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
  } catch {}

  const neon = getNeonClient();
  if (neon) {
    try {
      await neon`DELETE FROM neon_auth.session WHERE token = ${token};`;
    } catch {}
  }

  const localSessions = getLocalSessions().filter(s => s.token !== token);
  saveLocalSessions(localSessions);
  return true;
}
