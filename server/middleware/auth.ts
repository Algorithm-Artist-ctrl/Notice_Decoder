import { Context } from 'hono';
import { env } from '../config/env';
import { AuthUser, verifySession } from '../../src/lib/auth-server';

/**
 * Resolves authenticated user ID or isolated guest session identifier
 */
export function resolveSessionUserId(c: Context, user?: AuthUser | null): string | undefined {
  if (user?.id) return user.id;

  if (!env.isProduction) {
    const headerSid = c.req.header('x-session-id');
    if (headerSid && typeof headerSid === 'string' && headerSid.trim().length > 3) {
      return `anon_${headerSid.trim().replace(/[^a-zA-Z0-9_\-]/g, '')}`;
    }
  }

  return undefined;
}

/**
 * Enforces authenticated session on protected routes
 */
export async function requireAuth(c: Context, next: () => Promise<void>) {
  const user = await verifySession(c);
  if (!user || !user.id) {
    return c.json({
      success: false,
      error: 'Authentication required. Please sign in to access this resource.',
    }, 401);
  }
  c.set('user' as any, user);
  await next();
}
