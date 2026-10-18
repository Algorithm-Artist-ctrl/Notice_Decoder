# Notice Decoder — Local Setup & Development Guide

This guide details instructions for setting up, configuring, running, and testing Notice Decoder on a local machine.

---

## 1. Prerequisites

Before starting, ensure you have the following installed:
- **Node.js**: Version 20.x, 22.x, or 24.x (`node -v`)
- **npm**: Version 10.x or higher (`npm -v`)
- **Git**: For version control (`git --version`)
- **Neon PostgreSQL Account**: Free tier at [https://console.neon.tech](https://console.neon.tech) (optional for offline mode, required for full cloud persistence)
- **Google AI Studio API Key**: Free API key at [https://aistudio.google.com](https://aistudio.google.com) (optional for heuristic fallback, required for multimodal AI extraction)

---

## 2. Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Algorithm-Artist-ctrl/Notice_Decoder.git
   cd Notice_Decoder
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

---

## 3. Environment Configuration

1. **Create an environment file**:
   ```bash
   cp .env.example .env
   ```

2. **Configure your environment variables**:
   Open `.env` in your editor and configure the parameters:

   ```bash
   # Server Port
   PORT=3000

   # Client Application URL (for CORS and Auth headers)
   CLIENT_URL=http://localhost:5173

   # Node Environment
   NODE_ENV=development

   # Neon PostgreSQL Connection String (pooled with SSL required)
   DATABASE_URL=postgresql://<username>:<password>@<ep-pooler-host>.neon.tech/<database_name>?sslmode=require

   # Google Gemini API Key
   GEMINI_API_KEY=your_gemini_api_key_here

   # Gemini Model (optional, defaults to gemini-3.8-flash)
   GEMINI_MODEL=gemini-3.8-flash

   # Default Timezone for parsing and export
   DEFAULT_TIMEZONE=Asia/Kolkata
   ```

---

## 4. Database Setup & Migrations

If `DATABASE_URL` is configured, database migrations execute automatically when the server boots. You can also run migrations manually:

```bash
npm run db:migrate
```

To seed initial sample evaluation data (optional):
```bash
npm run db:seed
```

---

## 5. Running the Application

### Development Mode (Full-Stack)
Runs both the Vite development client with Hot Module Replacement (HMR) and the Hono API server concurrently:
```bash
npm run dev
```
- Frontend application: `http://localhost:5173`
- Backend API server: `http://localhost:3000`

### Backend Server Only
Runs only the Hono API server:
```bash
npm run server
```

### Production Build & Preview
To test the production build locally:
```bash
npm run build
npm start
```
The server will build the client assets into `dist/` and serve both the API and client at `http://localhost:3000`.

---

## 6. Testing & Quality Assurance

Notice Decoder comes with a comprehensive Vitest test suite covering full-stack integration, Hono REST endpoints, authentication isolation, conflict calculations, and iCalendar export:

```bash
# Run full automated test suite
npm test

# Run tests in watch mode
npm run test:watch

# Run TypeScript strict type-check
npm run typecheck

# Run linter
npm run lint
```
