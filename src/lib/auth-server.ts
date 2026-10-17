import { Context } from 'hono';
import { getNeonClient } from '../db/connection';
import crypto from 'crypto';

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

const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);

// In-memory test store only used in non-production test suites when remote auth is unreachable
interface MockUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
}

const memoryTestUsers: Map<string, MockUser> = new Map();
const memoryTestSessions: Map<string, { token: string; user: AuthUser; expiresAt: string }> = new Map();

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
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
 * Returns the appropriate origin header for Neon Auth Better Auth verification
 */
function getAuthOrigin(): string {
  if (process.env.CLIENT_URL) {
    return process.env.CLIENT_URL;
  }
  return isProduction ? 'https://noticedecoder.onrender.com' : 'http://localhost:5173';
}

/**
 * Extracts session token from Authorization header or cookies safely
 */
export function extractToken(c: Context): string | null {
  const authHeader = c.req.header('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) return token;
  }

  const cookieHeader = c.req.header('cookie') || '';
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(s => s.trim());
    for (const cookie of cookies) {
      const eqIdx = cookie.indexOf('=');
      if (eqIdx > 0) {
        const name = cookie.substring(0, eqIdx);
        const val = cookie.substring(eqIdx + 1);
        if (
          name === 'session_token' ||
          name === 'neon-auth.session_token' ||
          name === '__Secure-neon-auth.session_token'
        ) {
          const raw = decodeURIComponent(val);
          return raw.split('.')[0]; // strip signature if signed cookie
        }
      }
    }
  }

  return null;
}

/**
 * Verifies active session against Neon PostgreSQL neon_auth schema
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
      console.warn('Neon database session verification error:', err);
    }
  }

  // Strictly forbid local/in-memory fallback in production environment
  if (isProduction) {
    return null;
  }

  // Non-production test fallback
  const session = memoryTestSessions.get(token);
  if (session && new Date(session.expiresAt).getTime() > Date.now()) {
    return session.user;
  }

  return null;
}

/**
 * Sign up a user using Neon Managed Better Auth API
 */
export async function handleSignUp(data: { email: string; password: string; name?: string }): Promise<{
  success: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
}> {
  const email = data.email?.trim().toLowerCase();
  const password = data.password;
  const name = data.name?.trim() || email?.split('@')[0] || 'Student';

  if (!email || !email.includes('@') || email.length < 5) {
    return { success: false, error: 'A valid email address is required.' };
  }
  if (!password || password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long.' };
  }

  const authBaseUrl = getNeonAuthBaseUrl();
  const origin = getAuthOrigin();

  try {
    const res = await fetch(`${authBaseUrl}/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': origin,
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
    console.warn('Neon Auth remote sign-up warning:', err.message);
  }

  // In production, never fake registration or fall back to insecure local storage
  if (isProduction) {
    return {
      success: false,
      error: 'Authentication service temporarily unreachable. Please verify network and try again.',
    };
  }

  // Non-production cryptographically secure test adapter (for offline CI tests only)
  if (memoryTestUsers.has(email)) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const userId = `usr-${crypto.randomUUID()}`;
  const newUser: AuthUser = { id: userId, email, name };

  memoryTestUsers.set(email, {
    id: userId,
    email,
    name,
    passwordHash,
    salt,
  });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  memoryTestSessions.set(token, { token, user: newUser, expiresAt });

  return { success: true, token, user: newUser };
}

/**
 * Sign in a user using Neon Managed Better Auth API
 */
export async function handleSignIn(data: { email: string; password: string }): Promise<{
  success: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
}> {
  const email = data.email?.trim().toLowerCase();
  const password = data.password;

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  const authBaseUrl = getNeonAuthBaseUrl();
  const origin = getAuthOrigin();

  try {
    const res = await fetch(`${authBaseUrl}/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': origin,
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
    console.warn('Neon Auth remote sign-in warning:', err.message);
  }

  // In production, never fake login or fall back to insecure local storage
  if (isProduction) {
    return {
      success: false,
      error: 'Invalid email or password.',
    };
  }

  // Non-production cryptographically secure test adapter (for offline CI tests only)
  const existing = memoryTestUsers.get(email);
  if (!existing) {
    return { success: false, error: 'Invalid email or password.' };
  }

  const computedHash = hashPassword(password, existing.salt);
  if (!crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(existing.passwordHash, 'hex'))) {
    return { success: false, error: 'Invalid email or password.' };
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const user: AuthUser = { id: existing.id, email: existing.email, name: existing.name };
  memoryTestSessions.set(token, { token, user, expiresAt });

  return { success: true, token, user };
}

/**
 * Sign out user by revoking session in Neon PostgreSQL and Better Auth
 */
export async function handleSignOut(token: string | null): Promise<void> {
  if (!token) return;

  const neon = getNeonClient();
  if (neon) {
    try {
      await neon`
        DELETE FROM neon_auth.session WHERE token = ${token};
      `;
    } catch (e: any) {
      console.warn('Neon session deletion warning:', e.message);
    }
  }

  // Notify remote Neon Auth server
  const authBaseUrl = getNeonAuthBaseUrl();
  const origin = getAuthOrigin();
  try {
    await fetch(`${authBaseUrl}/sign-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': origin,
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
  } catch {}

  memoryTestSessions.delete(token);
}
