# Notice Decoder — Security Architecture & Guidelines

This document outlines the security controls, authentication mechanisms, data integrity safeguards, and threat modeling implemented across Notice Decoder.

---

## 1. Authentication & Session Management

### 1.1 Credential Storage & Hashing
- Plaintext passwords are never stored in databases, logs, caches, or memory.
- Password hashes are computed using cryptographic `scrypt` hashing with a 16-byte cryptographically random salt (`crypto.randomBytes(16)`), executing 64-byte key derivations:
  ```ts
  crypto.scryptSync(password, salt, 64).toString('hex')
  ```
- Comparison checks utilize timing-safe byte equality (`crypto.timingSafeEqual`) to prevent timing attack side channels.

### 1.2 Session Token Life Cycle
- Session tokens are generated using 32 bytes of secure entropy (`crypto.randomBytes(32).toString('hex')`).
- Tokens are stored in Neon PostgreSQL's `neon_auth.session` table with explicit `expiresAt` expiration timestamps (default 7 days).
- Tokens are transmitted via `Authorization: Bearer <token>` or encrypted `SameSite=Lax` HTTP cookies.
- Server-side token invalidation immediately purges sessions from the database upon logout.

---

## 2. Authorization & Record Ownership Isolation

### 2.1 Multi-Tenant Data Isolation
Every user-owned resource in Notice Decoder (documents, extracted events, personal reminders, preferences) is strictly bound to the authenticated owner's `user_id`.

- **Read Operations**: Queries filter by `user_id = $userId`. Users cannot view another user's documents even by guessing sequential or random IDs.
- **Write / Patch Operations**: Updates verify that `id = $id AND user_id = $userId`. Unauthorized attempts return `404 Not Found` or `403 Forbidden`.
- **Delete Operations**: Deletions enforce ownership and cascade to dependent records (e.g. deleting a notice deletes its extracted events).
- **Anonymous Guest Quarantine**: Unauthenticated visitors have access only to public demo scenarios and the Landing page; private uploads and reminder creation require authentication.

---

## 3. Injection Prevention & Input Sanitization

### 3.1 SQL Injection Prevention
All database queries in [`src/db/store.ts`](file:///Users/tarun/Documents/Notice_Decoder/src/db/store.ts) utilize tagged template literals provided by `@neondatabase/serverless`:
```ts
await neon`
  SELECT * FROM notices 
  WHERE id = ${noticeId} AND user_id = ${userId}
  LIMIT 1;
`;
```
Parameters are passed out-of-band via protocol-level parameter binding, neutralizing SQL injection vectors.

### 3.2 File Validation & Magic Byte Enforcement
File uploads enforce strict safety gates before any parsing occurs:
1. **Size Limits**: Enforced 10 MB maximum payload cap (`10 * 1024 * 1024` bytes) verified on both client and server before disk/memory buffering.
2. **Binary Magic Bytes**: File contents are inspected for authentic file headers:
   - PDF: Must begin with `%PDF` (`0x25, 0x50, 0x44, 0x46`).
   - PNG: Must begin with `\x89PNG` (`0x89, 0x50, 0x4E, 0x47`).
   - JPEG: Must begin with `\xFF\xD8\xFF`.
   Files with renamed extensions or spoofed MIME types are rejected immediately with HTTP 400.

### 3.3 Prompt Injection Defense & Untrusted Content
Document text parsed by OCR or text extractors is treated strictly as **untrusted user data**. The LLM prompt explicitly wraps the document content in quarantined delimiters:
- Text is isolated from system instructions.
- The model is instructed to treat instructions inside the document strictly as descriptive evidence, preventing prompt overrides.

---

## 4. Secret Management & Information Leakage

### 4.1 Server-Only Credentials
- `DATABASE_URL`, `GEMINI_API_KEY`, and S3 storage keys are accessed strictly on the server side (`process.env`) and are **never bundled into client JavaScript or exposed to Vite**.
- The `SettingsView` frontend status panel displays clean, non-sensitive operational indicators (`PostgreSQL Online`, `Active Engine`) and never prints raw connection strings, usernames, or internal database URLs.

### 4.2 Git Repository Hygiene
- All `.env`, `.env.local`, `.pem`, and certificate files are excluded in `.gitignore`.
- `.env.example` contains only descriptive placeholders.
- The repository git history contains zero committed API keys or real production database passwords.
