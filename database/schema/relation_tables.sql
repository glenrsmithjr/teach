-- Course Learners junction table
CREATE TABLE IF NOT EXISTS course_learners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    learner_id INTEGER NOT NULL,
    enrolled_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1, -- if course is active and learner accessed system within last 30 days
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE,
    UNIQUE(course_id, learner_id)
);

-- Course Modules junction table
CREATE TABLE IF NOT EXISTS course_modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    module_id INTEGER NOT NULL,
    assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date DATE,
    is_required INTEGER DEFAULT 1,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    UNIQUE(course_id, module_id)
);

-- Module Tutors junction table
CREATE TABLE IF NOT EXISTS module_tutors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER NOT NULL,
    tutor_id INTEGER NOT NULL,
    assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date DATE, -- defaults to due date of module if not given
    is_required INTEGER DEFAULT 1,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    FOREIGN KEY (tutor_id) REFERENCES tutors(id) ON DELETE CASCADE,
    UNIQUE(module_id, tutor_id)
);

-- Learner Tutors table
CREATE TABLE IF NOT EXISTS learner_tutors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    learner_id INTEGER NOT NULL,
    tutor_id INTEGER NOT NULL,
    first_access TIMESTAMP,
    last_access TIMESTAMP,
    num_times_accessed INTEGER NOT NULL,
    completion_percentage REAL DEFAULT 0,
    progress_data TEXT DEFAULT '{}',
    FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE,
    FOREIGN KEY (tutor_id) REFERENCES tutors(id) ON DELETE CASCADE,
    UNIQUE(learner_id, tutor_id)
);

-- Create indexes --

-- Course Learners
CREATE INDEX IF NOT EXISTS idx_course_learners_course_id ON course_learners(course_id);
CREATE INDEX IF NOT EXISTS idx_course_learners_learner_id ON course_learners(learner_id);
-- Course Modules
CREATE INDEX IF NOT EXISTS idx_course_modules_course_id ON course_modules(course_id);
-- Learner Tutors
CREATE INDEX IF NOT EXISTS idx_learner_tutors_learner_id ON learner_tutors(learner_id);
CREATE INDEX IF NOT EXISTS idx_learner_tutors_tutor_id ON learner_tutors(tutor_id);
