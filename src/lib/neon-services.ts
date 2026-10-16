import fs from 'fs';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// Load .env.local or .env if present
try {
  if (fs.existsSync('.env.local')) {
    process.loadEnvFile?.('.env.local');
  } else if (fs.existsSync('.env')) {
    process.loadEnvFile?.('.env');
  }
} catch {
  // Ignored
}

// S3 Client configured for Neon Object Storage
let s3Client: S3Client | null = null;

export function getNeonS3Client(): S3Client | null {
  if (s3Client) return s3Client;

  if (process.env.AWS_ENDPOINT_URL_S3 && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    s3Client = new S3Client({
      forcePathStyle: true,
      endpoint: process.env.AWS_ENDPOINT_URL_S3,
      region: process.env.AWS_REGION || 'ap-southeast-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    return s3Client;
  }
  return null;
}

/**
 * Uploads a file to Neon Object Storage
 */
export async function uploadToNeonStorage(
  key: string,
  data: Buffer | Uint8Array,
  contentType: string = 'application/octet-stream',
  bucket: string = 'assets'
): Promise<{ key: string; bucket: string; url: string } | null> {
  const s3 = getNeonS3Client();
  if (!s3) return null;

  try {
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
    }));

    const url = `${process.env.AWS_ENDPOINT_URL_S3}/${bucket}/${key}`;
    return { key, bucket, url };
  } catch (err: any) {
    console.warn('Neon storage upload warning:', err.message);
    return null;
  }
}

/**
 * Invokes the deployed Neon Function
 */
export async function invokeNeonHelloFunction(): Promise<{ success: boolean; data?: string; error?: string }> {
  const baseUrl = process.env.NEON_FUNCTION_HELLO_BASE_URL;
  if (!baseUrl) {
    return { success: false, error: 'NEON_FUNCTION_HELLO_BASE_URL not configured' };
  }

  try {
    const res = await fetch(baseUrl);
    const text = await res.text();
    return { success: res.ok, data: text };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Gets overall Neon services telemetry
 */
export async function getNeonServicesDiagnostics() {
  const s3Available = Boolean(process.env.AWS_ENDPOINT_URL_S3 && process.env.AWS_ACCESS_KEY_ID);
  const authAvailable = Boolean(process.env.NEON_AUTH_BASE_URL);
  const functionAvailable = Boolean(process.env.NEON_FUNCTION_HELLO_BASE_URL);

  let functionStatus = 'unconfigured';
  if (functionAvailable) {
    const res = await invokeNeonHelloFunction();
    functionStatus = res.success ? `online (${res.data?.trim()})` : `error: ${res.error}`;
  }

  return {
    branch: process.env.NEON_BRANCH || 'production',
    postgres: {
      driver: '@neondatabase/serverless',
      configured: Boolean(process.env.DATABASE_URL),
    },
    auth: {
      provider: 'Managed Better Auth (neon_auth schema)',
      configured: authAvailable,
      baseUrl: process.env.NEON_AUTH_BASE_URL || null,
      jwksUrl: process.env.NEON_AUTH_JWKS_URL || null,
    },
    objectStorage: {
      provider: 'Neon S3-Compatible Object Storage',
      configured: s3Available,
      bucket: 'assets',
      endpoint: process.env.AWS_ENDPOINT_URL_S3 || null,
      region: process.env.AWS_REGION || null,
    },
    functions: {
      provider: 'Neon Serverless Compute (Long-Running)',
      configured: functionAvailable,
      helloFunctionUrl: process.env.NEON_FUNCTION_HELLO_BASE_URL || null,
      status: functionStatus,
    },
  };
}
