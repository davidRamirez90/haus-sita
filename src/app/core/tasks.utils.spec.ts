import { computeTaskStatus, validateNewTaskPayload } from '../../../functions/utils/tasks';

describe('tasks utils', () => {
  const idFactory = () => 'task-1';

  it('accepts title-only creation', () => {
    const result = validateNewTaskPayload({ title: 'Test' }, idFactory);
    expect(result.ok).toBeTrue();
    expect(result.task?.id).toBe('task-1');
    expect(result.task?.title).toBe('Test');
    expect(result.task?.owner).toBeNull();
    expect(result.task?.category).toBeNull();
    expect(result.task?.time_mode).toBeNull();
    expect(result.task?.status).toBe('inbox');
  });

  it('requires due_date for flexible tasks', () => {
    const result = validateNewTaskPayload({ title: 'Test', time_mode: 'flexible' }, idFactory);
    expect(result.ok).toBeFalse();
    expect(result.errors).toContain('due_date is required for flexible tasks');
  });

  it('requires planned_date for fixed tasks', () => {
    const result = validateNewTaskPayload({ title: 'Test', time_mode: 'fixed' }, idFactory);
    expect(result.ok).toBeFalse();
    expect(result.errors).toContain('planned_date is required for fixed tasks');
  });

  it('requires time_mode when dates are provided', () => {
    const result = validateNewTaskPayload({ title: 'Test', due_date: '2025-01-01' }, idFactory);
    expect(result.ok).toBeFalse();
    expect(result.errors).toContain('time_mode is required when due_date or planned_date is set');
  });

  it('computes status from completion and dates', () => {
    const todayKey = formatDateKey(new Date());

    expect(computeTaskStatus({ completed_at: '2025-01-01T00:00:00Z' })).toBe('done');
    expect(computeTaskStatus({ time_mode: 'flexible', due_date: todayKey })).toBe('today');
    expect(computeTaskStatus({ time_mode: 'fixed', planned_date: '2099-01-01' })).toBe('planned');
    expect(computeTaskStatus({ time_mode: null })).toBe('inbox');
  });
});

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
