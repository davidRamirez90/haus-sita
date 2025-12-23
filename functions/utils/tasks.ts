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
  status: TaskStatus | null;
} {
  const params: unknown[] = [];
  const clauses: string[] = [];
  const errors: string[] = [];
  let status: TaskStatus | null = null;

  const statusParam = url.searchParams.get('status');
  if (statusParam) {
    if (STATUS_VALUES.includes(statusParam as TaskStatus)) {
      status = statusParam as TaskStatus;
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

  return { clause, params, limit, offset, errors, status };
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

  const dueDateInput = asNonEmptyString(body.due_date);
  const plannedDateInput = asNonEmptyString(body.planned_date);

  let dueDate: string | null = null;
  let plannedDate: string | null = null;

  if (timeMode === 'flexible') {
    if (!dueDateInput) {
      errors.push('due_date is required for flexible tasks');
    } else {
      dueDate = dueDateInput;
    }
  } else if (timeMode === 'fixed') {
    if (!plannedDateInput) {
      errors.push('planned_date is required for fixed tasks');
    } else {
      plannedDate = plannedDateInput;
    }
  } else if (dueDateInput || plannedDateInput) {
    errors.push('time_mode is required when due_date or planned_date is set');
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  const status = computeTaskStatus({
    time_mode: timeMode,
    due_date: dueDate,
    planned_date: plannedDate,
    completed_at: completedAt
  });

  const task: ValidatedTaskInput = {
    id: body.id ? String(body.id) : idFactory(),
    title,
    description,
    owner,
    status,
    effort: effortValue ?? null,
    category,
    time_mode: timeMode,
    due_date: dueDate,
    planned_date: plannedDate,
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

export function computeTaskStatus(task: {
  time_mode?: TimeMode | null;
  due_date?: string | null;
  planned_date?: string | null;
  completed_at?: string | null;
}): TaskStatus {
  if (task.completed_at) return 'done';

  const timeMode = task.time_mode ?? null;
  const date =
    timeMode === 'fixed' ? task.planned_date ?? null : timeMode === 'flexible' ? task.due_date ?? null : null;

  if (!date) return 'inbox';

  const todayKey = formatDateKey(new Date());
  return date === todayKey ? 'today' : 'planned';
}

export function coerceTaskRow(row: any): ValidatedTaskInput {
  const effort = coerceNullableNumber(row.effort);
  const dueDate = row.due_date ?? null;
  const plannedDate = row.planned_date ?? null;
  const timeMode = row.time_mode ?? null;
  const completedAt = row.completed_at ?? null;

  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description ?? null,
    owner: row.owner ?? null,
    status: computeTaskStatus({
      time_mode: timeMode,
      due_date: dueDate,
      planned_date: plannedDate,
      completed_at: completedAt
    }),
    effort,
    category: row.category ?? null,
    time_mode: timeMode,
    due_date: dueDate,
    planned_date: plannedDate,
    is_project: row.is_project ? 1 : 0,
    parent_id: row.parent_id ?? null,
    completed_at: completedAt
  };
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

function coerceNullableNumber(value: any): number | null {
  if (value === null || typeof value === 'undefined') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
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
