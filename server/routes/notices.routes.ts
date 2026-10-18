import { Hono } from 'hono';
import { NoticeStore } from '../../src/db/store';
import { extractDocumentAnalysis, translateSummary } from '../../src/lib/extractor';
import { getGeminiModel } from '../../src/lib/ai-config';
import { generateICalendar } from '../../src/lib/ics-exporter';
import { NoticeRecord, ExtractedEvent } from '../../src/types';
import { uploadToNeonStorage } from '../../src/lib/neon-services';
import { verifySession } from '../../src/lib/auth-server';
import { resolveSessionUserId } from '../middleware/auth';
import { env } from '../config/env';
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';

const router = new Hono();

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
 * List all notices with user isolation:
 * - Authenticated: user's private notices + public demo notices
 * - Anonymous: ONLY public demo notices
 */
router.get('/notices', async (c) => {
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
router.get('/notices/:id', async (c) => {
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
router.post('/notices/:id/translate', async (c) => {
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
      summaryText = await translateSummary(baseSummary, targetLang, env.geminiApiKey);

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
 * Delete notice
 */
router.delete('/notices/:id', async (c) => {
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
router.get('/notices/:id/events', async (c) => {
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
router.patch('/events/:id', async (c) => {
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
router.delete('/events/:id', async (c) => {
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

/**
 * Confirm all events for a notice
 */
router.post('/notices/:id/confirm', async (c) => {
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
router.get('/schedule', async (c) => {
  try {
    const user = await verifySession(c);
    const sessionUserId = resolveSessionUserId(c, user);
    const events = await NoticeStore.getAllConfirmedEvents(sessionUserId);
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
router.get('/conflicts', async (c) => {
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
 */
router.post('/notices/upload', async (c) => {
  try {
    const user = await verifySession(c);
    const sessionUserId = resolveSessionUserId(c, user);
    if (!sessionUserId && env.isProduction) {
      return c.json({ success: false, error: 'Authentication required. Please sign in to upload and analyze documents.' }, 401);
    }

    const contentType = c.req.header('content-type') || '';
    let rawText = '';
    let fileName = 'UploadedNotice.txt';
    let fileType: 'pdf' | 'image' | 'text' = 'text';
    let fileSize = 0;
    let title = 'Uploaded Document';
    let isDemo = false;

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    let buffer: Buffer | null = null;

    if (contentType.includes('application/json')) {
      const body = await c.req.json();
      rawText = body.text || '';
      title = body.title || 'Uploaded Document';
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

    // Run AI/NLP analysis
    const analysis = await extractDocumentAnalysis(rawText, {
      apiKey: env.geminiApiKey,
      timezone: env.defaultTimezone,
    });

    const determinedTitle = title.trim() && title !== 'College Notice' && title !== 'Uploaded Notice' && title !== 'Uploaded Document'
      ? title.trim()
      : (analysis.documentTitle || 'Processed Document');

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

    await NoticeStore.saveNotice(notice);
    if (events.length > 0) {
      await NoticeStore.saveEvents(events, sessionUserId);
    }

    if (buffer) {
      uploadToNeonStorage(
        `notices/${noticeId}/${fileName}`,
        buffer,
        fileType === 'pdf' ? 'application/pdf' : 'image/jpeg'
      ).catch(e => console.warn('Background Neon storage upload warning:', e.message));
    }

    const hasGeminiKey = Boolean(env.geminiApiKey && env.geminiApiKey.length > 5);
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
 * Export confirmed events to RFC 5545 .ics file
 */
router.get('/calendar/export', async (c) => {
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

export { router as noticesRoutes };
