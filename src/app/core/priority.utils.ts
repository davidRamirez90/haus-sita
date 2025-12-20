import { PriorityLevel, TaskPriority } from './priority.model';

const PRIORITY_RANK: Record<PriorityLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3
};

export function priorityScore(level: PriorityLevel): number {
  return PRIORITY_RANK[level] ?? 0;
}

export function highestPriority(priorities: TaskPriority[]): PriorityLevel {
  let current: PriorityLevel = 'none';

  for (const item of priorities) {
    if (priorityScore(item.priority) > priorityScore(current)) {
      current = item.priority;
    }
  }

  return current;
}

export function priorityForUser(priorities: TaskPriority[], userId: string): PriorityLevel {
  const match = priorities.find((item) => item.user_id === userId);
  return match?.priority ?? 'none';
}
