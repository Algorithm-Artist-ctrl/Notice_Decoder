/**
 * Centralized Google Gemini AI & LLM Model Configuration
 *
 * Defaults to the official stable high-intelligence model: gemini-3.8-flash
 * Supports environment variable overrides via GEMINI_MODEL.
 */

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

/**
 * Resolves the currently configured Gemini model identifier.
 */
export function getGeminiModel(): string {
  const envModel = process.env.GEMINI_MODEL?.trim();
  if (envModel && envModel.length > 0) {
    return envModel;
  }
  return DEFAULT_GEMINI_MODEL;
}

export interface AIErrorClassification {
  isTransient: boolean;
  statusCode?: number;
  userFacingMessage: string;
  technicalMessage: string;
}

/**
 * Classifies Google Gemini API error responses to prevent endless retries
 * of permanent 400/401/403/404 errors, and only backoff for transient 429/503.
 */
export function classifyGeminiError(err: any): AIErrorClassification {
  const message = String(err?.message || err || '');
  const status = Number(err?.status || err?.statusCode || 0);

  // 1. Missing / Invalid API Key
  if (status === 401 || /API_KEY_INVALID|invalid api key|unauthenticated/i.test(message)) {
    return {
      isTransient: false,
      statusCode: 401,
      userFacingMessage: 'Google Gemini API key is invalid or unauthorized. Please verify your GEMINI_API_KEY.',
      technicalMessage: message,
    };
  }

  // 2. Permission / Project Quota Blocked
  if (status === 403 || /PERMISSION_DENIED|permission denied/i.test(message)) {
    return {
      isTransient: false,
      statusCode: 403,
      userFacingMessage: 'Permission denied for Google Gemini API. Please check Google AI Studio project settings.',
      technicalMessage: message,
    };
  }

  // 3. Model Not Found / Obsolete Model (e.g. 404 for retired gemini-2.5-flash)
  if (status === 404 || /models\/.*not found|is no longer available|Resource not found/i.test(message)) {
    return {
      isTransient: false,
      statusCode: 404,
      userFacingMessage: `The configured Gemini model is unavailable. Update GEMINI_MODEL to '${DEFAULT_GEMINI_MODEL}'.`,
      technicalMessage: message,
    };
  }

  // 4. Rate Limits / Overload (Transient)
  if (status === 429 || /RESOURCE_EXHAUSTED|rate limit|quota exceeded|too many requests/i.test(message)) {
    return {
      isTransient: true,
      statusCode: 429,
      userFacingMessage: 'Google Gemini API rate limit or quota exceeded. Please wait a moment before trying again.',
      technicalMessage: message,
    };
  }

  // 5. Backend Server Errors (Transient)
  if (status === 503 || status === 500 || status === 502 || /overloaded|server error|unavailable|timed out/i.test(message)) {
    return {
      isTransient: true,
      statusCode: status || 503,
      userFacingMessage: 'Google AI Studio service temporarily busy or unavailable. Retrying with backoff.',
      technicalMessage: message,
    };
  }

  return {
    isTransient: false,
    statusCode: status || 500,
    userFacingMessage: `AI Document Analysis failed: ${message.slice(0, 160)}`,
    technicalMessage: message,
  };
}
