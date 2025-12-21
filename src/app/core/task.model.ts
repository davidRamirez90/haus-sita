export type TaskOwner = 'you' | 'partner' | 'both';
export type TaskStatus = 'inbox' | 'planned' | 'today' | 'done';
export type TaskTimeMode = 'flexible' | 'fixed';

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  owner?: TaskOwner | null;
  status?: TaskStatus;
  effort?: number | null;
  category?: string | null;
  time_mode?: TaskTimeMode | null;
  created_at?: string;
  due_date?: string | null;
  planned_date?: string | null;
  is_project?: number;
  parent_id?: string | null;
  completed_at?: string | null;
}
