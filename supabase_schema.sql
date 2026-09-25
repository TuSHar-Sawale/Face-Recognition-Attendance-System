-- ============================================================================
-- FACE RECOGNITION ATTENDANCE SYSTEM - SUPABASE POSTGRESQL SCHEMA
-- Real-time Facial Detection & Recognition Attendance Platform
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE (AUTHENTICATION FOR PORTALS)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(150) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher', 'admin', 'employee')),
    member_id VARCHAR(50),
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(100),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Default Demo Users
INSERT INTO users (email, password, name, role, member_id, department, designation, avatar_url)
VALUES 
    ('admin@school.edu', 'admin123', 'Arthur Vance', 'admin', 'ADM-001', 'Administration', 'Head of Administration', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=256'),
    ('teacher@school.edu', 'teacher123', 'Dr. Vikram Malhotra', 'teacher', 'TCH-2001', 'Computer Science', 'Associate Professor', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=256'),
    ('student@school.edu', 'student123', 'Aarav Sharma', 'student', 'STU-1001', 'Computer Science', '3rd Year B.Tech (AI & ML)', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=256')
ON CONFLICT (email) DO NOTHING;

-- 2. MEMBERS TABLE (STUDENTS, FACULTY & STAFF)
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id VARCHAR(50) UNIQUE NOT NULL,       -- e.g., 'STU-1001' or 'TCH-2001'
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(30),
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher', 'admin', 'employee')),
    department VARCHAR(100) NOT NULL,             -- e.g., 'Computer Science', 'Information Technology'
    designation VARCHAR(100),                    -- e.g., '3rd Year B.Tech' or 'Associate Professor'
    batch_or_shift VARCHAR(50) DEFAULT 'General', -- e.g., 'Batch 2024-28'
    avatar_url TEXT,                             -- Supabase Storage bucket URL
    face_embedding JSONB,                        -- 128-dimensional float array stored as JSONB
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Sample Member Profiles
INSERT INTO members (member_id, name, email, phone, role, department, designation, batch_or_shift, avatar_url)
VALUES 
    ('STU-1001', 'Aarav Sharma', 'student@school.edu', '+91 98765 43210', 'student', 'Computer Science', '3rd Year B.Tech (AI & ML)', 'Batch 2024-28', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=256'),
    ('STU-1002', 'Ananya Patel', 'ananya.p@school.edu', '+91 98765 43211', 'student', 'Computer Science', '3rd Year B.Tech (AI & ML)', 'Batch 2024-28', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=256'),
    ('STU-1003', 'Rohan Verma', 'rohan.v@school.edu', '+91 98765 43212', 'student', 'Information Technology', '2nd Year B.Tech (IT)', 'Batch 2025-29', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256'),
    ('TCH-2001', 'Dr. Vikram Malhotra', 'teacher@school.edu', '+91 98765 43220', 'teacher', 'Computer Science', 'Associate Professor', 'Faculty', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=256')
ON CONFLICT (member_id) DO NOTHING;

-- 3. ATTENDANCE LOGS TABLE
CREATE TABLE IF NOT EXISTS attendance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id VARCHAR(50) NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    member_name VARCHAR(150) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher', 'admin', 'employee')),
    department VARCHAR(100) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    check_out_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'late', 'half_day', 'absent')),
    confidence NUMERIC(5, 2) DEFAULT 95.00,      -- Recognition confidence % (e.g. 98.40)
    verification_mode VARCHAR(30) DEFAULT 'face_recognition', -- 'face_recognition', 'manual'
    snapshot_url TEXT,                           -- Snapshot captured during attendance check
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. SYSTEM SETTINGS TABLE
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

-- 5. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_members_role ON members(role);
CREATE INDEX IF NOT EXISTS idx_members_department ON members(department);
CREATE INDEX IF NOT EXISTS idx_members_member_id ON members(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_logs(date);
CREATE INDEX IF NOT EXISTS idx_attendance_member_id ON attendance_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_logs(status);
CREATE INDEX IF NOT EXISTS idx_attendance_created_at ON attendance_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 6. ANALYTICAL VIEWS
CREATE OR REPLACE VIEW view_today_attendance_summary AS
SELECT 
    COUNT(*) AS total_checkins,
    COUNT(CASE WHEN role = 'student' THEN 1 END) AS student_checkins,
    COUNT(CASE WHEN role = 'teacher' THEN 1 END) AS teacher_checkins,
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

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Allow application backend and client access
CREATE POLICY "Public Read Users" ON users FOR SELECT USING (true);
CREATE POLICY "Public Manage Users" ON users FOR ALL USING (true);

CREATE POLICY "Public Read Members" ON members FOR SELECT USING (true);
CREATE POLICY "Public Manage Members" ON members FOR ALL USING (true);

CREATE POLICY "Public Read Attendance" ON attendance_logs FOR SELECT USING (true);
CREATE POLICY "Public Insert Attendance" ON attendance_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Attendance" ON attendance_logs FOR UPDATE USING (true);

CREATE POLICY "Public Read Settings" ON system_settings FOR SELECT USING (true);
CREATE POLICY "Public Manage Settings" ON system_settings FOR ALL USING (true);
