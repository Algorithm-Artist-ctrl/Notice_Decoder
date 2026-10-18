import { Hono } from 'hono';
import { 
  verifySession, 
  handleSignUp, 
  handleSignIn, 
  handleSignOut, 
  extractToken 
} from '../../src/lib/auth-server';
import { NoticeStore } from '../../src/db/store';

const router = new Hono();

/**
 * Sign up with email & password
 */
router.post('/sign-up', async (c) => {
  try {
    const body = await c.req.json();
    const result = await handleSignUp(body);
    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }
    return c.json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Sign in with email & password
 */
router.post('/sign-in', async (c) => {
  try {
    const body = await c.req.json();
    const result = await handleSignIn(body);
    if (!result.success) {
      return c.json({ success: false, error: result.error }, 401);
    }
    return c.json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Get current session
 */
router.get('/session', async (c) => {
  try {
    const user = await verifySession(c);
    if (!user) {
      return c.json({ success: true, user: null });
    }
    return c.json({ success: true, user });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Sign out
 */
router.post('/sign-out', async (c) => {
  try {
    const token = extractToken(c);
    await handleSignOut(token);
    return c.json({ success: true, message: 'Signed out successfully' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Delete account and all user data permanently
 */
router.delete('/account', async (c) => {
  try {
    const user = await verifySession(c);
    if (!user || !user.id) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }
    const token = extractToken(c);
    await NoticeStore.deleteAccount(user.id);
    if (token) {
      await handleSignOut(token);
    }
    return c.json({ success: true, message: 'Account and associated records permanently deleted' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export { router as authRoutes };
