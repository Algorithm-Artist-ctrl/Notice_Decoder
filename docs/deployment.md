# Notice Decoder — Production Deployment Guide

This guide details instructions for deploying Notice Decoder to production using **Render** and **Neon Serverless PostgreSQL**.

---

## 1. Neon Database Setup

1. **Log in to Neon Console**:
   Visit [https://console.neon.tech](https://console.neon.tech) and create a project named `notice-decoder`.
2. **Retrieve Connection String**:
   - In your Project Dashboard, copy the **Pooled connection string**.
   - Ensure `sslmode=require` is present in the connection string parameters:
     ```
     postgresql://<username>:<password>@<ep-pooler-host>.neon.tech/<database_name>?sslmode=require
     ```
3. **Database Schema & Migrations**:
   Notice Decoder executes schema migrations automatically when the server boots. No manual SQL scripts need to be run prior to first launch.

---

## 2. Render Deployment (Web Service)

### Method A: Blueprint Deployment via `render.yaml` (Recommended)
1. Fork or push this repository to GitHub.
2. In the Render Dashboard ([https://dashboard.render.com](https://dashboard.render.com)), navigate to **Blueprints** and select **New Blueprint Instance**.
3. Connect your repository. Render will automatically parse [`render.yaml`](file:///Users/tarun/Documents/Notice_Decoder/render.yaml):
   - **Runtime**: Node.js
   - **Build Command**: `npm install --include=dev && npm run build`
   - **Start Command**: `npm start`
4. Add the required environment variables in the Render Dashboard:
   - `DATABASE_URL`: Your pooled Neon connection string.
   - `GEMINI_API_KEY`: Your Google AI Studio API key.
   - `GEMINI_MODEL`: `gemini-3.8-flash` (optional, default).
   - `DEFAULT_TIMEZONE`: `Asia/Kolkata` (or your desired default).
5. Click **Apply**. Render will install dependencies, build the production Vite bundle, and boot the Hono server.

### Method B: Manual Web Service Setup
1. In Render Dashboard, click **New +** > **Web Service**.
2. Connect your GitHub repository.
3. Configure the settings:
   - **Name**: `notice-decoder`
   - **Environment**: `Node`
   - **Region**: Closest to your database (e.g., `Singapore` or `Oregon`)
   - **Branch**: `main`
   - **Build Command**: `npm install --include=dev && npm run build`
   - **Start Command**: `npm start`
4. Under **Environment Variables**, add `DATABASE_URL`, `GEMINI_API_KEY`, `NODE_ENV=production`, and `DEFAULT_TIMEZONE`.
5. Click **Create Web Service**.

---

## 3. Post-Deployment Verification Checklist

Once Render indicates that the service is live:
1. **Health Telemetry**:
   Visit `https://<your-render-subdomain>.onrender.com/api/health` and verify:
   - `status: "ok"`
   - `database.connected: true`
   - `aiExtraction.apiKeyConfigured: true`
2. **Landing Page Access**:
   Open the root URL. The public landing page with the 3D notice visualizer should render without errors.
3. **Demo Sandbox Test**:
   Click **Try Interactive Demo** in the hero. Verify that the 4 scenarios load and display the calculated 30-minute clash and point deadline.
4. **Authentication Flow**:
   Click **Upload Document**; confirm that the authentication modal opens. Register an account with a personal email, sign in, and verify redirection to the upload interface.
5. **Document Extraction & Summary**:
   Upload a sample PDF or paste a meeting announcement. Verify that extracted events, summary languages (English, Hinglish, Hindi), and conflict calculations function properly.
6. **Schedule & Reminders**:
   Confirm extracted events and add a manual reminder. Verify both persist upon page refresh.
