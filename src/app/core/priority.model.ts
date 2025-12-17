export type PriorityLevel = 'none' | 'low' | 'medium' | 'high';

export interface TaskPriority {
  task_id: string;
  user_id: string;
  priority: PriorityLevel;
}
