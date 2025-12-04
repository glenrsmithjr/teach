-- Modules table
CREATE TABLE IF NOT EXISTS modules(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    subject_area TEXT,
    learning_objectives TEXT DEFAULT '{}',
    sequence_order INTEGER NOT NULL,
    tutors TEXT DEFAULT '{}',
    module_type TEXT CHECK (module_type IN ('lesson', 'quiz', 'practice', 'assessment', 'other')),
    prerequisites TEXT DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
