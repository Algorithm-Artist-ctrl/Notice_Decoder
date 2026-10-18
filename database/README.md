# Notice Decoder — Database & Schema Documentation

Notice Decoder utilizes **Neon Serverless PostgreSQL** as its primary persistent store.

---

## 1. Schema Definition

The complete production DDL schema is defined in [`src/db/schema.sql`](file:///Users/tarun/Documents/Notice_Decoder/src/db/schema.sql).

### Core Tables
1. **`notices`**:
   - `id`: VARCHAR(64) PRIMARY KEY
   - `user_id`: VARCHAR(64) (Indexed, isolates user documents)
   - `title`: VARCHAR(255)
   - `document_type`: VARCHAR(50) (e.g. `office_memo`, `exam_schedule`, `policy_directive`)
   - `document_domain`: VARCHAR(50) (e.g. `academic`, `corporate`, `government`, `legal`, `medical`)
   - `analysis_case`: VARCHAR(10) (Cases A through F)
   - `summary`: TEXT
   - `summary_english`: TEXT
   - `summary_hinglish`: TEXT
   - `summary_hindi`: TEXT
   - `raw_text`: TEXT
   - `status`: VARCHAR(50) (`review_required`, `confirmed`, `archived`)
   - `is_demo`: BOOLEAN DEFAULT false
   - `created_at`: TIMESTAMP WITH TIME ZONE
   - `updated_at`: TIMESTAMP WITH TIME ZONE

2. **`extracted_events`**:
   - `id`: VARCHAR(64) PRIMARY KEY
   - `notice_id`: VARCHAR(64) REFERENCES `notices(id)` ON DELETE CASCADE
   - `user_id`: VARCHAR(64) (Indexed, isolates user events)
   - `title`: VARCHAR(255)
   - `category`: VARCHAR(50) (`exam`, `lecture`, `deadline`, `meeting`, `interview`, `task`, `event`)
   - `kind`: VARCHAR(50) (`timed_event`, `deadline_point`, `multi_day`, `directive_only`)
   - `date`: DATE
   - `start_time`: TIME
   - `end_time`: TIME
   - `deadline_time`: TIME
   - `venue`: VARCHAR(255)
   - `is_confirmed`: BOOLEAN DEFAULT false
   - `confidence`: NUMERIC(3, 2)
   - `source_text_evidence`: TEXT

3. **`reminders`**:
   - `id`: VARCHAR(64) PRIMARY KEY
   - `user_id`: VARCHAR(64) NOT NULL (Indexed)
   - `notice_id`: VARCHAR(64)
   - `title`: VARCHAR(255) NOT NULL
   - `description`: TEXT
   - `date`: DATE NOT NULL
   - `start_time`: TIME
   - `end_time`: TIME
   - `deadline_time`: TIME
   - `location`: VARCHAR(255)
   - `alert_time`: TIME
   - `recurrence`: VARCHAR(50)
   - `is_manual`: BOOLEAN DEFAULT true
   - `is_completed`: BOOLEAN DEFAULT false

4. **`user_preferences`**:
   - `user_id`: VARCHAR(64) PRIMARY KEY
   - `preferred_language`: VARCHAR(20) DEFAULT 'english'
   - `timezone`: VARCHAR(50) DEFAULT 'Asia/Kolkata'
   - `reminder_lead_time_minutes`: INTEGER DEFAULT 30
   - `notification_preferences`: JSONB

---

## 2. Migrations

Migrations are automated through [`src/db/migrate.ts`](file:///Users/tarun/Documents/Notice_Decoder/src/db/migrate.ts).

- Migrations execute idempotently using `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
- The server automatically runs migrations on startup when a valid Neon database is connected.
- To execute migrations manually:
  ```bash
  npm run db:migrate
  ```
