-- Tutors table
CREATE TABLE IF NOT EXISTS tutors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instructor_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    subject_area TEXT,
    prerequisites TEXT DEFAULT '{}',
    content TEXT DEFAULT '{}',
    settings TEXT DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_published INTEGER DEFAULT 0,
    is_online INTEGER DEFAULT 0,
    version TEXT DEFAULT '1.0'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tutors_subject_area ON tutors(subject_area);
CREATE INDEX IF NOT EXISTS idx_tutors_is_published ON tutors(is_published);
