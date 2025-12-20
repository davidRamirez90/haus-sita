import { jsonResponse, errorResponse } from '../../../utils/response';

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

type Priority = 'none' | 'low' | 'medium' | 'high';

type PriorityInput = {
  user_id: string;
  priority: Priority;
};

const PRIORITY_VALUES: Priority[] = ['none', 'low', 'medium', 'high'];

export const onRequestPatch: PagesFunction<Env> = async ({ env, request, params }) => {
  const id = params?.id;
  if (!id) return errorResponse('Task id is required', 400);

  const taskExists = await hasTask(env.MY_HAUSSITADB, id);
  if (!taskExists) return errorResponse('Task not found', 404);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const priorities = parsePriorities(body);
  if (!priorities.ok) return errorResponse(priorities.error, 400);

  const uniqueUserIds = Array.from(new Set(priorities.items.map((item) => item.user_id)));
  const missingUsers = await findMissingUsers(env.MY_HAUSSITADB, uniqueUserIds);
  if (missingUsers.length) {
    return errorResponse(`Unknown user ids: ${missingUsers.join(', ')}`, 400);
  }

  try {
    for (const item of priorities.items) {
      await env.MY_HAUSSITADB.prepare(
        `INSERT INTO task_priorities (task_id, user_id, priority)
         VALUES (?, ?, ?)
         ON CONFLICT(task_id, user_id) DO UPDATE SET priority = excluded.priority`
      )
        .bind(id, item.user_id, item.priority)
        .run();
    }

    const { results } = await env.MY_HAUSSITADB.prepare(
      'SELECT * FROM task_priorities WHERE task_id = ? ORDER BY user_id ASC'
    )
      .bind(id)
      .all();

    return jsonResponse({ priorities: results ?? [] });
  } catch (err) {
    console.error(`PATCH /api/tasks/${id}/priorities failed`, err);
    return errorResponse('Failed to update priorities', 500);
  }
};

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const id = params?.id;
  if (!id) return errorResponse('Task id is required', 400);

  const taskExists = await hasTask(env.MY_HAUSSITADB, id);
  if (!taskExists) return errorResponse('Task not found', 404);

  try {
    const { results } = await env.MY_HAUSSITADB.prepare(
      'SELECT * FROM task_priorities WHERE task_id = ? ORDER BY user_id ASC'
    )
      .bind(id)
      .all();

    return jsonResponse({ priorities: results ?? [] });
  } catch (err) {
    console.error(`GET /api/tasks/${id}/priorities failed`, err);
    return errorResponse('Failed to fetch priorities', 500);
  }
};

async function hasTask(db: D1Database, id: string): Promise<boolean> {
  const { results } = await db.prepare('SELECT id FROM tasks WHERE id = ?').bind(id).all();
  return Boolean(results?.[0]);
}

async function findMissingUsers(db: D1Database, userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  const placeholders = userIds.map(() => '?').join(', ');
  const { results } = await db
    .prepare(`SELECT id FROM users WHERE id IN (${placeholders})`)
    .bind(...userIds)
    .all();
  const found = new Set((results ?? []).map((row: any) => String(row.id)));
  return userIds.filter((id) => !found.has(id));
}

function parsePriorities(body: any): { ok: true; items: PriorityInput[] } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Body must be a JSON object' };
  }

  if (Array.isArray(body.priorities)) {
    const items: PriorityInput[] = [];
    for (const entry of body.priorities) {
      const parsed = parsePriorityEntry(entry);
      if (!parsed.ok) return parsed;
      items.push(parsed.item);
    }
    if (!items.length) return { ok: false, error: 'priorities must not be empty' };
    return { ok: true, items };
  }

  const parsed = parsePriorityEntry(body);
  if (!parsed.ok) return parsed;
  return { ok: true, items: [parsed.item] };
}

function parsePriorityEntry(entry: any): { ok: true; item: PriorityInput } | { ok: false; error: string } {
  if (!entry || typeof entry !== 'object') {
    return { ok: false, error: 'Each priority must be a JSON object' };
  }

  const userId = asNonEmptyString(entry.user_id);
  if (!userId) return { ok: false, error: 'user_id is required' };

  const priority = entry.priority as Priority;
  if (!PRIORITY_VALUES.includes(priority)) {
    return { ok: false, error: 'priority must be none|low|medium|high' };
  }

  return { ok: true, item: { user_id: userId, priority } };
}

function asNonEmptyString(value: any): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}
