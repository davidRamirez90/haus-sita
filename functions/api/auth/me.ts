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

type PagesFunction<Env = unknown> = (context: { env: Env; request: Request }) => Promise<Response>;

type Env = {
  MY_HAUSSITADB: D1Database;
};

const EMAIL_HEADER = 'Cf-Access-Authenticated-User-Email';

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const email = readEmail(request);
  if (!email) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const { results } = await env.MY_HAUSSITADB.prepare(
      'SELECT id, name, color, email FROM users WHERE lower(email) = ?'
    )
      .bind(email)
      .all();

    const user = results?.[0];
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    return jsonResponse({ user });
  } catch (err) {
    console.error('GET /api/auth/me failed', err);
    return errorResponse('Failed to fetch auth user', 500);
  }
};

function readEmail(request: Request): string | null {
  const raw = request.headers.get(EMAIL_HEADER) ?? request.headers.get(EMAIL_HEADER.toLowerCase());
  const trimmed = raw?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}
