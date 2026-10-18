import { Hono } from 'hono';
import { testNeonConnection } from '../../src/db/connection';
import { getNeonServicesDiagnostics, invokeNeonHelloFunction } from '../../src/lib/neon-services';
import { getGeminiModel } from '../../src/lib/ai-config';
import { verifySession } from '../../src/lib/auth-server';
import { resolveSessionUserId } from '../middleware/auth';
import { NoticeStore } from '../../src/db/store';
import { env } from '../config/env';

const router = new Hono();

/**
 * Health check & public status endpoint
 */
router.get('/health', async (c) => {
  try {
    const dbStatus = await testNeonConnection();
    const neonDiagnostics = await getNeonServicesDiagnostics();
    const hasGeminiKey = Boolean(env.geminiApiKey && env.geminiApiKey.length > 5);

    return c.json({
      status: 'ok',
      version: '1.0.0',
      app: 'Notice Decoder',
      tagline: 'Turn Any Document into Clear, Actionable Information.',
      timestamp: new Date().toISOString(),
      system: {
        database: {
          configured: dbStatus.configured,
          connected: dbStatus.connected,
          provider: dbStatus.provider,
        },
        neon: {
          database: neonDiagnostics.postgres,
          auth: neonDiagnostics.auth,
          storage: neonDiagnostics.objectStorage,
          functions: neonDiagnostics.functions,
        },
        aiExtraction: {
          provider: hasGeminiKey ? `google_${getGeminiModel()}` : 'deterministic_heuristic_nlp',
          model: getGeminiModel(),
          apiKeyConfigured: hasGeminiKey,
        },
        ocr: {
          engine: 'tesseract_js',
          status: 'ready',
        },
        calendar: {
          format: 'RFC 5545 iCalendar (.ics)',
          status: 'ready',
        },
        fileLimit: '10 MB per file (enforced)',
      },
    });
  } catch (err: any) {
    return c.json({ status: 'error', error: err.message }, 500);
  }
});

/**
 * Neon backend services diagnostics & inspection
 */
router.get('/neon/services', async (c) => {
  try {
    const diagnostics = await getNeonServicesDiagnostics();
    return c.json({ success: true, data: diagnostics });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Test Neon Function hello
 */
router.get('/neon/function-test', async (c) => {
  try {
    const result = await invokeNeonHelloFunction();
    return c.json(result);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * User Preferences: Get
 */
router.get('/preferences', async (c) => {
  try {
    const user = await verifySession(c);
    const userId = resolveSessionUserId(c, user) || 'anonymous';
    const prefs = await NoticeStore.getUserPreferences(userId);
    return c.json({ success: true, data: prefs });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * User Preferences: Save
 */
router.put('/preferences', async (c) => {
  try {
    const user = await verifySession(c);
    const userId = resolveSessionUserId(c, user);
    if (!userId) {
      return c.json({ success: false, error: 'Authentication required to save preferences' }, 401);
    }
    const body = await c.req.json();
    const updated = await NoticeStore.saveUserPreferences(userId, body);
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export { router as diagnosticsRoutes };
