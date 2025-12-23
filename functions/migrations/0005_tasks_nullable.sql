-- Relax NOT NULL constraints on optional task fields.
PRAGMA foreign_keys=OFF;

CREATE TABLE tasks_new (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  owner TEXT,
  status TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox','planned','today','done')),
  effort INTEGER,
  category TEXT,
  time_mode TEXT CHECK (time_mode IN ('flexible','fixed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  due_date TEXT,
  planned_date TEXT,
  is_project INTEGER NOT NULL DEFAULT 0,
  parent_id TEXT REFERENCES tasks(id),
  completed_at TEXT
);

INSERT INTO tasks_new (
  id,
  title,
  description,
  owner,
  status,
  effort,
  category,
  time_mode,
  created_at,
  due_date,
  planned_date,
  is_project,
  parent_id,
  completed_at
)
SELECT
  id,
  title,
  description,
  owner,
  status,
  effort,
  category,
  time_mode,
  created_at,
  due_date,
  planned_date,
  is_project,
  parent_id,
  completed_at
FROM tasks;

DROP TABLE tasks;

ALTER TABLE tasks_new RENAME TO tasks;

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_planned_date ON tasks(planned_date);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);

PRAGMA foreign_keys=ON;
