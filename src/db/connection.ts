import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import fs from 'fs';

try {
  if (fs.existsSync('.env.local')) {
    process.loadEnvFile?.('.env.local');
  } else if (fs.existsSync('.env')) {
    process.loadEnvFile?.('.env');
  }
} catch {
  // Ignored
}

export interface DatabaseStatus {
  configured: boolean;
  connected: boolean;
  provider: 'neon' | 'local_file';
  databaseUrlRedacted: string | null;
  error?: string;
}

let sqlClient: NeonQueryFunction<false, false> | null = null;
let connectionTested = false;
let isConnected = false;
let lastError: string | undefined = undefined;

/**
 * Redacts database URL credentials for safe diagnostics display
 */
export function redactDatabaseUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.password = '••••••••';
    return parsed.toString();
  } catch {
    return 'postgresql://••••:••••@••••/••••';
  }
}

/**
 * Checks Neon database connectivity
 */
export async function testNeonConnection(): Promise<DatabaseStatus> {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl || dbUrl.includes('user:password@ep-sample-pooler')) {
    connectionTested = true;
    isConnected = false;
    return {
      configured: false,
      connected: false,
      provider: 'local_file',
      databaseUrlRedacted: null,
      error: 'DATABASE_URL not configured. Running in high-reliability local persistent mode.',
    };
  }

  try {
    if (!sqlClient) {
      sqlClient = neon(dbUrl);
    }
    const result = await sqlClient`SELECT 1 as health_check;`;
    if (result && result.length > 0) {
      connectionTested = true;
      isConnected = true;
      lastError = undefined;
      return {
        configured: true,
        connected: true,
        provider: 'neon',
        databaseUrlRedacted: redactDatabaseUrl(dbUrl),
      };
    }
    throw new Error('No response from Neon ping query');
  } catch (err: any) {
    connectionTested = true;
    isConnected = false;
    lastError = err.message || 'Failed to connect to Neon database';
    return {
      configured: true,
      connected: false,
      provider: 'local_file',
      databaseUrlRedacted: redactDatabaseUrl(dbUrl),
      error: lastError,
    };
  }
}

export function getNeonClient(): NeonQueryFunction<false, false> | null {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes('user:password@ep-sample-pooler') || url.includes('ep-sample-pooler')) {
    return null;
  }
  if (!sqlClient) {
    sqlClient = neon(url);
  }
  return sqlClient;
}

export function getDatabaseStatus(): DatabaseStatus {
  return {
    configured: Boolean(process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('ep-sample-pooler')),
    connected: isConnected,
    provider: isConnected ? 'neon' : 'local_file',
    databaseUrlRedacted: redactDatabaseUrl(process.env.DATABASE_URL),
    error: lastError,
  };
}
