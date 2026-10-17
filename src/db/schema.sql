-- Notice Decoder Database Schema
-- Version: 001_initial_schema.sql
-- Target: Neon Serverless PostgreSQL / Standard PostgreSQL 15+

-- 1. Notices Table
CREATE TABLE IF NOT EXISTS notices (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    title VARCHAR(255) NOT NULL,
    raw_text TEXT NOT NULL,
    file_name VARCHAR(255),
    file_type VARCHAR(32) NOT NULL DEFAULT 'text',
    file_size INTEGER,
    status VARCHAR(32) NOT NULL DEFAULT 'extracted',
    error_message TEXT,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notices_status ON notices(status);
CREATE INDEX IF NOT EXISTS idx_notices_created_at ON notices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notices_user_id ON notices(user_id);

-- 2. Events Table (Extracted and Confirmed events)
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(64) PRIMARY KEY,
    notice_id VARCHAR(64) REFERENCES notices(id) ON DELETE CASCADE,
    user_id VARCHAR(64),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(32) NOT NULL,
    kind VARCHAR(32) NOT NULL DEFAULT 'timed_event',
    date DATE NOT NULL,
    start_time VARCHAR(8),
    end_time VARCHAR(8),
    deadline_time VARCHAR(8),
    venue VARCHAR(255),
    department_or_audience VARCHAR(255),
    source_text_evidence TEXT NOT NULL,
    confidence NUMERIC(3, 2) NOT NULL DEFAULT 0.90,
    review_required BOOLEAN NOT NULL DEFAULT FALSE,
    review_reasons JSONB DEFAULT '[]'::jsonb,
    is_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
    timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_notice_id ON events(notice_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_is_confirmed ON events(is_confirmed);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);

-- 3. Conflicts Cache Table
CREATE TABLE IF NOT EXISTS conflicts_cache (
    id VARCHAR(64) PRIMARY KEY,
    notice_id VARCHAR(64) REFERENCES notices(id) ON DELETE CASCADE,
    conflict_type VARCHAR(64) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    event_a_id VARCHAR(64) REFERENCES events(id) ON DELETE CASCADE,
    event_b_id VARCHAR(64) REFERENCES events(id) ON DELETE CASCADE,
    overlap_start VARCHAR(8),
    overlap_end VARCHAR(8),
    overlap_minutes INTEGER NOT NULL DEFAULT 0,
    explanation TEXT NOT NULL,
    math_proof TEXT NOT NULL,
    suggested_action TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conflicts_notice_id ON conflicts_cache(notice_id);

-- 4. Document-to-Action Platform Extensions
ALTER TABLE notices ADD COLUMN IF NOT EXISTS document_type VARCHAR(64) DEFAULT 'general_document';
ALTER TABLE notices ADD COLUMN IF NOT EXISTS document_domain VARCHAR(64) DEFAULT 'general';
ALTER TABLE notices ADD COLUMN IF NOT EXISTS analysis_case VARCHAR(8) DEFAULT 'E';
ALTER TABLE notices ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE notices ADD COLUMN IF NOT EXISTS key_information JSONB DEFAULT '[]'::jsonb;
ALTER TABLE notices ADD COLUMN IF NOT EXISTS directives JSONB DEFAULT '[]'::jsonb;
ALTER TABLE notices ADD COLUMN IF NOT EXISTS required_actions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE notices ADD COLUMN IF NOT EXISTS contacts_references JSONB DEFAULT '[]'::jsonb;
ALTER TABLE notices ADD COLUMN IF NOT EXISTS actionable_items_count INTEGER DEFAULT 0;
ALTER TABLE notices ADD COLUMN IF NOT EXISTS summary_english TEXT;
ALTER TABLE notices ADD COLUMN IF NOT EXISTS summary_hinglish TEXT;
ALTER TABLE notices ADD COLUMN IF NOT EXISTS summary_hindi TEXT;

CREATE INDEX IF NOT EXISTS idx_notices_document_type ON notices(document_type);
CREATE INDEX IF NOT EXISTS idx_notices_document_domain ON notices(document_domain);

-- 5. Event Item Type & Generalization
ALTER TABLE events ADD COLUMN IF NOT EXISTS item_type VARCHAR(32) DEFAULT 'timed_event';
CREATE INDEX IF NOT EXISTS idx_events_item_type ON events(item_type);

-- 6. User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id VARCHAR(64) PRIMARY KEY,
    timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    preferred_language VARCHAR(32) NOT NULL DEFAULT 'english',
    reminder_lead_time_minutes INTEGER NOT NULL DEFAULT 30,
    notification_preferences JSONB DEFAULT '{"email": false, "calendar": true, "push": false}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(32) DEFAULT 'english';

-- 7. Reminders Table (User-created and document-linked reminders)
CREATE TABLE IF NOT EXISTS reminders (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    notice_id VARCHAR(64) REFERENCES notices(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    start_time VARCHAR(8),
    end_time VARCHAR(8),
    deadline_time VARCHAR(8),
    location VARCHAR(255),
    reminder_date_time TIMESTAMP WITH TIME ZONE,
    recurrence VARCHAR(32) DEFAULT 'none',
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    is_manual BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(date);
CREATE INDEX IF NOT EXISTS idx_reminders_notice_id ON reminders(notice_id);

