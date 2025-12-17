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

type PagesFunction<Env = unknown> = (context: { env: Env }) => Promise<Response>;

type Env = {
  MY_HAUSSITADB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const { results } = await env.MY_HAUSSITADB.prepare(
      'SELECT id, label, sort_order FROM categories ORDER BY sort_order ASC, label ASC'
    ).all();
    return jsonResponse({ categories: results ?? [] });
  } catch (err) {
    console.error('GET /api/categories failed', err);
    return errorResponse('Failed to fetch categories', 500);
  }
};
