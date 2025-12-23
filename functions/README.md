# Cloudflare Pages Functions

## Migrations

Run the D1 migration before exercising the API:

```bash
wrangler d1 migrations apply <database-name>
```

The binding inside functions is `MY_HAUSSITADB`.

## /api/tasks

- `GET /api/tasks`: accepts `status` (computed), `owner`, `category`, `time_mode`, `due_before`, `planned_for`, `parent_id`, `is_project`, `limit`, `offset`. Returns tasks ordered by `created_at` desc.
- `POST /api/tasks`: body requires `title`. Optional `owner (you|partner|both)`, `effort` (minutes), `category`, `time_mode (flexible|fixed)`, `description`, `due_date`, `planned_date`, `parent_id`, `is_project`, `completed_at`. If `time_mode` is `flexible`, `due_date` is required. If `time_mode` is `fixed`, `planned_date` is required. `status` is computed on the server.
- `GET /api/tasks/:id`: fetch a single task.
- `PATCH /api/tasks/:id`: partial update of mutable fields (title, description, owner, effort, category, time_mode, due_date, planned_date, is_project, parent_id, completed_at). `status` is computed on the server.
- `DELETE /api/tasks/:id`: remove a task (cascades task_priorities via FK).
- `PATCH /api/tasks/:id/priorities`: update per-user priorities (accepts `{ user_id, priority }` or `{ priorities: [...] }`).

## /api/users

- `GET /api/users`: list users.
- `POST /api/users`: create a user (name required; optional id, color, email).
- `GET /api/users/:id`: fetch a single user.
- `PATCH /api/users/:id`: update `name`, `color`, and/or `email`.

## /api/categories

- `GET /api/categories`: list fixed categories.

Example create:

```bash
curl -X POST http://localhost:8788/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Take out recycling",
    "owner": "you",
    "effort": 15,
    "category": "room.kitchen",
    "time_mode": "flexible",
    "due_date": "2024-12-01"
  }'
```
