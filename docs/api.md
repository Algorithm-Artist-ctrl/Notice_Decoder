# Notice Decoder — REST API Reference

All Notice Decoder API endpoints use standard HTTP status codes, require standard JSON or `multipart/form-data` payloads, and return uniform JSON responses.

---

## 1. Authentication Endpoints

### 1.1 Sign Up
`POST /api/auth/sign-up`

Registers a new user account. Does not require a university email domain; personal email providers are accepted.

- **Request Headers**:
  `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "StrongPassword123!",
    "name": "Jane Doe"
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "token": "a1b2c3d4...",
      "user": {
        "id": "usr-uuid...",
        "email": "user@example.com",
        "name": "Jane Doe"
      }
    }
    ```
  - `400 Bad Request`: Validation failure (e.g., password length < 8, invalid email).

---

### 1.2 Sign In
`POST /api/auth/sign-in`

Authenticates existing user credentials and issues a secure session token.

- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "StrongPassword123!"
  }
  ```
- **Responses**:
  - `200 OK`: Returns session token and user object.
  - `401 Unauthorized`: Invalid email or password.

---

### 1.3 Get Current Session
`GET /api/auth/session`

Retrieves the currently authenticated user profile from the session token.

- **Request Headers**:
  `Authorization: Bearer <token>` or `Cookie: session_token=<token>`
- **Responses**:
  - `200 OK` (Authenticated): `{ "success": true, "user": { "id": "...", "email": "...", "name": "..." } }`
  - `200 OK` (Unauthenticated): `{ "success": true, "user": null }`

---

### 1.4 Sign Out
`POST /api/auth/sign-out`

Invalidates the active session token in Neon PostgreSQL and Better Auth.

- **Request Headers**:
  `Authorization: Bearer <token>`
- **Responses**:
  - `200 OK`: `{ "success": true, "message": "Signed out successfully" }`

---

### 1.5 Delete Account & Permanent Data Wipe
`DELETE /api/auth/account`

Permanently deletes the authenticated user's account and executes cascading deletion across all owned documents, extracted events, personal reminders, preferences, and session tokens.

- **Request Headers**:
  `Authorization: Bearer <token>`
- **Responses**:
  - `200 OK`: `{ "success": true, "message": "Account and associated records permanently deleted" }`
  - `401 Unauthorized`: Session required.

---

## 2. Document & Notice Endpoints

### 2.1 List Notices
`GET /api/notices`

Lists notices for the current session. Authenticated users see their private records plus public demo records; unauthenticated users see only public demo records.

- **Request Headers**:
  `Authorization: Bearer <token>` (optional)
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "doc-1729...",
        "title": "Executive Strategy Sync",
        "documentType": "office_memo",
        "documentDomain": "corporate",
        "analysisCase": "A",
        "summary": "...",
        "status": "confirmed",
        "extractedEventsCount": 2,
        "createdAt": "2026-10-18T00:00:00.000Z"
      }
    ]
  }
  ```

---

### 2.2 Upload & Analyze Document
`POST /api/notices/upload`

Uploads and processes a document using multimodal AI or deterministic OCR/NLP extraction. Supports multipart file upload (PDF, PNG, JPG, JPEG) or JSON text.

- **Request Headers**:
  - For files: `Content-Type: multipart/form-data`
  - For raw text: `Content-Type: application/json`
  - `Authorization: Bearer <token>` (required in production)
- **Multipart Form Fields**:
  - `file`: Binary file (max 10 MB)
  - `title`: (Optional) Document title
- **JSON Body**:
  ```json
  {
    "title": "Optional Title",
    "text": "Meeting on 25 Nov 2026 from 10:00 to 11:30..."
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Document analyzed and extracted successfully",
    "data": {
      "notice": { ... },
      "events": [ ... ],
      "analysis": { ... },
      "extractionMethod": "google_gemini-3.8-flash"
    }
  }
  ```

---

### 2.3 Multilingual Translation
`POST /api/notices/:id/translate`

Generates and caches an executive summary in the requested target language.

- **Request Body**:
  ```json
  {
    "language": "hinglish"
  }
  ```
  *(Supported languages: `english`, `hinglish`, `hindi`)*
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "noticeId": "doc-1729...",
      "language": "hinglish",
      "summary": "Department of IT ka Midterm Exam 25 Nov 2026 ko 09:00 se 11:00 baje tak Room 101 me conduct hoga..."
    }
  }
  ```

---

### 2.4 Confirm Notice Schedule
`POST /api/notices/:id/confirm`

Confirms all human-reviewed extracted events for a notice and commits them to the official user schedule.

- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "All notice events confirmed and saved into schedule",
    "data": [ ... ]
  }
  ```

---

### 2.5 Delete Notice
`DELETE /api/notices/:id`

Permanently deletes a private notice and its dependent extracted events. Sample public notices cannot be deleted (returns 403).

---

## 3. Reminders Endpoints

### 3.1 List Reminders
`GET /api/reminders`

Returns all personal reminders for the authenticated user.

---

### 3.2 Create Reminder
`POST /api/reminders`

- **Request Body**:
  ```json
  {
    "title": "Submit Quarterly Report",
    "description": "Include budget sheets and revenue projections",
    "date": "2026-11-20",
    "startTime": "09:00",
    "endTime": "10:00",
    "deadlineTime": null,
    "location": "Finance Portal",
    "alertTime": "08:30",
    "recurrence": "none"
  }
  ```

---

### 3.3 Update Reminder
`PATCH /api/reminders/:id`

Updates fields such as `isCompleted`, `date`, `startTime`, or `title`.

---

### 3.4 Delete Reminder
`DELETE /api/reminders/:id`

Permanently deletes a personal reminder.

---

## 4. Conflict & Calendar Endpoints

### 4.1 Conflict Analysis
`GET /api/conflicts?noticeId=<optional_id>`

Evaluates all confirmed commitments and returns calculated overlaps with deterministic mathematical proofs.

---

### 4.2 iCalendar Export
`GET /api/calendar/export`

Returns an RFC 5545 compliant `.ics` calendar file stream (`Content-Type: text/calendar; charset=utf-8`) containing all confirmed commitments, formatted for Google Calendar, Apple Calendar, and Outlook.
