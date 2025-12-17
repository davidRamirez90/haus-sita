import { jsonResponse, errorResponse } from '../utils/response';

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

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const { results } = await env.MY_HAUSSITADB.prepare('SELECT * FROM users ORDER BY created_at ASC').all();
    return jsonResponse({ users: results ?? [] });
  } catch (err) {
    console.error('GET /api/users failed', err);
    return errorResponse('Failed to fetch users', 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  if (!payload || typeof payload !== 'object') {
    return errorResponse('Body must be a JSON object', 400);
  }

  const name = asNonEmptyString(payload.name);
  if (!name) return errorResponse('name is required', 400);

  if (Object.prototype.hasOwnProperty.call(payload, 'color') && !isStringOrNull(payload.color)) {
    return errorResponse('color must be a string or null', 400);
  }
  const color = asOptionalString(payload.color);
  const id = payload.id ? String(payload.id) : createId();

  try {
    await env.MY_HAUSSITADB.prepare(
      'INSERT INTO users (id, name, color) VALUES (?, ?, ?)'
    )
      .bind(id, name, color)
      .run();

    const { results } = await env.MY_HAUSSITADB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .all();

    return jsonResponse({ user: results?.[0] ?? { id, name, color } }, { status: 201 });
  } catch (err) {
    console.error('POST /api/users failed', err);
    return errorResponse('Failed to create user', 500);
  }
};

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `user_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 10)}`;
}

function asNonEmptyString(value: any): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function asOptionalString(value: any): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function isStringOrNull(value: any): boolean {
  return value === null || typeof value === 'string';
}
