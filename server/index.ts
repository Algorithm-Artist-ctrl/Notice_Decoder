import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import fs from 'fs';
import path from 'path';

// Load .env.local or .env
try {
  if (fs.existsSync('.env.local')) {
    process.loadEnvFile?.('.env.local');
  } else if (fs.existsSync('.env')) {
    process.loadEnvFile?.('.env');
  }
} catch {
  // Ignored
}

import { testNeonConnection, getDatabaseStatus } from '../src/db/connection';
import { NoticeStore } from '../src/db/store';
import { extractNoticeEvents, extractDocumentAnalysis } from '../src/lib/extractor';
import { generateICalendar } from '../src/lib/ics-exporter';
import { NoticeRecord, ExtractedEvent } from '../src/types';
import { uploadToNeonStorage, invokeNeonHelloFunction, getNeonServicesDiagnostics } from '../src/lib/neon-services';
import { verifySession, handleSignUp, handleSignIn, handleSignOut, extractToken } from '../src/lib/auth-server';
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';

const app = new Hono();

// Global middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie', 'x-request-id'],
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

// Test database connection at startup
testNeonConnection().then(status => {
  if (status.connected) {
    console.log('✅ Connected to Neon PostgreSQL:', status.databaseUrlRedacted);
  } else {
    console.log('ℹ️ Running in resilient mode:', status.error || 'No remote DB configured');
  }
}).catch(err => {
  console.warn('Startup database test warning:', err.message);
});

/**
 * File validation helpers
 */
function isValidPdf(buf: Buffer): boolean {
  return buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46; // %PDF
}

function isValidPng(buf: Buffer): boolean {
  return buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
}

function isValidJpeg(buf: Buffer): boolean {
  return buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
}

/**
 * Health check & diagnostics endpoint
 */
