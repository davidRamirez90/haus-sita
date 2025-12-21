# TODO

## Inbox + triage (no filters)
- Rework `src/app/pages/inbox/` into a triage view (no filter controls). Load tasks without client-side filters and group into sections in this priority order: Unassigned (owner == null) -> Missing scheduling (time_mode == null OR required date missing) -> Missing category (category == null) -> Ready for planning. Each task appears only in the first matching section. Add clear empty states per section.
- Add visual attention cues in the inbox: small icon chips for missing owner/date/category (person, calendar, tag) and a subtle attention color when any required info is missing. Keep UI minimal and iOS-inspired.

## Minimal task creation (title-only)
- [x] Update backend validation in `functions/utils/tasks.ts` so only `title` is required. Allow owner/category/effort/time_mode/due_date/planned_date/priority to be null. Set missing optional fields to null on create. Keep `id` generation as-is.
- [x] Update `functions/api/tasks.ts` to skip category existence validation when category is null. Make sure inserts accept null optional fields.
- [x] Update `src/app/pages/task-create/` so the form can submit with title only. Make all optional fields truly optional in UI, and remove any required hints/constraints tied to owner/category/effort/time_mode/status.

## Owner semantics
- [x] Backend: represent unassigned as `owner = null` in D1. "both" counts as assigned. Update `Task` model types to allow `owner?: TaskOwner | null`.
- [x] Frontend: display an "Unassigned" label when owner is null (do not show a user dot). Treat "both" as assigned.

## Global owner filter (header)
- Add a global toggle in `src/app/app.html` (All / Mine). Store state in `src/app/app.ts` or a small service and apply it to all list views (Inbox, Today, Week, Rooms, Projects, Project detail lists).
- Mine filter rule: include tasks where owner == you OR owner == both OR owner == null (unassigned). Exclude tasks where owner == partner.

## Rooms view: No category bucket
- In `src/app/pages/categories/`, add a synthetic chip for "No category" (category == null). Selecting it should show tasks with no category. Keep this bucket visible alongside real categories.

## Quick actions on task cards
- Add quick actions to task cards (or a shared wrapper) in all list views: at minimum "Mark done". This should set `completed_at` to now via `TaskService.update`, which drives computed status. Ensure accessible button labels and focus states.

## Computed status (no manual status)
- Status becomes derived in API responses (do not accept status from the client). Use time_mode to choose the date field: flexible -> due_date, fixed -> planned_date. Rules: completed_at set -> done; else if chosen date is today -> today; else if chosen date exists -> planned; else -> inbox.
- Update `functions/utils/tasks.ts` and `parseListQuery` to support status filtering based on computed status (either in SQL using CASE/WHERE or in post-processing). Update all frontend views to stop setting status directly and to rely on computed status.

## Time mode/date rule
- Enforce: if time_mode is set, the corresponding date must be set (flexible -> due_date, fixed -> planned_date). If time_mode is null, both date fields should be null. Validate in backend and reflect in UI.

## Tests
- Add basic unit tests for `TaskService` and backend validation in `functions/utils/tasks.ts`: title-only creation accepted, time_mode/date enforcement, and computed status mapping.

## D1 migrations
- Create a new migration in `functions/migrations/` to relax NOT NULL constraints on tasks fields (owner/category/effort/time_mode/status if needed) and to support computed status. Use a table rebuild pattern (create new table, copy data, drop old, rename). Apply locally and remotely with `npx wrangler d1 migrations apply haussita-db` (add `--remote` for remote).
