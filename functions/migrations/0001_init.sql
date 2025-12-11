-- D1 schema for Haus-sita
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  owner TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('inbox','planned','today','done')),
  effort INTEGER NOT NULL,
  category TEXT NOT NULL,
  time_mode TEXT NOT NULL CHECK (time_mode IN ('flexible','fixed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  due_date TEXT,
  planned_date TEXT,
  is_project INTEGER NOT NULL DEFAULT 0,
  parent_id TEXT REFERENCES tasks(id),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS task_priorities (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  priority TEXT NOT NULL CHECK (priority IN ('none','low','medium','high')),
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_planned_date ON tasks(planned_date);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);

-- Seed the two household users if they are not present.
INSERT OR IGNORE INTO users (id, name, color) VALUES
  ('you', 'You', '#3b82f6'),
  ('partner', 'Partner', '#f59e0b');
