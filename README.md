# Notice Decoder

> **Turn College Notices into Clear, Conflict-Free Schedules.**  
> Built by **Byte_Brains** for Problem Statement **PS-02**.

---

## Overview

College students and departments manage critical academic timetables through unstructured circulars—scanned notices, PDF attachments, and informal messaging channels. Manually reading these notices often leads to missed submission deadlines and conflicting exam or lecture commitments.

**Notice Decoder** bridges the gap between chaotic circular prose and standard calendar software. It combines document intake (PDF text extraction and OCR for image scans), AI and rule-based entity extraction, side-by-side human-in-the-loop verification, deterministic interval conflict mathematics, and universal RFC 5545 `.ics` export.

---

## Key Capabilities

1. **Intake & OCR**: Handles text-based PDFs, mobile camera snapshots, and pasted text with an enforced 10 MB per-file size boundary.
2. **Provenance & Source Evidence**: Links every extracted date, time, venue, and audience field directly back to the supporting sentence in the original circular.
3. **Deterministic Conflict Arithmetic**: Evaluates timetable overlaps strictly through half-open interval mathematics:
   $$\text{overlap} = [A_{\text{start}}, A_{\text{end}}) \cap [B_{\text{start}}, B_{\text{end}})$$
   - Events touching only at endpoints (e.g., 10:00–11:30 and 11:30–13:00) produce **zero false alarms**.
   - Deadlines are treated as discrete time points ($E_{\text{start}} \le D < E_{\text{end}}$), clearly distinguished from event-to-event collisions.
4. **Universal Calendar Compatibility**: Generates standard RFC 5545 `.ics` files compatible with Google Calendar, Apple Calendar, and Microsoft Outlook.
5. **Persistence**: Server-side storage backed by Neon Serverless PostgreSQL with versioned SQL migrations and high-reliability local file fallback.

---

## Demonstration Dataset (PS-02 Ground Truth)

Notice Decoder comes pre-configured with the official PS-02 fictional demonstration dataset:

* **Notice Date**: 13 November 2026
* **Event 1 (Exam)**: Internal Test 2 · 10:00 AM – 11:30 AM · Room 204
* **Event 2 (Lecture)**: Guest Lecture: AI in Healthcare · 11:00 AM – 12:30 PM · Seminar Hall
* **Event 3 (Deadline)**: Lab Record Submission Deadline · 12:00 noon · Department Office

### Verified Results:
* **Hard Overlap**: Internal Test 2 overlaps with Guest Lecture from **11:00 AM to 11:30 AM** (30 minutes duration).
* **Deadline Warning**: Lab record submission at 12:00 noon lands inside the Guest Lecture block.
* **Endpoint Independence**: The test finishes at 11:30 AM and does not falsely collide with the 12:00 noon deadline.

---

## Project Structure

```
notice-decoder/
├── db/
│   ├── schema.sql             # Neon PostgreSQL DDL migration
│   ├── connection.ts          # Serverless Neon client & connection testing
│   ├── store.ts               # Dual-mode persistence layer (Neon + Local fallback)
│   ├── migrate.ts             # Migration runner script
│   └── seed.ts                # PS-02 demonstration dataset seeder
├── server/
│   └── index.ts               # Hono REST API server (Cloudflare / Node runtime)
├── src/
│   ├── components/            # Reusable UI components (Navbar, Footer, Modals)
│   ├── lib/
│   │   ├── conflict-engine.ts # Deterministic half-open interval conflict engine
│   │   ├── extractor.ts       # AI (Gemini 2.5) & heuristic NLP circular parser
│   │   └── ics-exporter.ts    # RFC 5545 .ics generator & serializer
│   ├── types/                 # Strict TypeScript definitions & Zod validation schemas
│   ├── views/                 # Application views (Landing, Dashboard, Upload, Review, Conflicts, Schedule, History, Settings)
│   ├── App.tsx                # Master app routing & global state
│   ├── main.tsx               # Client entry point
│   └── index.css              # Tailwind CSS directives & tokens
├── tests/
│   ├── conflict-engine.test.ts# 12 edge-case conflict arithmetic unit tests
│   ├── ics-exporter.test.ts   # RFC 5545 serializer tests
│   ├── extractor.test.ts      # Ground-truth entity extraction tests
│   └── api.test.ts            # Persistence & store integration tests
├── .env.example               # Template environment configuration
├── .gitignore                 # Protected secret & build rules
├── package.json               # Dependencies & scripts
├── tsconfig.json              # Strict TypeScript compiler options
├── tailwind.config.js         # Design system tokens
└── vite.config.ts             # Vite bundler & API proxy configuration
```

---

## Quick Start (Local Development)

### 1. Prerequisites
- Node.js v18+ (tested on v24)
- npm v9+

### 2. Installation
```bash
git clone https://github.com/Byte_Brains/notice-decoder.git
cd notice-decoder
npm install
```

### 3. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```
*(The application runs 100% locally out of the box with built-in persistent storage even without external API keys or credentials).*

### 4. Run Demonstration Database Seed
```bash
npm run db:seed
```

### 5. Start Application
In terminal 1, start the API backend:
```bash
npm run server
```
In terminal 2, start the Vite development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Automated Test Suite

Run all 26 automated unit and integration tests:
```bash
npm test
```

### Test Coverage Highlights:
- **Conflict Engine**: Identical intervals, partial overlaps, complete containment, adjacent boundaries (zero false-positives), distinct dates, missing end times, overnight midnight crossings, timezone normalization, and deadline-point intersections.
- **iCalendar**: RFC 5545 structure, special character escaping, timezone formatting, and point alarms.
- **Extractor**: 100% extraction accuracy on PS-02 ground-truth sample.

---

## Production Build

```bash
npm run build
```
This runs strict TypeScript type checking (`tsc`) followed by Vite optimization, creating the deployable assets in `dist/`.

---

## Team & Attribution
- **Team**: Byte_Brains
- **Track**: PS-02 (Notice Decoder)
- **Status**: Production-Ready MVP
