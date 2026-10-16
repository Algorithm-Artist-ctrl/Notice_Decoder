import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

try {
  if (fs.existsSync('.env.local')) {
    process.loadEnvFile?.('.env.local');
  } else if (fs.existsSync('.env')) {
    process.loadEnvFile?.('.env');
  }
} catch (e) {
  // Ignored
}

async function runMigrations() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.includes('ep-sample-pooler')) {
    console.log('⚠️ DATABASE_URL not set or contains sample placeholder. Skipping remote Neon migration.');
    console.log('ℹ️ Notice Decoder will use its built-in local persistent store.');
    return;
  }

  console.log('🚀 Running database migrations against Neon PostgreSQL...');
  const sql = neon(dbUrl);
  const schemaPath = path.resolve(process.cwd(), 'src/db/schema.sql');
  const ddl = fs.readFileSync(schemaPath, 'utf-8');

  try {
    // Neon HTTP API doesn't support multi-statement execute in one call unless split or using raw query
    const statements = ddl
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      await sql(statement);
    }
    console.log('✅ Migrations applied successfully to Neon!');
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigrations();
