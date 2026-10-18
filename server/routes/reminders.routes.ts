import { Hono } from 'hono';
import { verifySession } from '../../src/lib/auth-server';
import { resolveSessionUserId } from '../middleware/auth';
import { NoticeStore } from '../../src/db/store';

const router = new Hono();

/**
 * List reminders for active session/user
 */
router.get('/', async (c) => {
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
router.post('/', async (c) => {
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
router.patch('/:id', async (c) => {
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
router.delete('/:id', async (c) => {
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

export { router as remindersRoutes };
