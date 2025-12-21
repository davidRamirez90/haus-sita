import { jsonResponse, errorResponse } from '../utils/response';
import { parseListQuery, validateNewTaskPayload } from '../utils/tasks';

type D1PreparedStatement = {
  bind: (...values: unknown[]) => {
    all: () => Promise<{ results?: unknown[] }>;
    run: () => Promise<unknown>;
  };
};

type D1Database = {
  prepare: (query: string) => D1PreparedStatement;
};

type PagesFunction<Env = unknown> = (context: { env: Env; request: Request }) => Promise<Response>;

type Env = {
  MY_HAUSSITADB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const { clause, params, limit, offset, errors } = parseListQuery(url);

  if (errors.length) {
    return errorResponse(errors.join('; '), 400);
  }

  try {
    const statement = env.MY_HAUSSITADB.prepare(
      `SELECT * FROM tasks ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset);

    const { results } = await statement.all();
    return jsonResponse({ tasks: results ?? [], limit, offset });
  } catch (err) {
    console.error('GET /api/tasks failed', err);
    return errorResponse('Failed to fetch tasks', 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const validation = validateNewTaskPayload(payload, createId);
  if (!validation.ok || !validation.task) {
    return errorResponse(validation.errors.join('; '), 400);
  }

  const task = validation.task;

  try {
    if (task.category) {
      const categoryOk = await hasCategory(env.MY_HAUSSITADB, task.category);
      if (!categoryOk) {
        return errorResponse('Invalid category', 400);
      }
    }

    await env.MY_HAUSSITADB.prepare(
      `INSERT INTO tasks (id, title, description, owner, status, effort, category, time_mode, due_date, planned_date, is_project, parent_id, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        task.id,
        task.title,
        task.description,
        task.owner,
        task.status,
        task.effort,
        task.category,
        task.time_mode,
        task.due_date,
        task.planned_date,
        task.is_project,
        task.parent_id,
        task.completed_at
      )
      .run();

    const { results } = await env.MY_HAUSSITADB.prepare('SELECT * FROM tasks WHERE id = ?')
      .bind(task.id)
      .all();

    return jsonResponse({ task: results?.[0] ?? task }, { status: 201 });
  } catch (err) {
    console.error('POST /api/tasks failed', err);
    return errorResponse('Failed to create task', 500);
  }
};

async function hasCategory(db: D1Database, id: string): Promise<boolean> {
  const { results } = await db.prepare('SELECT id FROM categories WHERE id = ?').bind(id).all();
  return Boolean(results?.[0]);
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `task_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 10)}`;
}
