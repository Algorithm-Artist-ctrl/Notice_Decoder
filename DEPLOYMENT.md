# Deployment & Operations Guide

**Notice Decoder**  
**Team:** Byte_Brains · **Repository:** `notice-decoder`

---

## 1. Cloudflare Pages / Workers Deployment

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

## 2. Neon Serverless PostgreSQL Configuration

### Step 1: Create a Database on Neon
1. Log in to [Neon Console](https://console.neon.tech).
2. Create a new project named `notice-decoder`.
3. Copy your Pooled Connection String (`postgresql://user:password@ep-...neon.tech/notice_decoder?sslmode=require`).

### Step 2: Run Migrations
Set `DATABASE_URL` in your `.env` and execute:
```bash
npm run db:migrate
```

### Step 3: Seed Demonstration Data
```bash
npm run db:seed
```

---

## 3. Environment Variables Reference

| Variable | Description | Required? | Default / Fallback |
| :--- | :--- | :--- | :--- |
| `PORT` | Local API server port | No | `3000` |
| `DATABASE_URL` | Neon Serverless PostgreSQL pooled connection string | Recommended | Activates high-reliability local file store if omitted |
| `GEMINI_API_KEY` | Google AI Studio API key for Gemini 2.5 Flash entity parsing | Optional | Uses deterministic NLP/heuristic parser if omitted |
| `DEFAULT_TIMEZONE` | Default timezone for interval normalization | No | `Asia/Kolkata` |
| `NODE_ENV` | Runtime environment mode | No | `development` |

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
  "team": "Byte_Brains",
  "app": "Notice Decoder",
  "system": {
    "database": { ... },
    "aiExtraction": { ... },
    "calendar": { "format": "RFC 5545 iCalendar (.ics)", "status": "ready" }
  }
}
```
