-- ============================================================================
-- FACE RECOGNITION ATTENDANCE SYSTEM - SUPABASE POSTGRESQL SCHEMA
-- Real-time Facial Detection & Recognition Attendance Platform
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Vector extension (optional if pgvector is enabled on Supabase project)
-- CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. MEMBERS TABLE (STUDENTS & EMPLOYEES)
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id VARCHAR(50) UNIQUE NOT NULL,      -- e.g., 'STU-2026-001' or 'EMP-1042'
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(30),
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'employee')),
    department VARCHAR(100) NOT NULL,            -- e.g., 'Computer Science', 'Human Resources'
    designation VARCHAR(100),                   -- e.g., '3rd Year B.Tech' or 'Senior Engineer'
    batch_or_shift VARCHAR(50) DEFAULT 'General',-- e.g., 'Morning Shift (09:00 - 17:00)'
    avatar_url TEXT,                            -- Supabase Storage bucket URL
    face_embedding JSONB,                       -- 128-dimensional float array stored as JSONB
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ATTENDANCE LOGS TABLE
CREATE TABLE IF NOT EXISTS attendance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id VARCHAR(50) NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    member_name VARCHAR(150) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'employee')),
    department VARCHAR(100) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    check_out_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'late', 'half_day', 'absent')),
    confidence NUMERIC(5, 2) DEFAULT 95.00,     -- Recognition confidence % (e.g. 98.40)
    verification_mode VARCHAR(30) DEFAULT 'face_recognition', -- 'face_recognition', 'manual', 'kiosk_webcam'
    snapshot_url TEXT,                          -- Snapshot captured during attendance check
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default Settings
INSERT INTO system_settings (key, value, description)
VALUES 
    ('recognition_threshold', '0.52'::jsonb, 'Face recognition distance threshold (lower is stricter, recommended 0.45 - 0.55)'),
    ('cooldown_minutes', '5'::jsonb, 'Minimum minutes required between consecutive check-ins to prevent duplicates'),
    ('late_cutoff_time', '"09:15:00"'::jsonb, 'Time after which arrival is marked as Late'),
    ('allow_multi_checkin', 'false'::jsonb, 'Allow multiple check-ins on the same day or toggle check-in / check-out')
ON CONFLICT (key) DO NOTHING;

-- 4. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_members_role ON members(role);
CREATE INDEX IF NOT EXISTS idx_members_department ON members(department);
CREATE INDEX IF NOT EXISTS idx_members_member_id ON members(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_logs(date);
CREATE INDEX IF NOT EXISTS idx_attendance_member_id ON attendance_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_logs(status);
CREATE INDEX IF NOT EXISTS idx_attendance_created_at ON attendance_logs(created_at DESC);

-- 5. ANALYTICAL VIEWS
CREATE OR REPLACE VIEW view_today_attendance_summary AS
SELECT 
    COUNT(*) AS total_checkins,
    COUNT(CASE WHEN role = 'student' THEN 1 END) AS student_checkins,
    COUNT(CASE WHEN role = 'employee' THEN 1 END) AS employee_checkins,
    COUNT(CASE WHEN status = 'present' THEN 1 END) AS on_time_count,
    COUNT(CASE WHEN status = 'late' THEN 1 END) AS late_count,
    ROUND(AVG(confidence), 2) AS avg_confidence
FROM attendance_logs
WHERE date = CURRENT_DATE;

CREATE OR REPLACE VIEW view_department_attendance_today AS
SELECT 
    department,
    role,
    COUNT(*) AS present_count
FROM attendance_logs
WHERE date = CURRENT_DATE
GROUP BY department, role;

-- 6. SUPABASE STORAGE BUCKETS (Run in Supabase Storage setup or SQL)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('attendance-avatars', 'attendance-avatars', true) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('attendance-snapshots', 'attendance-snapshots', true) ON CONFLICT DO NOTHING;

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Allow public / anon read and write for standard kiosk and attendance operations
CREATE POLICY "Public Read Members" ON members FOR SELECT USING (true);
CREATE POLICY "Public Insert/Update Members" ON members FOR ALL USING (true);

CREATE POLICY "Public Read Attendance" ON attendance_logs FOR SELECT USING (true);
CREATE POLICY "Public Insert Attendance" ON attendance_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Attendance" ON attendance_logs FOR UPDATE USING (true);

CREATE POLICY "Public Read Settings" ON system_settings FOR SELECT USING (true);
CREATE POLICY "Public Update Settings" ON system_settings FOR ALL USING (true);
