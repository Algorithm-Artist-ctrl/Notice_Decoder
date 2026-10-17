# Deployment & Operations Guide

**Notice Decoder** — Cloudflare & Neon Deployment Guide

---

## 1. Render Deployment (Recommended)
Notice Decoder deploys to Render as a Unified Web Service running Hono and serving the optimized React frontend.

### Step 1: Create Web Service on Render
1. Connect your repository (`Algorithm-Artist-ctrl/Notice_Decoder`) to [Render](https://dashboard.render.com).
2. Configure settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start` (or `npm run dev` — our smart runner auto-detects Render)
   - **Branch**: `main`

### Step 2: Configure Environment Variables
Set the following keys in the Render Dashboard under **Environment**:
```bash
NODE_ENV=production
DATABASE_URL=postgresql://neondb_owner:***@ep-dry-pond-a1s9q608-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:***@ep-dry-pond-a1s9q608.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
AWS_ACCESS_KEY_ID=***
AWS_SECRET_ACCESS_KEY=***
AWS_ENDPOINT_URL_S3=https://storage.ap-southeast-1.neon.tech
AWS_REGION=ap-southeast-1
NEON_FUNCTION_HELLO_BASE_URL=https://br-small-mouse-b32qy2kp-hello.compute.c-4.ap-southeast-1.aws.neon.tech
DEFAULT_TIMEZONE=Asia/Kolkata
# Optional for Google AI Studio Gemini API:
GEMINI_API_KEY=***
```

### Step 3: Zero-Config Port Binding
Notice Decoder reads Render's dynamic `$PORT` environment variable and binds to `0.0.0.0:$PORT` automatically.

---

## 2. Cloudflare Pages / Workers Deployment

Notice Decoder is designed to run seamlessly on the Cloudflare edge runtime.

### Step 1: Install Wrangler CLI
```bash
npm install -g wrangler
wrangler login
```

### Step 2: Configure Secrets
Set the required secrets in Cloudflare (never commit these to Git):
```bash
wrangler secret put DATABASE_URL
wrangler secret put GEMINI_API_KEY
```

### Step 3: Build & Deploy
```bash
npm run build
wrangler pages deploy dist --project-name notice-decoder
```

---

## 3. Neon Serverless PostgreSQL & Cloud Services Configuration

### Step 1: Neon Services Provisioning
1. Initialize and provision Neon services:
   ```bash
   neon init -y --org-id <org-id> --project-id <project-id> --branch production --services postgres,auth,object-storage,functions
   neon deploy
   ```
2. Neon automatically deploys:
   - Serverless PostgreSQL with connection pooling
   - S3-compatible private Object Storage bucket (`assets`)
   - Serverless Functions (`hello`)

### Step 2: Run Database Migrations
```bash
npm run db:migrate
```

### Step 3: Seed Demonstration Data
```bash
npm run db:seed
```

---

## 4. Environment Variables Reference

| Variable | Description | Required? | Default / Fallback |
| :--- | :--- | :--- | :--- |
| `PORT` | Local or Cloud server port | Injected by Render | `3000` |
| `NODE_ENV` | Runtime environment mode | Recommended | `development` / `production` |
| `DATABASE_URL` | Neon Serverless PostgreSQL pooled connection string | Recommended | Activates high-reliability local file store if omitted |
| `DATABASE_URL_UNPOOLED` | Neon PostgreSQL direct connection string | Optional | Used for migrations |
| `AWS_ACCESS_KEY_ID` | Neon S3 Object Storage access key | Optional | Cloud file archiving disabled if omitted |
| `AWS_SECRET_ACCESS_KEY` | Neon S3 Object Storage secret key | Optional | Cloud file archiving disabled if omitted |
| `AWS_ENDPOINT_URL_S3` | Neon S3 Object Storage endpoint | Optional | `https://storage.ap-southeast-1.neon.tech` |
| `AWS_REGION` | Neon S3 region | Optional | `ap-southeast-1` |
| `NEON_FUNCTION_HELLO_BASE_URL` | Neon Serverless Function base URL | Optional | Deployed function endpoint |
| `GEMINI_API_KEY` | Google AI Studio API key for Gemini 2.5 Flash entity parsing | Optional | Uses deterministic NLP/heuristic parser if omitted |
| `DEFAULT_TIMEZONE` | Default timezone for interval normalization | No | `Asia/Kolkata` |


---

## 4. Local Health Verification

Check backend and database health with:
```bash
curl http://localhost:3000/api/health
```

Expected JSON response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "app": "Notice Decoder",
  "tagline": "Your academic schedule, made clear.",
  "system": {
    "database": { ... },
    "aiExtraction": { ... },
    "calendar": { "format": "RFC 5545 iCalendar (.ics)", "status": "ready" }
  }
}
```
