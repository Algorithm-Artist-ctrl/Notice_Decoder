/**
 * Notice Decoder — Resilient Shared Typed API Client
 * 
 * Safely parses JSON and non-JSON responses, handles empty bodies,
 * attaches correlation IDs (x-request-id), handles retryable errors,
 * and attaches Authorization Bearer tokens.
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  [key: string]: any;
}

export class ApiError extends Error {
  public status: number;
  public correlationId: string;
  public retryable: boolean;
  public details?: any;

  constructor(status: number, message: string, correlationId: string, retryable = false, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.correlationId = correlationId;
    this.retryable = retryable;
    this.details = details;
  }
}

/**
 * Generates an 8-character unique request correlation ID
 */
export function generateCorrelationId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `req-${ts}-${rand}`;
}

/**
 * Safely reads response and parses as typed JSON without crashing on empty or HTML bodies
 */
export async function parseResponse<T = any>(res: Response, correlationId: string): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();

  if (!text || text.trim().length === 0) {
    if (res.ok) {
      return { success: true } as unknown as T;
    }
    const isRetryable = res.status >= 500 || res.status === 429;
    throw new ApiError(
      res.status,
      `Server returned HTTP ${res.status} with empty response body.`,
      correlationId,
      isRetryable
    );
  }

  // Attempt JSON parsing
  let json: any = null;
  const isJson = contentType.includes('application/json');

  try {
    json = JSON.parse(text);
  } catch {
    // If not valid JSON
    const isRetryable = res.status >= 500 || res.status === 429;
    const preview = text.length > 120 ? `${text.substring(0, 120)}...` : text;
    if (!res.ok) {
      throw new ApiError(
        res.status,
        `Server error (HTTP ${res.status}): ${preview.replace(/<[^>]*>/g, '').trim() || 'Non-JSON error response'}`,
        correlationId,
        isRetryable
      );
    }
    throw new ApiError(
      res.status,
      `Received non-JSON response from server (expected JSON): ${preview.slice(0, 80)}`,
      correlationId,
      false
    );
  }

  // Check HTTP status code
  if (!res.ok) {
    const isRetryable = res.status >= 500 || res.status === 429;
    const errorMsg = json?.error || json?.message || `Request failed with HTTP ${res.status}`;
    throw new ApiError(res.status, errorMsg, correlationId, isRetryable, json);
  }

  return json as T;
}

/**
 * Gets authentication headers
 */
export function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extraHeaders };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('notice_decoder_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

/**
 * Typed API Client
 */
export const apiClient = {
  async get<T = any>(url: string, options: { signal?: AbortSignal; headers?: Record<string, string> } = {}): Promise<T> {
    const correlationId = generateCorrelationId();
    const headers = getAuthHeaders({
      'x-request-id': correlationId,
      ...(options.headers || {}),
    });

    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: options.signal,
    });

    return parseResponse<T>(res, correlationId);
  },

  async post<T = any>(url: string, body?: any, options: { signal?: AbortSignal; headers?: Record<string, string> } = {}): Promise<T> {
    const correlationId = generateCorrelationId();
    const headers = getAuthHeaders({
      'Content-Type': 'application/json',
      'x-request-id': correlationId,
      ...(options.headers || {}),
    });

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: body !== undefined ? JSON.stringify(body) : JSON.stringify({}),
      signal: options.signal,
    });

    return parseResponse<T>(res, correlationId);
  },

  async put<T = any>(url: string, body?: any, options: { signal?: AbortSignal; headers?: Record<string, string> } = {}): Promise<T> {
    const correlationId = generateCorrelationId();
    const headers = getAuthHeaders({
      'Content-Type': 'application/json',
      'x-request-id': correlationId,
      ...(options.headers || {}),
    });

    const res = await fetch(url, {
      method: 'PUT',
      headers,
      body: body !== undefined ? JSON.stringify(body) : JSON.stringify({}),
      signal: options.signal,
    });

    return parseResponse<T>(res, correlationId);
  },

  async patch<T = any>(url: string, body?: any, options: { signal?: AbortSignal; headers?: Record<string, string> } = {}): Promise<T> {
    const correlationId = generateCorrelationId();
    const headers = getAuthHeaders({
      'Content-Type': 'application/json',
      'x-request-id': correlationId,
      ...(options.headers || {}),
    });

    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: body !== undefined ? JSON.stringify(body) : JSON.stringify({}),
      signal: options.signal,
    });

    return parseResponse<T>(res, correlationId);
  },

  async delete<T = any>(url: string, options: { signal?: AbortSignal; headers?: Record<string, string> } = {}): Promise<T> {
    const correlationId = generateCorrelationId();
    const headers = getAuthHeaders({
      'x-request-id': correlationId,
      ...(options.headers || {}),
    });

    const res = await fetch(url, {
      method: 'DELETE',
      headers,
      signal: options.signal,
    });

    return parseResponse<T>(res, correlationId);
  },

  async upload<T = any>(url: string, formData: FormData, options: { signal?: AbortSignal; headers?: Record<string, string> } = {}): Promise<T> {
    const correlationId = generateCorrelationId();
    const headers = getAuthHeaders({
      'x-request-id': correlationId,
      ...(options.headers || {}),
    });
    // Do NOT set Content-Type header so browser automatically sets multipart/form-data boundary

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      signal: options.signal,
    });

    return parseResponse<T>(res, correlationId);
  },
};
