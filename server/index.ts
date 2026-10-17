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
import { runMigrations } from '../src/db/migrate';
import { NoticeStore } from '../src/db/store';
import { extractNoticeEvents, extractDocumentAnalysis, translateSummary } from '../src/lib/extractor';
import { getGeminiModel } from '../src/lib/ai-config';
import { generateICalendar } from '../src/lib/ics-exporter';
import { NoticeRecord, ExtractedEvent, ReminderRecord } from '../src/types';
import { uploadToNeonStorage, invokeNeonHelloFunction, getNeonServicesDiagnostics } from '../src/lib/neon-services';
import { verifySession, handleSignUp, handleSignIn, handleSignOut, extractToken } from '../src/lib/auth-server';
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';

const app = new Hono();

// Global middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie', 'x-request-id', 'x-session-id'],
  credentials: true,
}));

// Helper to resolve authenticated user or isolated anonymous guest session ID
function resolveSessionUserId(c: any, user?: { id: string } | null): string | undefined {
  if (user?.id) return user.id;
  const headerSid = c.req.header('x-session-id');
  if (headerSid && typeof headerSid === 'string' && headerSid.trim().length > 3) {
    return `anon_${headerSid.trim().replace(/[^a-zA-Z0-9_\-]/g, '')}`;
  }
  return undefined;
}

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
testNeonConnection().then(async status => {
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
          provider: hasGeminiKey ? `google_${getGeminiModel()}` : 'deterministic_heuristic_nlp',
          model: getGeminiModel(),
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

/**
 * Delete account and all user data permanently
 */
app.delete('/api/auth/account', async (c) => {
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
    const sessionUserId = resolveSessionUserId(c, user);
    const notices = await NoticeStore.listNotices(sessionUserId);
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
    const sessionUserId = resolveSessionUserId(c, user);
    const notice = await NoticeStore.getNoticeById(id, sessionUserId);
    if (!notice) {
      return c.json({ success: false, error: 'Notice not found or unauthorized' }, 404);
    }
    const events = await NoticeStore.getEventsByNoticeId(id, sessionUserId);
    return c.json({ success: true, data: { notice, events } });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Multilingual summary translation (English, Hinglish, Hindi) with database caching
 */
app.post('/api/notices/:id/translate', async (c) => {
  try {
    const id = c.req.param('id');
    const user = await verifySession(c);
    const sessionUserId = resolveSessionUserId(c, user);
    const notice = await NoticeStore.getNoticeById(id, sessionUserId);
    if (!notice) {
      return c.json({ success: false, error: 'Notice not found or unauthorized' }, 404);
    }

    const body = await c.req.json();
    const targetLang = (body.language || 'english').toLowerCase() as 'english' | 'hinglish' | 'hindi';

    if (!['english', 'hinglish', 'hindi'].includes(targetLang)) {
      return c.json({ success: false, error: 'Invalid language. Supported: english, hinglish, hindi' }, 400);
    }

    // Check cached summary
    let summaryText = '';
    if (targetLang === 'english') {
      summaryText = notice.summaryEnglish || notice.summary || '';
    } else if (targetLang === 'hinglish') {
      summaryText = notice.summaryHinglish || '';
    } else if (targetLang === 'hindi') {
      summaryText = notice.summaryHindi || '';
    }

    if (!summaryText) {
      const baseSummary = notice.summaryEnglish || notice.summary || notice.title;
      summaryText = await translateSummary(baseSummary, targetLang, process.env.GEMINI_API_KEY);

      // Cache translation in database
      const updatePayload: { english?: string; hinglish?: string; hindi?: string } = {};
      if (targetLang === 'hinglish') updatePayload.hinglish = summaryText;
      if (targetLang === 'hindi') updatePayload.hindi = summaryText;
      if (targetLang === 'english') updatePayload.english = summaryText;

      await NoticeStore.updateNoticeSummaries(id, updatePayload, sessionUserId || 'anonymous');
    }

    return c.json({
      success: true,
      data: {
        noticeId: id,
        language: targetLang,
        summary: summaryText,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Delete notice:
 * Requires authentication or active session ownership.
 */
app.delete('/api/notices/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const user = await verifySession(c);
    const sessionUserId = resolveSessionUserId(c, user);
    if (!sessionUserId) {
      return c.json({ success: false, error: 'Authentication or active session required to delete notices' }, 401);
    }
    const success = await NoticeStore.deleteNotice(id, sessionUserId);
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
    const sessionUserId = resolveSessionUserId(c, user);
    const notice = await NoticeStore.getNoticeById(id, sessionUserId);
    if (!notice) {
      return c.json({ success: false, error: 'Notice not found or unauthorized' }, 404);
    }
    const events = await NoticeStore.getEventsByNoticeId(id, sessionUserId);
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
    const sessionUserId = resolveSessionUserId(c, user);
    const body = await c.req.json();
    const updated = await NoticeStore.updateEvent(id, body, sessionUserId);
    if (!updated) {
      return c.json({ success: false, error: 'Event not found or unauthorized' }, 404);
    }
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Delete single event with strict ownership check
 */
app.delete('/api/events/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const user = await verifySession(c);
    const sessionUserId = resolveSessionUserId(c, user);
    if (!sessionUserId) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }
    const success = await NoticeStore.deleteEvent(id, sessionUserId);
    if (!success) {
      return c.json({ success: false, error: 'Event not found or unauthorized' }, 404);
    }
    return c.json({ success: true, message: 'Event deleted successfully' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/* =========================================================================
   REMINDERS CRUD ENDPOINTS
   ========================================================================= */

/**
 * List reminders for active session/user
 */
app.get('/api/reminders', async (c) => {
  try {
    const user = await verifySession(c);
    const sessionUserId = resolveSessionUserId(c, user);
    if (!sessionUserId) {
      return c.json({ success: true, data: [] });
    }
    const reminders = await NoticeStore.getReminders(sessionUserId);
    return c.json({ success: true, data: reminders });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Create a new personal reminder
 */
app.post('/api/reminders', async (c) => {
  try {
    const user = await verifySession(c);
    const sessionUserId = resolveSessionUserId(c, user);
    if (!sessionUserId) {
      return c.json({ success: false, error: 'Authentication required to create reminders' }, 401);
    }
    const body = await c.req.json();
    if (!body.title || !body.date) {
      return c.json({ success: false, error: 'Title and date are required' }, 400);
    }
    const reminder = await NoticeStore.createReminder({
      ...body,
      userId: sessionUserId,
    });
    return c.json({ success: true, data: reminder }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Update a personal reminder
 */
app.patch('/api/reminders/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const user = await verifySession(c);
    const sessionUserId = resolveSessionUserId(c, user);
    if (!sessionUserId) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }
    const body = await c.req.json();
    const updated = await NoticeStore.updateReminder(id, body, sessionUserId);
    if (!updated) {
      return c.json({ success: false, error: 'Reminder not found or unauthorized' }, 404);
    }
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Delete a personal reminder
 */
app.delete('/api/reminders/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const user = await verifySession(c);
    const sessionUserId = resolveSessionUserId(c, user);
    if (!sessionUserId) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }
    const success = await NoticeStore.deleteReminder(id, sessionUserId);
    if (!success) {
      return c.json({ success: false, error: 'Reminder not found or unauthorized' }, 404);
    }
    return c.json({ success: true, message: 'Reminder deleted successfully' });
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
    const sessionUserId = resolveSessionUserId(c, user);
    const notice = await NoticeStore.getNoticeById(noticeId, sessionUserId);
    if (!notice) {
      return c.json({ success: false, error: 'Notice not found or unauthorized' }, 404);
    }

    const events = await NoticeStore.getEventsByNoticeId(noticeId, sessionUserId);
    for (const ev of events) {
      ev.isConfirmed = true;
      ev.reviewRequired = false;
    }
    await NoticeStore.saveEvents(events, sessionUserId);

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
    const sessionUserId = resolveSessionUserId(c, user);
    const events = await NoticeStore.getAllConfirmedEvents(sessionUserId);
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
    const sessionUserId = resolveSessionUserId(c, user);
    const analysis = await NoticeStore.getConflictAnalysis(noticeId, sessionUserId);
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

    const sessionUserId = resolveSessionUserId(c, user);
    const noticeId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const notice: NoticeRecord = {
      id: noticeId,
      userId: sessionUserId,
      title: determinedTitle,
      documentType: analysis.documentType,
      documentDomain: analysis.documentDomain,
      analysisCase: analysis.analysisCase,
      summary: analysis.summary,
      keyInformation: analysis.keyInformation,
      directives: analysis.directives,
      requiredActions: analysis.requiredActions,
      contactsOrReferences: analysis.contactsOrReferences,
      actionableItemsCount: analysis.extractedItems.length,
      rawText: rawText.trim(),
      fileName,
      fileType,
      fileSize,
      status: 'review_required',
      extractedEventsCount: analysis.extractedItems.length,
      conflictsCount: 0,
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const events = analysis.extractedItems;
    for (const ev of events) {
      ev.noticeId = noticeId;
      ev.userId = sessionUserId;
    }

    // 2. Save document & events to Neon PostgreSQL
    await NoticeStore.saveNotice(notice);
    if (events.length > 0) {
      await NoticeStore.saveEvents(events, sessionUserId);
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
    const modelName = getGeminiModel();
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
app.put('/api/preferences', async (c) => {
  try {
    const user = await verifySession(c);
    const userId = resolveSessionUserId(c, user) || 'anonymous';
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
    const sessionUserId = resolveSessionUserId(c, user);
    const events = await NoticeStore.getAllConfirmedEvents(sessionUserId);
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
 * Get 4 isolated interactive demonstration scenarios
 */
app.get('/api/demo/scenarios', async (c) => {
  return c.json({
    success: true,
    data: [
      {
        id: 'scenario-academic-conflict',
        title: 'Academic Schedule: Mid-Term Exam & AI Lecture Overlap',
        category: 'academic',
        domain: 'academic',
        analysisCase: 'A',
        description: 'Demonstrates automatic detection of a 30-minute hard overlap between an examination and a guest lecture, along with a deadline warning.',
        badge: 'Interval Conflict (30m Overlap)',
        text: `DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING
ACADEMIC NOTICE: MID-SEMESTER EXAMINATIONS & SPECIAL LECTURES

1. Course: CS401 Advanced Database Systems Mid-Term Examination
   Date: 25 November 2026
   Time: 10:00 to 11:30
   Venue: Main Examination Hall A

2. Special Guest Lecture: Modern AI Agents in Production by Dr. Robert Vance
   Date: 25 November 2026
   Time: 11:00 to 12:30
   Venue: University Auditorium B
   Audience: All Computer Science students

3. Lab Record Submission Deadline
   Date: 25 November 2026
   Deadline: 12:00
   Venue: Software Lab 2`,
      },
      {
        id: 'scenario-point-deadline',
        title: 'National Research Grant Application & Proposal Submission',
        category: 'government',
        domain: 'government',
        analysisCase: 'B',
        description: 'Demonstrates distinct point deadline extraction with strict cut-off time, countdown tracking, and zero timed conflict errors.',
        badge: 'Strict Point Deadline (Zero Conflicts)',
        text: `MINISTRY OF SCIENCE AND TECHNOLOGY
CALL FOR NATIONAL RESEARCH GRANT PROPOSALS — FISCAL CYCLE 2026-27

Notice Ref: MST/RND/2026/8492
Subject: Submission of advanced computing and climate technology research proposals.

ELIGIBILITY AND SUBMISSION GUIDELINES:
- Proposals are invited from accredited universities, research institutions, and technology incubators.
- All complete project proposals, budget justification sheets, and institutional endorsement letters must be uploaded via the national portal.

CRITICAL CUT-OFF DEADLINE:
- Date: 15 December 2026
- Time: 23:59 IST (Hard Deadline — Portal closes automatically)
- Late or incomplete submissions will not be admitted for technical committee review.`,
      },
      {
        id: 'scenario-zero-date-policy',
        title: 'Campus Central Library Modernization & Quiet Study Zone Directives',
        category: 'institutional',
        domain: 'institutional',
        analysisCase: 'D',
        description: 'Demonstrates zero-date reference and policy processing: extracts directives, compliance rules, and contacts without hallucinating events.',
        badge: 'Informational Policy (0 Events)',
        text: `OFFICE OF THE UNIVERSITY LIBRARIAN
CAMPUS DIRECTIVE: LIBRARY RENOVATION & STUDY ZONE REGULATIONS

Directive No: LIB-DIR-2026/09

GENERAL RULES & DIRECTIVES:
1. Third Floor Quiet Zone: The entire third floor is designated as a 24/7 Silent Study Zone. Mobile phone calls, audio playback without headphones, and group discussions are strictly prohibited.
2. Automated RFID Checkout: All books and journals must be scanned at self-checkout kiosks prior to exiting the facility.
3. Overnight Reserve Collection: Overnight loans are available for reference textbooks starting at 20:00 and must be returned the next morning by 09:00.
4. Compliance: Violators will receive an initial written reprimand followed by a 14-day library privilege suspension.

Direct queries to: library-services@university.edu | Phone: +91 11 2659 7000`,
      },
      {
        id: 'scenario-corporate-interview',
        title: 'Executive Search: Senior Technical Architect Interview Rounds',
        category: 'corporate',
        domain: 'corporate',
        analysisCase: 'C',
        description: 'Demonstrates professional corporate document processing: interview rounds, technical whiteboard evaluation, and preparation deadlines.',
        badge: 'Multi-Stage Schedule (Corporate)',
        text: `ACME TECHNOLOGIES CORP — TALENT ACQUISITION
CANDIDATE INTERVIEW SCHEDULE & BRIEFING MEMORANDUM

Candidate: Alex Mercer
Position: Senior Technical Architect (Distributed Systems)
Interview Date: 04 December 2026

SCHEDULE OF EVALUATION SESSIONS:
1. System Architecture & High-Scale Design Round
   Date: 04 December 2026
   Time: 09:30 to 11:00
   Format: Whiteboard / Virtual Architecture Studio
   Interviewers: VP of Engineering & Principal Architect

2. Engineering Leadership & Culture Alignment
   Date: 04 December 2026
   Time: 11:30 to 12:30
   Format: Interactive Discussion
   Interviewer: Head of People & CTO

3. Portfolio & Reference Architecture Submission
   Date: 04 December 2026
   Deadline: 17:00
   Note: Submit architecture diagrams and GitHub repository link via portal.`,
      },
    ],
  });
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
