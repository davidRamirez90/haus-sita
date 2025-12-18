# TODO

- Add remaining API routes to UI (users, priorities display, filters).
- Implement owner selection and per-user priorities in task forms/cards.
- Build “Today”, “Week”, “Räume”, and “Projekte” views per spec.
- Add filters/sorting (status, category, due/planned) to Inbox.
- Wire category filters using `/api/categories` and DB-backed list.
- Add project/subtask detail view with progress indicator.
- Add basic tests for TaskService and form validation.
- Apply D1 migrations remotely: `npx wrangler d1 migrations apply haussita-db`.
