import { spawn, ChildProcess } from 'child_process';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);

if (isProduction) {
  console.log('🚀 [Notice Decoder] Production / Cloud environment detected.');
  console.log('📡 Starting full-stack unified Hono server (API + Static Assets)...');

  const serverProc = spawn('npx', ['tsx', 'server/index.ts'], {
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });

  serverProc.on('exit', (code) => {
    process.exit(code ?? 0);
  });
} else {
  console.log('⚡ [Notice Decoder] Local Development Environment');
  console.log('📡 Starting Hono API Server on http://0.0.0.0:3000 and Vite Dev Server on http://0.0.0.0:5173...');

  const children: ChildProcess[] = [];

  // 1. Start Backend API Server
  const backend = spawn('npx', ['tsx', 'watch', 'server/index.ts'], {
    stdio: 'inherit',
    env: { ...process.env, PORT: '3000' },
    shell: true,
  });
  children.push(backend);

  // 2. Start Vite Dev Server
  const frontend = spawn('npx', ['vite', '--host', '0.0.0.0'], {
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });
  children.push(frontend);

  const cleanup = () => {
    for (const child of children) {
      if (child && !child.killed) {
        try {
          child.kill('SIGTERM');
        } catch {}
      }
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);

  backend.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`Backend process exited with code ${code}`);
    }
  });

  frontend.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`Frontend process exited with code ${code}`);
    }
  });
}
