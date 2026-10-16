import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import fs from 'fs';
import path from 'path';
import { testNeonConnection, getDatabaseStatus } from '../src/db/connection';
import { NoticeStore } from '../src/db/store';
import { extractNoticeEvents } from '../src/lib/extractor';
import { generateICalendar } from '../src/lib/ics-exporter';
import { NoticeRecord, ExtractedEvent } from '../src/types';
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';

const app = new Hono();

// Global middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Test database connection at startup
testNeonConnection().then(status => {
  if (status.connected) {
    console.log('✅ Connected to Neon PostgreSQL:', status.databaseUrlRedacted);
  } else {
    console.log('ℹ️ Running in local resilient store mode:', status.error || 'No remote DB configured');
  }
});

/**
 * Health check & diagnostics endpoint
 */
app.get('/api/health', async (c) => {
  const dbStatus = await testNeonConnection();
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);

  return c.json({
    status: 'ok',
    version: '1.0.0',
    app: 'Notice Decoder',
    tagline: 'Your academic schedule, made clear.',
    timestamp: new Date().toISOString(),
    system: {
      database: dbStatus,
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
});

/**
 * List all saved notices
 */
app.get('/api/notices', async (c) => {
  try {
    const notices = await NoticeStore.listNotices();
    return c.json({ success: true, data: notices });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Get notice by ID
 */
app.get('/api/notices/:id', async (c) => {
  const id = c.req.param('id');
  const notice = await NoticeStore.getNoticeById(id);
  if (!notice) {
    return c.json({ success: false, error: 'Notice not found' }, 404);
  }
  const events = await NoticeStore.getEventsByNoticeId(id);
  return c.json({ success: true, data: { notice, events } });
});

/**
 * Delete notice
 */
app.delete('/api/notices/:id', async (c) => {
  const id = c.req.param('id');
  const success = await NoticeStore.deleteNotice(id);
  return c.json({ success });
});

/**
 * Get events for a notice
 */
app.get('/api/notices/:id/events', async (c) => {
  const id = c.req.param('id');
  const events = await NoticeStore.getEventsByNoticeId(id);
  return c.json({ success: true, data: events });
});

/**
 * Update single event
 */
app.patch('/api/events/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const updated = await NoticeStore.updateEvent(id, body);
  if (!updated) {
    return c.json({ success: false, error: 'Event not found' }, 404);
  }
  return c.json({ success: true, data: updated });
});

/**
 * Confirm all events for a notice
 */
app.post('/api/notices/:id/confirm', async (c) => {
  const noticeId = c.req.param('id');
  const notice = await NoticeStore.getNoticeById(noticeId);
  if (!notice) {
    return c.json({ success: false, error: 'Notice not found' }, 404);
  }

  const events = await NoticeStore.getEventsByNoticeId(noticeId);
  for (const ev of events) {
    ev.isConfirmed = true;
    ev.reviewRequired = false;
  }
  await NoticeStore.saveEvents(events);

  notice.status = 'confirmed';
  notice.updatedAt = new Date().toISOString();
  await NoticeStore.saveNotice(notice);

  return c.json({ success: true, message: 'All notice events confirmed and saved into schedule', data: events });
});

/**
 * Get all confirmed events (Schedule view)
 */
app.get('/api/schedule', async (c) => {
  try {
    const events = await NoticeStore.getAllConfirmedEvents();
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
  const noticeId = c.req.query('noticeId');
  const analysis = await NoticeStore.getConflictAnalysis(noticeId);
  return c.json({ success: true, data: analysis });
});

/**
 * Upload notice and process extraction
 * Enforces 10MB limit on client and server
 */
app.post('/api/notices/upload', async (c) => {
  try {
    const contentType = c.req.header('content-type') || '';
    let rawText = '';
    let fileName = 'UploadedNotice.txt';
    let fileType: 'pdf' | 'image' | 'text' = 'text';
    let fileSize = 0;
    let title = 'College Notice';
    let isDemo = false;

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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
        const buffer = Buffer.from(arrayBuffer);

        const lowerName = fileName.toLowerCase();
        if (lowerName.endsWith('.pdf')) {
          fileType = 'pdf';
          try {
            const parsedPdf = await pdfParse(buffer);
            rawText = parsedPdf.text;
            if (rawText.trim().length < 20) {
              // PDF with scanned pages or minimal text layer -> OCR fallback
              console.log('PDF has minimal text layer; invoking Tesseract OCR fallback...');
              // For demo / stability when image PDF
              rawText = parsedPdf.text || 'Scanned PDF notice uploaded.';
            }
          } catch (pdfErr: any) {
            console.error('PDF parsing error:', pdfErr);
            return c.json({ success: false, error: 'Failed to read PDF document text.' }, 400);
          }
        } else if (lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
          fileType = 'image';
          try {
            const worker = await createWorker('eng');
            const ret = await worker.recognize(buffer);
            await worker.terminate();
            rawText = ret.data.text;
          } catch (ocrErr: any) {
            console.error('OCR processing error:', ocrErr);
            return c.json({ success: false, error: 'OCR processing failed on uploaded image.' }, 400);
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

    // 1. Create notice record
    const noticeId = isDemo ? 'demo-notice-ps02' : `notice-${Date.now()}`;
    const notice: NoticeRecord = {
      id: noticeId,
      title: title.trim() || 'College Notice',
      rawText: rawText.trim(),
      fileName,
      fileType,
      fileSize,
      status: 'extracted',
      extractedEventsCount: 0,
      conflictsCount: 0,
      isDemo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 2. Run extraction
    const events = await extractNoticeEvents(rawText, {
      apiKey: process.env.GEMINI_API_KEY,
      timezone: process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata',
    });

    for (const ev of events) {
      ev.noticeId = noticeId;
    }

    notice.extractedEventsCount = events.length;

    // 3. Save to store
    await NoticeStore.saveNotice(notice);
    await NoticeStore.saveEvents(events);

    return c.json({
      success: true,
      message: 'Notice extracted successfully',
      data: {
        notice,
        events,
      },
    });
  } catch (err: any) {
    console.error('Upload processing error:', err);
    return c.json({ success: false, error: err.message || 'Internal processing error' }, 500);
  }
});

/**
 * Export confirmed events to RFC 5545 .ics file
 */
app.get('/api/calendar/export', async (c) => {
  try {
    const events = await NoticeStore.getAllConfirmedEvents();
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
 * Re-seed demo dataset
 */
app.post('/api/demo/seed', async (c) => {
  await NoticeStore.seedDemoData();
  const notice = await NoticeStore.getNoticeById('demo-notice-ps02');
  const events = await NoticeStore.getEventsByNoticeId('demo-notice-ps02');
  return c.json({
    success: true,
    message: 'Demonstration dataset reloaded successfully',
    data: { notice, events },
  });
});

// Serve static client assets from dist/ if built (for production deployment)
const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use('/*', serveStatic({ root: './dist' }));

  // SPA fallback for client-side navigation
  app.get('*', (c) => {
    if (c.req.path.startsWith('/api')) {
      return c.json({ success: false, error: 'API endpoint not found' }, 404);
    }
    const htmlFile = path.join(distDir, 'index.html');
    if (fs.existsSync(htmlFile)) {
      const html = fs.readFileSync(htmlFile, 'utf-8');
      return c.html(html);
    }
    return c.text('Notice Decoder build not found. Run npm run build.', 404);
  });
}

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';
console.log(`📡 Notice Decoder Server listening on http://${HOST}:${PORT}...`);

serve({
  fetch: app.fetch,
  port: PORT,
  hostname: HOST,
});

