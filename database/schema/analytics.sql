-- Learner Sessions table
CREATE TABLE IF NOT EXISTS learner_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    learner_tutor_id INTEGER NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_minutes INTEGER,
    session_data TEXT DEFAULT '{}',
    module_progress TEXT DEFAULT '{}',
    FOREIGN KEY (learner_tutor_id) REFERENCES learner_tutors(id) ON DELETE CASCADE
);

-- Session Activities table
CREATE TABLE IF NOT EXISTS session_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    activity_type TEXT NOT NULL,
    activity_data TEXT DEFAULT '{}',
    score REAL,
    feedback TEXT,
    FOREIGN KEY (session_id) REFERENCES learner_sessions(id) ON DELETE CASCADE
);

-- Performance Metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    learner_id INTEGER NOT NULL,
    tutor_id INTEGER NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    contextual_data TEXT DEFAULT '{}',
    FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE,
    FOREIGN KEY (tutor_id) REFERENCES tutors(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_learner_sessions_learner_tutor_id ON learner_sessions(learner_tutor_id);
CREATE INDEX IF NOT EXISTS idx_learner_sessions_start_time ON learner_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_session_activities_session_id ON session_activities(session_id);
CREATE INDEX IF NOT EXISTS idx_session_activities_timestamp ON session_activities(timestamp);
CREATE INDEX IF NOT EXISTS idx_session_activities_activity_type ON session_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_learner_id ON performance_metrics(learner_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_tutor_id ON performance_metrics(tutor_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_recorded_at ON performance_metrics(recorded_at);

