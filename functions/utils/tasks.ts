type TaskStatus = 'inbox' | 'planned' | 'today' | 'done';
type Owner = 'you' | 'partner' | 'both';
type TimeMode = 'flexible' | 'fixed';

export interface ValidatedTaskInput {
  id: string;
  title: string;
  description: string | null;
  owner: Owner | null;
  status: TaskStatus;
  effort: number | null;
  category: string | null;
  time_mode: TimeMode | null;
  due_date: string | null;
  planned_date: string | null;
  is_project: number;
  parent_id: string | null;
  completed_at: string | null;
}

const STATUS_VALUES: TaskStatus[] = ['inbox', 'planned', 'today', 'done'];
const OWNER_VALUES: Owner[] = ['you', 'partner', 'both'];
const TIME_MODE_VALUES: TimeMode[] = ['flexible', 'fixed'];

export function parseListQuery(url: URL): {
  clause: string;
  params: unknown[];
  limit: number;
  offset: number;
  errors: string[];
} {
  const params: unknown[] = [];
  const clauses: string[] = [];
  const errors: string[] = [];

  const status = url.searchParams.get('status');
  if (status) {
    if (STATUS_VALUES.includes(status as TaskStatus)) {
      clauses.push('status = ?');
      params.push(status);
    } else {
      errors.push('Invalid status filter');
    }
  }

  const owner = url.searchParams.get('owner');
  if (owner) {
    if (OWNER_VALUES.includes(owner as Owner)) {
      clauses.push('owner = ?');
      params.push(owner);
    } else {
      errors.push('Invalid owner filter');
    }
  }

  const category = url.searchParams.get('category');
  if (category) {
    clauses.push('category = ?');
    params.push(category);
  }

  const timeMode = url.searchParams.get('time_mode');
  if (timeMode) {
    if (TIME_MODE_VALUES.includes(timeMode as TimeMode)) {
      clauses.push('time_mode = ?');
      params.push(timeMode);
    } else {
      errors.push('Invalid time_mode filter');
    }
  }

  const dueBefore = url.searchParams.get('due_before');
  if (dueBefore) {
    clauses.push('due_date <= ?');
    params.push(dueBefore);
  }

  const plannedFor = url.searchParams.get('planned_for');
  if (plannedFor) {
    clauses.push('planned_date = ?');
    params.push(plannedFor);
  }

  const parentId = url.searchParams.get('parent_id');
  if (parentId) {
    clauses.push('parent_id = ?');
    params.push(parentId);
  }

  const isProject = url.searchParams.get('is_project');
  if (isProject === '1' || isProject === 'true') {
    clauses.push('is_project = 1');
  } else if (isProject === '0' || isProject === 'false') {
    clauses.push('is_project = 0');
  } else if (isProject) {
    errors.push('Invalid is_project filter');
  }

  const limit = clampInt(url.searchParams.get('limit'), 50, 1, 200);
  const offset = clampInt(url.searchParams.get('offset'), 0, 0, 10000);

  const clause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  return { clause, params, limit, offset, errors };
}

export function validateNewTaskPayload(
  body: any,
  idFactory: () => string
): { ok: boolean; errors: string[]; task?: ValidatedTaskInput } {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    errors.push('Body must be a JSON object');
    return { ok: false, errors };
  }

  const title = asNonEmptyString(body.title);
  if (!title) errors.push('title is required');

  const ownerInput = body.owner;
  const owner = optionalEnum(ownerInput, OWNER_VALUES);
  if (ownerInput !== undefined && ownerInput !== null && owner === null) errors.push('owner must be you|partner|both');

  const statusInput = body.status as TaskStatus | undefined;
  const status = STATUS_VALUES.includes(statusInput as TaskStatus) ? (statusInput as TaskStatus) : 'inbox';
  if (typeof body.status !== 'undefined' && status !== body.status) {
    errors.push('status must be inbox|planned|today|done');
  }

  const effortInput = body.effort;
  let effortValue: number | null = null;
  if (effortInput !== undefined && effortInput !== null) {
    const effort = Number(effortInput);
    if (!Number.isInteger(effort) || effort <= 0) {
      errors.push('effort must be a positive integer (minutes)');
    } else {
      effortValue = Math.trunc(effort);
    }
  }

  const category = asNonEmptyString(body.category);

  const timeModeInput = body.time_mode;
  const timeMode = optionalEnum(timeModeInput, TIME_MODE_VALUES);
  if (timeModeInput !== undefined && timeModeInput !== null && timeMode === null) errors.push('time_mode must be flexible|fixed');

  const isProject = asBooleanInt(body.is_project);
  const parentId = asNonEmptyString(body.parent_id);
  const description = asNonEmptyString(body.description);
  const completedAt = asNonEmptyString(body.completed_at);

  const dueDate = asNonEmptyString(body.due_date);
  const plannedDate = asNonEmptyString(body.planned_date);

  if (timeMode === 'fixed' && !plannedDate) {
    errors.push('planned_date is required for fixed tasks');
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  const task: ValidatedTaskInput = {
    id: body.id ? String(body.id) : idFactory(),
    title,
    description,
    owner,
    status,
    effort: effortValue ?? null,
    category,
    time_mode: timeMode,
    due_date: timeMode === 'fixed' ? null : dueDate,
    planned_date: timeMode === 'fixed' ? plannedDate : null,
    is_project: isProject,
    parent_id: parentId,
    completed_at: completedAt,
  };

  return { ok: true, errors: [], task };
}

export function validatePatchedTask(
  existing: ValidatedTaskInput,
  patch: any
): { ok: boolean; errors: string[]; task?: ValidatedTaskInput } {
  if (!patch || typeof patch !== 'object') {
    return { ok: false, errors: ['Body must be a JSON object'] };
  }

  const merged = { ...existing, ...patch, id: existing.id };
  return validateNewTaskPayload(merged, () => existing.id);
}

function asNonEmptyString(value: any): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function optionalEnum<T extends string>(value: any, allowed: readonly T[]): T | null {
  if (value === null || typeof value === 'undefined') return null;
  if (typeof value === 'string' && allowed.includes(value as T)) return value as T;
  return null;
}

function asBooleanInt(value: any): number {
  if (value === true || value === 1 || value === '1' || value === 'true') return 1;
  return 0;
}

function clampInt(input: string | null, fallback: number, min: number, max: number): number {
  if (!input) return fallback;
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return fallback;
  const intVal = Math.trunc(parsed);
  if (intVal < min) return min;
  if (intVal > max) return max;
  return intVal;
}
