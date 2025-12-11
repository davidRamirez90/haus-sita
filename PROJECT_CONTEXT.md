# Haus-sita – Project Context for AI Development

You are an AI agent tasked with building **Haus-sita**, a small web app that helps a couple organize home tasks in a calm, non-overwhelming way.

This document gives you the **product context**, **architecture decisions**, **database schema**, and **API outline** you must follow while developing the monorepo.

---

## 1. Product Overview

**Name:** Haus-sita  
**Audience:** A couple (Colombian + German, but app should be generic for any two people who share a home).  
**Goal:** Reduce mental load around home tasks, not enforce “hyper productivity”.

### 1.1 Core Ideas

The app should:

- Let both users **capture, plan, and complete tasks** for their shared home.
- Keep tasks **small and finishable** → each task can be checked off.
- Support both:
    - Tasks that are tied to a **specific day** (fixed).
    - Tasks that are **flexible** within a time frame (due date but no exact day).
- Allow **per-user priority**:
    - Each user can set their own importance rating for a task.
    - We can compare what’s important to each.
- Use **categories**, including room-based ones (e.g. “room.baby”, “room.kitchen”), so the couple can filter by room/area.
- Support **projects (parent tasks) with subtasks**:
    - Example: `Finish the baby's room` has many child tasks.
    - Completing all subtasks shows progress on the parent.
- Use **color** heavily for conveying priority and ownership, while keeping UI visually minimal.

### 1.2 Core Concepts (Domain Model)

You must design around these entities:

- **User**
    - Minimal: ID, name, color.
    - In this first version we can assume 2 users, but schema should support more.

- **Task**
    - Always doable/finishable.
    - Has:
        - Owner (`you`, `partner`, or `both`).
        - Status: `inbox`, `planned`, `today`, `done`.
        - Effort in **quantized minutes** (not free-form).
        - Category (e.g., room-based or functional).
        - Time mode:
            - `flexible`: can be done anytime before `due_date`.
            - `fixed`: planned for a specific `planned_date`.
        - Optional `due_date`, `planned_date`.
        - Optional `parent_id` to form a project/subtask tree.
        - `is_project` flag for parent tasks (like “Finish baby’s room”).
        - `completed_at` timestamp when done.

- **Per-user priority**
    - Each user has their own priority value for each task.
    - Priority values: `none`, `low`, `medium`, `high`.

### 1.3 UI/UX Principles (for Frontend Agent)

- **Minimal layout**, lots of white space.
- **Colors carry meaning**:
    - Priority is encoded by hue/intensity.
    - Ownership uses each user’s personal color.
- Core views to support:
    1. **Today / Dashboard**
    2. **Inbox**
    3. **Weekly Planner**
    4. **Category / Room view**
    5. **Project detail view**

---

## 2. Technical Architecture

### 2.1 Hosting & Infrastructure

- **Frontend hosting:** Cloudflare Pages.
- **Backend/API:** Cloudflare Pages Functions.
- **Database:** Cloudflare D1.
- **DB binding:** `MY_HAUSSITADB`.

### 2.2 Repository Structure

```
/
├─ functions/      # Cloudflare Pages Functions = backend/API
└─ src/            # Angular frontend source code
```

### 2.3 Frontend Tech Stack

- Latest Angular version.
- SPA served by Cloudflare Pages.
- Must provide routes:
    - `/today`
    - `/inbox`
    - `/week`
    - `/categories`
    - `/projects/:id`

---

## 3. Database Schema (D1 / SQLite)

```sql
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
```

---

## 4. API Specification (Cloudflare Pages Functions)

### 4.1 General

Functions must access DB via:

```ts
env.MY_HAUSSITADB
```

### 4.2 Endpoints Summary

- `/api/tasks`
    - GET: list tasks (supports filters)
    - POST: create task
    - PATCH: batch updates

- `/api/tasks/:id`
    - GET: fetch one task
    - PATCH: update task (mark done, reassign, etc.)
    - DELETE: delete task

- `/api/tasks/:id/priorities`
    - PATCH: update per-user priorities

- `/api/users`
    - GET, POST

- `/api/users/:id`
    - GET, PATCH

Projects are tasks with `is_project = 1` and children defined via `parent_id`.

---

## 5. Angular Frontend Expectations

The frontend must:

- Interact with the API described above.
- Implement the views in §1.3.
- Use Angular best practices and a clean component architecture.
- Support responsive design.

---

## 6. Constraints for the AI Agent

- **Do not change** repo structure: must have `/functions` & `/src`.
- **Do not change** DB binding name: `MY_HAUSSITADB`.
- **Do not alter** the core domain model (tasks, projects, per-user priorities).
- Build API with Cloudflare Pages Functions.
- Build SPA with Angular.
- Keep UI minimal with meaningful color semantics.

Primary goal: Build Haus-sita as a clear, maintainable monorepo.
