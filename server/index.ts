import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { serve } from '@hono/node-server';
import path from 'path';
import fs from 'fs';
import { testNeonConnection } from '../src/db/connection';
import { runMigrations } from '../src/db/migrate';
import { env, validateEnvironment } from './config/env';
import { authRoutes } from './routes/auth.routes';
import { remindersRoutes } from './routes/reminders.routes';
import { demoRoutes } from './routes/demo.routes';
import { diagnosticsRoutes } from './routes/diagnostics.routes';
import { noticesRoutes } from './routes/notices.routes';

const app = new Hono();

// Global CORS middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie', 'x-request-id', 'x-session-id'],
  credentials: true,
}));

// Global error handler: guarantees clean, structured JSON errors on any unhandled exception
app.onError((err, c) => {
  console.error(`[Server Error] ${c.req.method} ${c.req.path}:`, err);
  const status = (err as any).status || 500;
  return c.json({
    success: false,
    error: err.message || 'Internal Server Error',
    path: c.req.path,
    timestamp: new Date().toISOString(),
  }, status);
});

// Validate environment on boot
const envValidation = validateEnvironment();
if (envValidation.warnings.length > 0 && env.nodeEnv !== 'test') {
  for (const warning of envValidation.warnings) {
    console.log(`ℹ️ [Config] ${warning}`);
  }
}

// Test database connection and auto-run migrations at startup
testNeonConnection().then(async (status) => {
  if (status.connected) {
    console.log('✅ Connected to Neon PostgreSQL:', status.databaseUrlRedacted);
    try {
      await runMigrations();
    } catch (migErr: any) {
      console.warn('Startup migration notice:', migErr.message);
    }
  } else {
    console.log('ℹ️ Running in resilient mode:', status.error || 'No remote DB configured');
  }
}).catch((err) => {
  console.warn('Startup database test warning:', err.message);
});

/* =========================================================================
   MOUNT MODULAR ROUTE CONTROLLERS
   ========================================================================= */

app.route('/api/auth', authRoutes);
app.route('/api/reminders', remindersRoutes);
app.route('/api/demo', demoRoutes);
app.route('/api', diagnosticsRoutes);
app.route('/api', noticesRoutes);

/* =========================================================================
   STATIC ASSETS & SPA ROUTING
   ========================================================================= */

// Serve static client assets from dist/ if built (for production deployment)
const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use('/*', serveStatic({ root: './dist' }));
}

// Global 404 handler: returns JSON for /api/* routes, and SPA index.html for UI navigation
app.notFound((c) => {
  if (c.req.path.startsWith('/api')) {
    return c.json({
      success: false,
      error: `API route not found: ${c.req.method} ${c.req.path}`,
    }, 404);
  }
  const htmlFile = path.join(distDir, 'index.html');
  if (fs.existsSync(htmlFile)) {
    const html = fs.readFileSync(htmlFile, 'utf-8');
    return c.html(html);
  }
  return c.text('Notice Decoder build not found. Run npm run build.', 404);
});

export { app };

if (env.nodeEnv !== 'test') {
  console.log(`📡 Notice Decoder Server listening on http://${env.host}:${env.port}...`);

  serve({
    fetch: app.fetch,
    port: env.port,
    hostname: env.host,
  });
}
