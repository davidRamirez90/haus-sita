import { jsonResponse, errorResponse } from '../../utils/response';
import { validatePatchedTask, ValidatedTaskInput } from '../../utils/tasks';

type D1PreparedStatement = {
  bind: (...values: unknown[]) => {
    all: () => Promise<{ results?: unknown[] }>;
    run: () => Promise<unknown>;
  };
};

type D1Database = {
  prepare: (query: string) => D1PreparedStatement;
};

type PagesFunction<Env = unknown> = (context: {
  env: Env;
  request: Request;
  params: Record<string, string>;
}) => Promise<Response>;

type Env = {
  MY_HAUSSITADB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const id = params?.id;
  if (!id) return errorResponse('Task id is required', 400);

  const task = await fetchTask(env.MY_HAUSSITADB, id);
  if (!task) return errorResponse('Task not found', 404);

  return jsonResponse({ task });
};

export const onRequestPatch: PagesFunction<Env> = async ({ env, request, params }) => {
  const id = params?.id;
  if (!id) return errorResponse('Task id is required', 400);

  const existing = await fetchTask(env.MY_HAUSSITADB, id);
  if (!existing) return errorResponse('Task not found', 404);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const hasFields = Object.keys(body ?? {}).some((key) =>
    ['title', 'description', 'owner', 'status', 'effort', 'category', 'time_mode', 'due_date', 'planned_date', 'is_project', 'parent_id', 'completed_at'].includes(
      key
    )
  );

  if (!hasFields) {
    return errorResponse('No updatable fields provided', 400);
  }

  const validation = validatePatchedTask(existing, body);
  if (!validation.ok || !validation.task) {
    return errorResponse(validation.errors.join('; '), 400);
  }

  const updated = validation.task;

  if (Object.prototype.hasOwnProperty.call(body ?? {}, 'category')) {
    try {
      const categoryOk = await hasCategory(env.MY_HAUSSITADB, updated.category);
      if (!categoryOk) {
        return errorResponse('Invalid category', 400);
      }
    } catch (err) {
      console.error(`PATCH /api/tasks/${id} category check failed`, err);
      return errorResponse('Failed to validate category', 500);
    }
  }

  try {
    await env.MY_HAUSSITADB.prepare(
      `UPDATE tasks
       SET title = ?, description = ?, owner = ?, status = ?, effort = ?, category = ?, time_mode = ?, due_date = ?, planned_date = ?, is_project = ?, parent_id = ?, completed_at = ?
       WHERE id = ?`
    )
      .bind(
        updated.title,
        updated.description,
        updated.owner,
        updated.status,
        updated.effort,
        updated.category,
        updated.time_mode,
        updated.due_date,
        updated.planned_date,
        updated.is_project,
        updated.parent_id,
        updated.completed_at,
        id
      )
      .run();

    const refreshed = await fetchTask(env.MY_HAUSSITADB, id);
    return jsonResponse({ task: refreshed ?? updated });
  } catch (err) {
    console.error(`PATCH /api/tasks/${id} failed`, err);
    return errorResponse('Failed to update task', 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  const id = params?.id;
  if (!id) return errorResponse('Task id is required', 400);

  const task = await fetchTask(env.MY_HAUSSITADB, id);
  if (!task) return errorResponse('Task not found', 404);

  try {
    await env.MY_HAUSSITADB.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();
    return jsonResponse({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/tasks/${id} failed`, err);
    return errorResponse('Failed to delete task', 500);
  }
};

async function fetchTask(db: D1Database, id: string): Promise<ValidatedTaskInput | null> {
  const { results } = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).all();
  const row = results?.[0] as any;
  if (!row) return null;

  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description ?? null,
    owner: row.owner,
    status: row.status,
    effort: Number(row.effort),
    category: String(row.category),
    time_mode: row.time_mode,
    due_date: row.due_date ?? null,
    planned_date: row.planned_date ?? null,
    is_project: row.is_project ? 1 : 0,
    parent_id: row.parent_id ?? null,
    completed_at: row.completed_at ?? null,
  };
}

async function hasCategory(db: D1Database, id: string): Promise<boolean> {
  const { results } = await db.prepare('SELECT id FROM categories WHERE id = ?').bind(id).all();
  return Boolean(results?.[0]);
}
