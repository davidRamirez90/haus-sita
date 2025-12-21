import { jsonResponse, errorResponse } from '../../utils/response';

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
  if (!id) return errorResponse('User id is required', 400);

  try {
    const { results } = await env.MY_HAUSSITADB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .all();
    const user = results?.[0];
    if (!user) return errorResponse('User not found', 404);
    return jsonResponse({ user });
  } catch (err) {
    console.error(`GET /api/users/${id} failed`, err);
    return errorResponse('Failed to fetch user', 500);
  }
};

export const onRequestPatch: PagesFunction<Env> = async ({ env, request, params }) => {
  const id = params?.id;
  if (!id) return errorResponse('User id is required', 400);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const hasName = Object.prototype.hasOwnProperty.call(body ?? {}, 'name');
  const hasColor = Object.prototype.hasOwnProperty.call(body ?? {}, 'color');
  const hasEmail = Object.prototype.hasOwnProperty.call(body ?? {}, 'email');
  if (!hasName && !hasColor && !hasEmail) {
    return errorResponse('No updatable fields provided', 400);
  }

  const { results } = await env.MY_HAUSSITADB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(id)
    .all();
  const existing = results?.[0] as any;
  if (!existing) return errorResponse('User not found', 404);

  let name = existing.name as string;
  let color = existing.color ?? null;
  let email = existing.email ?? null;

  if (hasName) {
    const parsed = asNonEmptyString(body.name);
    if (!parsed) return errorResponse('name must be a non-empty string', 400);
    name = parsed;
  }

  if (hasColor) {
    if (!isStringOrNull(body.color)) {
      return errorResponse('color must be a string or null', 400);
    }
    const parsed = asOptionalString(body.color);
    color = parsed;
  }

  if (hasEmail) {
    if (!isStringOrNull(body.email)) {
      return errorResponse('email must be a string or null', 400);
    }
    email = normalizeEmail(body.email);
  }

  try {
    await env.MY_HAUSSITADB.prepare('UPDATE users SET name = ?, color = ?, email = ? WHERE id = ?')
      .bind(name, color, email, id)
      .run();

    return jsonResponse({ user: { ...existing, name, color, email } });
  } catch (err) {
    console.error(`PATCH /api/users/${id} failed`, err);
    return errorResponse('Failed to update user', 500);
  }
};

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

function normalizeEmail(value: any): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length ? trimmed : null;
}