app.get('/api/health', async (c) => {
  try {
    const dbStatus = await testNeonConnection();
    const neonDiagnostics = await getNeonServicesDiagnostics();
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);

    return c.json({
      status: 'ok',
      version: '1.0.0',
      app: 'Notice Decoder',
      tagline: 'Turn Any Document into Clear, Actionable Information.',
      timestamp: new Date().toISOString(),
      system: {
        database: dbStatus,
        neon: neonDiagnostics,
        aiExtraction: {
          provider: hasGeminiKey ? 'google_gemini_2.5_flash' : 'deterministic_heuristic_nlp',
          apiKeyConfigured: hasGeminiKey,
          accuracyBaseline: 'Validated on sample circular test suite',
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
app.get('/api/neon/services', async (c) => {
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
app.get('/api/neon/function-test', async (c) => {
  try {
    const result = await invokeNeonHelloFunction();
    return c.json(result);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/* =========================================================================
   AUTHENTICATION ENDPOINTS (Managed Neon Auth + Session Verification)
   ========================================================================= */

/**
 * Sign up with email & password
 */
app.post('/api/auth/sign-up', async (c) => {
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
app.post('/api/auth/sign-in', async (c) => {
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
app.get('/api/auth/session', async (c) => {
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
app.post('/api/auth/sign-out', async (c) => {
  try {
    const token = extractToken(c);
    await handleSignOut(token);
    return c.json({ success: true, message: 'Signed out successfully' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/* =========================================================================
   CORE APPLICATION ENDPOINTS
   ========================================================================= */

/**
 * List all notices with user isolation:
 * - Authenticated: user's private notices + public demo notices
 * - Anonymous: ONLY public demo notices
 */
app.get('/api/notices', async (c) => {
  try {
    const user = await verifySession(c);
    const notices = await NoticeStore.listNotices(user?.id);
    return c.json({ success: true, data: notices });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Get notice by ID with strict ownership check
 */
app.get('/api/notices/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const user = await verifySession(c);
    const notice = await NoticeStore.getNoticeById(id, user?.id);
    if (!notice) {
      return c.json({ success: false, error: 'Notice not found or unauthorized' }, 404);
    }
    const events = await NoticeStore.getEventsByNoticeId(id, user?.id);
    return c.json({ success: true, data: { notice, events } });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Delete notice:
 * Requires authentication and owner verification. Forbids deleting sample demo notices.
 */
app.delete('/api/notices/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const user = await verifySession(c);
    if (!user) {
      return c.json({ success: false, error: 'Authentication required to delete notices' }, 401);
    }
    const success = await NoticeStore.deleteNotice(id, user.id);
    if (!success) {
      return c.json({ success: false, error: 'Notice not found, unauthorized, or sample notices cannot be deleted' }, 403);
    }
    return c.json({ success: true, message: 'Notice deleted successfully' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Get events for a notice
 */
app.get('/api/notices/:id/events', async (c) => {
  try {
    const id = c.req.param('id');
    const user = await verifySession(c);
    const notice = await NoticeStore.getNoticeById(id, user?.id);
    if (!notice) {
      return c.json({ success: false, error: 'Notice not found or unauthorized' }, 404);
    }
    const events = await NoticeStore.getEventsByNoticeId(id, user?.id);
    return c.json({ success: true, data: events });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Update single event
 */
app.patch('/api/events/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const user = await verifySession(c);
    const body = await c.req.json();
    const updated = await NoticeStore.updateEvent(id, body, user?.id);
    if (!updated) {
      return c.json({ success: false, error: 'Event not found or unauthorized' }, 404);
    }
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Confirm all events for a notice
 */
app.post('/api/notices/:id/confirm', async (c) => {
  try {
    const noticeId = c.req.param('id');
    const user = await verifySession(c);
    const notice = await NoticeStore.getNoticeById(noticeId, user?.id);
    if (!notice) {
      return c.json({ success: false, error: 'Notice not found or unauthorized' }, 404);
    }

    const events = await NoticeStore.getEventsByNoticeId(noticeId, user?.id);
    for (const ev of events) {
      ev.isConfirmed = true;
      ev.reviewRequired = false;
    }
    await NoticeStore.saveEvents(events, user?.id);

    notice.status = 'confirmed';
    notice.updatedAt = new Date().toISOString();
    await NoticeStore.saveNotice(notice);

    return c.json({ success: true, message: 'All notice events confirmed and saved into schedule', data: events });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Get all confirmed events (Schedule view)
 */
app.get('/api/schedule', async (c) => {
  try {
    const user = await verifySession(c);
    const events = await NoticeStore.getAllConfirmedEvents(user?.id);
    // Sort chronologically by date then start_time
    events.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const timeA = a.startTime || a.deadlineTime || '00:00';
      const timeB = b.startTime || b.deadlineTime || '00:00';
      return timeA.localeCompare(timeB);
    });
    return c.json({ success: true, data: events });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Get conflict analysis
 */
app.get('/api/conflicts', async (c) => {
  try {
    const noticeId = c.req.query('noticeId');
    const user = await verifySession(c);
    const analysis = await NoticeStore.getConflictAnalysis(noticeId, user?.id);
    return c.json({ success: true, data: analysis });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Upload notice and process extraction
 * Enforces 10MB limit, validates file magic bytes, cleans up OCR workers,
 * and reports extraction method accurately.
 */
app.post('/api/notices/upload', async (c) => {
  try {
    const user = await verifySession(c);
    const contentType = c.req.header('content-type') || '';
    let rawText = '';
    let fileName = 'UploadedNotice.txt';
    let fileType: 'pdf' | 'image' | 'text' = 'text';
    let fileSize = 0;
    let title = 'College Notice';
    let isDemo = false;

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

    let buffer: Buffer | null = null;

    if (contentType.includes('application/json')) {
      const body = await c.req.json();
      rawText = body.text || '';
      title = body.title || 'College Notice';
      isDemo = Boolean(body.isDemo);
      fileSize = Buffer.byteLength(rawText, 'utf-8');
      fileType = 'text';

      if (fileSize > MAX_FILE_SIZE) {
        return c.json({ success: false, error: 'Text payload exceeds 10MB limit.' }, 400);
      }
    } else if (contentType.includes('multipart/form-data')) {
      const body = await c.req.parseBody();
      title = (body['title'] as string) || 'Uploaded Notice';
      const file = body['file'];

      if (!file) {
        return c.json({ success: false, error: 'No file uploaded' }, 400);
      }

      if (typeof file === 'string') {
        rawText = file;
        fileSize = Buffer.byteLength(rawText, 'utf-8');
      } else {
        const fileObj = file as File;
        fileName = fileObj.name;
        fileSize = fileObj.size;

        if (fileSize > MAX_FILE_SIZE) {
          return c.json({
            success: false,
            error: `File size exceeds the 10 MB limit (${(fileSize / (1024 * 1024)).toFixed(2)} MB). Please select a smaller file.`,
          }, 400);
        }

        const arrayBuffer = await fileObj.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);

        const lowerName = fileName.toLowerCase();
        if (lowerName.endsWith('.pdf')) {
          fileType = 'pdf';
          if (!isValidPdf(buffer)) {
            return c.json({ success: false, error: 'The uploaded file does not match a valid PDF file signature.' }, 400);
          }
          try {
            const parsedPdf = await pdfParse(buffer);
            rawText = parsedPdf.text || '';
            if (rawText.trim().length < 20) {
              return c.json({
                success: false,
                error: 'The uploaded PDF does not contain selectable text (scanned document or image-only PDF). Please upload a clear image (PNG or JPEG) to enable OCR text recognition, or provide a PDF with selectable text.',
              }, 400);
            }
          } catch (pdfErr: any) {
            console.error('PDF parsing error:', pdfErr);
            return c.json({ success: false, error: 'Failed to read PDF document text.' }, 400);
          }
        } else if (lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
          fileType = 'image';
          if (!isValidPng(buffer) && !isValidJpeg(buffer)) {
            return c.json({ success: false, error: 'The uploaded file does not match a valid PNG or JPEG image signature.' }, 400);
          }
          const worker = await createWorker('eng');
          try {
            const ret = await worker.recognize(buffer);
            rawText = ret.data.text;
          } catch (ocrErr: any) {
            console.error('OCR processing error:', ocrErr);
            return c.json({ success: false, error: 'OCR processing failed on uploaded image.' }, 400);
          } finally {
            try {
              await worker.terminate();
            } catch {}
          }
        } else {
          return c.json({
            success: false,
            error: 'Unsupported file format. Notice Decoder supports PDF documents (.pdf) and images (.png, .jpeg).',
          }, 400);
        }
      }
    } else {
      return c.json({ success: false, error: 'Invalid content type' }, 400);
    }

    if (!rawText || rawText.trim().length < 5) {
      return c.json({
        success: false,
        error: 'No readable text could be found in the provided notice. Please check the document clarity.',
      }, 400);
    }

    // 1. Run universal AI/NLP Document-to-Action analysis
    const analysis = await extractDocumentAnalysis(rawText, {
      apiKey: process.env.GEMINI_API_KEY,
      timezone: process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata',
    });

    const determinedTitle = title.trim() && title !== 'College Notice' && title !== 'Uploaded Notice'
      ? title.trim()
      : (analysis.documentTitle || 'Processed Document');

    const noticeId = isDemo ? 'demo-notice-ps02' : `doc-${Date.now()}`;
    const notice: NoticeRecord = {
      id: noticeId,
      userId: user?.id,
      title: determinedTitle,
      documentType: analysis.documentType,
      summary: analysis.summary,
      keyInformation: analysis.keyInformation,
      actionableItemsCount: analysis.extractedItems.length,
      rawText: rawText.trim(),
      fileName,
      fileType,
      fileSize,
      status: 'extracted',
      extractedEventsCount: analysis.extractedItems.length,
      conflictsCount: 0,
      isDemo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const events = analysis.extractedItems;
    for (const ev of events) {
      ev.noticeId = noticeId;
      ev.userId = user?.id;
    }

    // 2. Save document & events to Neon PostgreSQL
    await NoticeStore.saveNotice(notice);
    if (events.length > 0) {
      await NoticeStore.saveEvents(events, user?.id);
    }

    // 3. Archive binary asset to Neon Object Storage if uploaded
    if (buffer) {
      uploadToNeonStorage(
        `notices/${noticeId}/${fileName}`,
        buffer,
        fileType === 'pdf' ? 'application/pdf' : 'image/jpeg'
      ).catch(e => console.warn('Background Neon storage upload warning:', e.message));
    }

    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const extractionMethod = hasGeminiKey ? `google_${modelName}` : 'deterministic_heuristic_nlp';

    return c.json({
      success: true,
      message: 'Document analyzed and extracted successfully',
      data: {
        notice,
        events,
        analysis,
        extractionMethod,
      },
    });
  } catch (err: any) {
    console.error('Upload processing error:', err);
    return c.json({ success: false, error: err.message || 'Internal processing error' }, 500);
  }
});

/**
 * User Preferences: Get
 */
app.get('/api/preferences', async (c) => {
  try {
    const user = await verifySession(c);
    const userId = user?.id || 'anonymous';
    const prefs = await NoticeStore.getUserPreferences(userId);
    return c.json({ success: true, data: prefs });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * User Preferences: Save
 */
app.put('/api/preferences', async (c) => {
  try {
    const user = await verifySession(c);
    const userId = user?.id || 'anonymous';
    const body = await c.req.json();
    const updated = await NoticeStore.saveUserPreferences(userId, body);
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Export confirmed events to RFC 5545 .ics file
 */
app.get('/api/calendar/export', async (c) => {
  try {
    const user = await verifySession(c);
    const events = await NoticeStore.getAllConfirmedEvents(user?.id);
    if (events.length === 0) {
      return c.json({
        success: false,
        error: 'No confirmed events available to export. Please review and confirm notice events first.',
      }, 400);
    }

    const icsString = generateICalendar(events, 'Notice Decoder Schedule');

    return c.text(icsString, 200, {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="notice-decoder-schedule.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Get isolated sandbox demo dataset (for evaluation/presentation without DB pollution)
 */
app.get('/api/demo/data', async (c) => {
  try {
    const demoNoticeId = 'demo-notice-ps02';
    let notice = await NoticeStore.getNoticeById(demoNoticeId);
    let events = await NoticeStore.getEventsByNoticeId(demoNoticeId);

    if (!notice || events.length === 0) {
      await NoticeStore.seedDemoData();
      notice = await NoticeStore.getNoticeById(demoNoticeId);
      events = await NoticeStore.getEventsByNoticeId(demoNoticeId);
    }

    return c.json({
      success: true,
      data: { notice, events },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Re-seed demo dataset
 */
app.post('/api/demo/seed', async (c) => {
  try {
    await NoticeStore.seedDemoData();
    const notice = await NoticeStore.getNoticeById('demo-notice-ps02');
    const events = await NoticeStore.getEventsByNoticeId('demo-notice-ps02');
    return c.json({
      success: true,
      message: 'Demonstration dataset reloaded successfully',
      data: { notice, events },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

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

if (process.env.NODE_ENV !== 'test') {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const HOST = '0.0.0.0';
  console.log(`📡 Notice Decoder Server listening on http://${HOST}:${PORT}...`);

  serve({
    fetch: app.fetch,
    port: PORT,
    hostname: HOST,
  });
}
