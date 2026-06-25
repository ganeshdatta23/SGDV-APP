-- Darshan Backend: Spiritual Activity Schema Migration
-- This script safely migrates from old spiritual_logs to new spiritual_activity table
-- with daily aggregation to prevent redundancy

-- ============================================================================
-- STEP 1: Create new spiritual_activity table (daily aggregation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS spiritual_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    
    -- Daily counts for each activity type
    japa_count INTEGER DEFAULT 0,
    pranayama_count INTEGER DEFAULT 0,
    darshan_count INTEGER DEFAULT 0,
    
    -- Track when each activity was last updated today
    japa_last_updated TIMESTAMPTZ,
    pranayama_last_updated TIMESTAMPTZ,
    darshan_last_updated TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: One entry per user per day
    CONSTRAINT unique_user_activity_date UNIQUE(user_id, activity_date)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_spiritual_activity_user_id ON spiritual_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_spiritual_activity_user_date ON spiritual_activity(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_spiritual_activity_date ON spiritual_activity(activity_date);

-- ============================================================================
-- STEP 2: Create spiritual_activity_history table (audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS spiritual_activity_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('japa', 'pranayama', 'darshan')),
    count_added INTEGER NOT NULL,
    activity_date DATE NOT NULL,
    notes TEXT,
    location_id UUID REFERENCES saved_locations(id) ON DELETE SET NULL,
    logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for history queries
CREATE INDEX IF NOT EXISTS idx_activity_history_user ON spiritual_activity_history(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_history_type ON spiritual_activity_history(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_history_date ON spiritual_activity_history(activity_date);

-- ============================================================================
-- STEP 3: Migrate data from spiritual_logs to spiritual_activity
-- ============================================================================
-- This aggregates all logs by user and date
INSERT INTO spiritual_activity (user_id, activity_date, japa_count, pranayama_count, darshan_count, 
                                 japa_last_updated, pranayama_last_updated, darshan_last_updated,
                                 created_at, updated_at)
SELECT 
    user_id,
    DATE(logged_at) as activity_date,
    SUM(CASE WHEN log_type = 'japa' THEN count ELSE 0 END) as japa_count,
    SUM(CASE WHEN log_type = 'pranayama' THEN count ELSE 0 END) as pranayama_count,
    SUM(CASE WHEN log_type = 'darshan' THEN count ELSE 0 END) as darshan_count,
    MAX(CASE WHEN log_type = 'japa' THEN logged_at END) as japa_last_updated,
    MAX(CASE WHEN log_type = 'pranayama' THEN logged_at END) as pranayama_last_updated,
    MAX(CASE WHEN log_type = 'darshan' THEN logged_at END) as darshan_last_updated,
    MIN(logged_at) as created_at,
    MAX(logged_at) as updated_at
FROM spiritual_logs
GROUP BY user_id, DATE(logged_at)
ON CONFLICT (user_id, activity_date) DO NOTHING;

-- ============================================================================
-- STEP 4: Migrate history data
-- ============================================================================
INSERT INTO spiritual_activity_history (user_id, activity_type, count_added, activity_date, notes, location_id, logged_at)
SELECT 
    user_id,
    log_type as activity_type,
    count as count_added,
    DATE(logged_at) as activity_date,
    notes,
    location_id,
    logged_at
FROM spiritual_logs;

-- ============================================================================
-- STEP 5: Create view for user spiritual statistics (for admin dashboard)
-- ============================================================================
CREATE OR REPLACE VIEW user_spiritual_stats AS
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    u.full_name,
    u.is_admin,
    u.is_active,
    u.created_at as user_created_at,
    COALESCE(SUM(sa.japa_count), 0) as total_japa,
    COALESCE(SUM(sa.pranayama_count), 0) as total_pranayama,
    COALESCE(SUM(sa.darshan_count), 0) as total_darshan,
    COALESCE(SUM(sa.japa_count) + SUM(sa.pranayama_count) + SUM(sa.darshan_count), 0) as total_activities,
    MAX(GREATEST(
        sa.japa_last_updated,
        sa.pranayama_last_updated,
        sa.darshan_last_updated
    )) as last_activity_at,
    COUNT(DISTINCT sa.activity_date) as active_days,
    DATE(MAX(sa.activity_date)) as last_activity_date
FROM users u
LEFT JOIN spiritual_activity sa ON u.id = sa.user_id
GROUP BY u.id, u.username, u.email, u.full_name, u.is_admin, u.is_active, u.created_at;

-- ============================================================================
-- STEP 6: Drop old table (only after verification!)
-- ============================================================================
-- UNCOMMENT THIS LINE ONLY AFTER VERIFYING MIGRATION WAS SUCCESSFUL:
-- DROP TABLE IF EXISTS spiritual_logs;

-- ============================================================================
-- VERIFICATION QUERIES (run these to verify migration)
-- ============================================================================

-- Check if data was migrated correctly
-- SELECT COUNT(*) as total_activities FROM spiritual_activity;
-- SELECT COUNT(*) as total_history FROM spiritual_activity_history;

-- View user statistics
-- SELECT * FROM user_spiritual_stats ORDER BY total_activities DESC LIMIT 10;

-- Check for a specific user's daily activity
-- SELECT * FROM spiritual_activity WHERE user_id = '51070825-5372-4843-8569-19a5157f47df' ORDER BY activity_date DESC;
