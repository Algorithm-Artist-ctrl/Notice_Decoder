import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseResponse, apiClient, ApiError, generateCorrelationId } from '../src/lib/api-client';

describe('Shared Typed API Client & Response Parsing Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generates unique correlation IDs', () => {
    const id1 = generateCorrelationId();
    const id2 = generateCorrelationId();
    expect(id1).toMatch(/^req-[a-z0-9]+-[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });

  it('parses valid JSON success (HTTP 200) without throwing', async () => {
    const mockResponse = new Response(JSON.stringify({ success: true, data: { count: 42 } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    const parsed = await parseResponse(mockResponse, 'req-test-1');
    expect(parsed).toEqual({ success: true, data: { count: 42 } });
  });

  it('handles empty response body gracefully on 200 OK', async () => {
    const mockResponse = new Response('', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    const parsed = await parseResponse(mockResponse, 'req-test-2');
    expect(parsed).toEqual({ success: true });
  });

  it('handles empty response body on HTTP 500 without crashing with Unexpected end of JSON', async () => {
    const createMock = () => new Response('', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });

    try {
      await parseResponse(createMock(), 'req-test-3');
      expect.fail('Should have thrown ApiError');
    } catch (err: any) {
      expect(err.name).toBe('ApiError');
      expect(err.status).toBe(500);
      expect(err.retryable).toBe(true);
      expect(err.message).toContain('HTTP 500 with empty response body');
      expect(err.correlationId).toBe('req-test-3');
    }
  });

  it('handles HTML error response (e.g. 502 Bad Gateway / Cloudflare error page)', async () => {
    const htmlBody = '<!DOCTYPE html><html><body><h1>502 Bad Gateway</h1><p>Reverse proxy timeout</p></body></html>';
    const mockResponse = new Response(htmlBody, {
      status: 502,
      headers: { 'Content-Type': 'text/html' },
    });

    try {
      await parseResponse(mockResponse, 'req-test-4');
      expect.fail('Should have thrown ApiError');
    } catch (err: any) {
      expect(err.name).toBe('ApiError');
      expect(err.status).toBe(502);
      expect(err.retryable).toBe(true);
      expect(err.message).toContain('502');
      expect(err.message).toContain('Bad Gateway');
    }
  });

  it('parses HTTP 400 Bad Request JSON errors accurately', async () => {
    const mockResponse = new Response(JSON.stringify({ success: false, error: 'Title is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    try {
      await parseResponse(mockResponse, 'req-test-5');
      expect.fail('Should have thrown ApiError');
    } catch (err: any) {
      expect(err.status).toBe(400);
      expect(err.retryable).toBe(false);
      expect(err.message).toBe('Title is required');
    }
  });

  it('parses HTTP 401 Unauthorized errors accurately', async () => {
    const mockResponse = new Response(JSON.stringify({ success: false, error: 'Invalid email or password' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });

    try {
      await parseResponse(mockResponse, 'req-test-6');
      expect.fail('Should have thrown ApiError');
    } catch (err: any) {
      expect(err.status).toBe(401);
      expect(err.retryable).toBe(false);
      expect(err.message).toBe('Invalid email or password');
    }
  });

  it('parses HTTP 404 Not Found errors accurately', async () => {
    const mockResponse = new Response(JSON.stringify({ success: false, error: 'Notice not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });

    try {
      await parseResponse(mockResponse, 'req-test-7');
      expect.fail('Should have thrown ApiError');
    } catch (err: any) {
      expect(err.status).toBe(404);
      expect(err.retryable).toBe(false);
      expect(err.message).toBe('Notice not found');
    }
  });

  it('parses HTTP 413 Payload Too Large accurately', async () => {
    const mockResponse = new Response(JSON.stringify({ success: false, error: 'File size exceeds 10MB limit' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    });

    try {
      await parseResponse(mockResponse, 'req-test-8');
      expect.fail('Should have thrown ApiError');
    } catch (err: any) {
      expect(err.status).toBe(413);
      expect(err.retryable).toBe(false);
      expect(err.message).toContain('10MB limit');
    }
  });

  it('parses HTTP 429 Rate Limit Exceeded as retryable', async () => {
    const mockResponse = new Response(JSON.stringify({ success: false, error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });

    try {
      await parseResponse(mockResponse, 'req-test-9');
      expect.fail('Should have thrown ApiError');
    } catch (err: any) {
      expect(err.status).toBe(429);
      expect(err.retryable).toBe(true);
    }
  });

  it('parses HTTP 500 Internal Server Error as retryable', async () => {
    const mockResponse = new Response(JSON.stringify({ success: false, error: 'Neon database connection timeout' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });

    try {
      await parseResponse(mockResponse, 'req-test-10');
      expect.fail('Should have thrown ApiError');
    } catch (err: any) {
      expect(err.status).toBe(500);
      expect(err.retryable).toBe(true);
      expect(err.message).toBe('Neon database connection timeout');
    }
  });
});
