import fs from 'fs';

// Proactively load .env.local or .env in Node runtime if available
try {
  if (fs.existsSync('.env.local')) {
    process.loadEnvFile?.('.env.local');
  } else if (fs.existsSync('.env')) {
    process.loadEnvFile?.('.env');
  }
} catch {
  // Ignored in environments where loadEnvFile is unavailable or already loaded
}

export interface AppConfig {
  port: number;
  host: string;
  clientUrl: string;
  databaseUrl?: string;
  geminiApiKey?: string;
  geminiModel: string;
  defaultTimezone: string;
  nodeEnv: 'development' | 'production' | 'test';
  isProduction: boolean;
}

export const env: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: '0.0.0.0',
  clientUrl: process.env.CLIENT_URL || (process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER)
    ? 'https://noticedecoder.onrender.com'
    : 'http://localhost:5173'),
  databaseUrl: process.env.DATABASE_URL,
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  defaultTimezone: process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata',
  nodeEnv: (process.env.NODE_ENV as any) || 'development',
  isProduction: process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER),
};

/**
 * Validates required environment variables and logs actionable notices
 */
export function validateEnvironment(): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (!env.databaseUrl) {
    warnings.push('DATABASE_URL is not configured. Running in resilient offline mode.');
  } else if (env.databaseUrl.includes('user:password@ep-sample-pooler')) {
    warnings.push('DATABASE_URL is using placeholder sample connection string.');
  }

  if (!env.geminiApiKey || env.geminiApiKey.length < 5) {
    warnings.push('GEMINI_API_KEY is not configured. Entity extraction will use deterministic heuristic NLP engine.');
  }

  return {
    valid: true,
    warnings,
  };
}
