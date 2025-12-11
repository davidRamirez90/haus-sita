# Cloudflare Pages Functions

## Migrations

Run the D1 migration before exercising the API:

```bash
wrangler d1 migrations apply <database-name>
```

The binding inside functions is `MY_HAUSSITADB`.

## /api/tasks

- `GET /api/tasks`: accepts `status`, `owner`, `category`, `time_mode`, `due_before`, `planned_for`, `parent_id`, `is_project`, `limit`, `offset`. Returns tasks ordered by `created_at` desc.
- `POST /api/tasks`: body requires `title`, `owner (you|partner|both)`, `status`, `effort` (minutes), `category`, `time_mode (flexible|fixed)`; optional `description`, `due_date`, `planned_date` (required if `fixed`), `parent_id`, `is_project`, `completed_at`.
- `GET /api/tasks/:id`: fetch a single task.
- `PATCH /api/tasks/:id`: partial update of mutable fields (title, description, owner, status, effort, category, time_mode, due_date, planned_date, is_project, parent_id, completed_at).
- `DELETE /api/tasks/:id`: remove a task (cascades task_priorities via FK).

Example create:

```bash
curl -X POST http://localhost:8788/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Take out recycling",
    "owner": "you",
    "status": "inbox",
    "effort": 15,
    "category": "room.kitchen",
    "time_mode": "flexible",
    "due_date": "2024-12-01"
  }'
```
