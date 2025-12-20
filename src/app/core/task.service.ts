import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Task, TaskStatus } from './task.model';
import { PriorityLevel, TaskPriority } from './priority.model';

interface TaskListResponse {
  tasks: Task[];
}

interface TaskResponse {
  task: Task;
}

interface TaskPrioritiesResponse {
  priorities: TaskPriority[];
}

type TaskPriorityUpdate = {
  user_id: string;
  priority: PriorityLevel;
};

export type TaskListFilters = Partial<{
  status: TaskStatus | 'all';
  owner: string;
  category: string;
  time_mode: string;
  due_before: string;
  planned_for: string;
  limit: number;
  offset: number;
}>;

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly baseUrl = '/api/tasks';

  constructor(private readonly http: HttpClient) {}

  list(filters: TaskListFilters = {}): Observable<Task[]> {
    let params = new HttpParams();

    if (filters.status && filters.status !== 'all') params = params.set('status', filters.status);
    if (filters.owner) params = params.set('owner', filters.owner);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.time_mode) params = params.set('time_mode', filters.time_mode);
    if (filters.due_before) params = params.set('due_before', filters.due_before);
    if (filters.planned_for) params = params.set('planned_for', filters.planned_for);
    if (typeof filters.limit === 'number') params = params.set('limit', filters.limit);
    if (typeof filters.offset === 'number') params = params.set('offset', filters.offset);

    return this.http.get<TaskListResponse>(this.baseUrl, { params }).pipe(map((res) => res.tasks ?? []));
  }

  listInbox(filters: TaskListFilters = {}): Observable<Task[]> {
    const status = filters.status ?? 'inbox';
    return this.list({ ...filters, status });
  }

  listProjects(): Observable<Task[]> {
    return this.http
      .get<TaskListResponse>(`${this.baseUrl}?is_project=1`)
      .pipe(map((res) => res.tasks ?? []));
  }

  create(task: Partial<Task>): Observable<Task> {
    return this.http.post<TaskResponse>(this.baseUrl, task).pipe(map((res) => res.task));
  }

  update(id: string, patch: Partial<Task>): Observable<Task> {
    return this.http.patch<TaskResponse>(`${this.baseUrl}/${id}`, patch).pipe(map((res) => res.task));
  }

  updatePriorities(id: string, updates: TaskPriorityUpdate | TaskPriorityUpdate[]): Observable<TaskPriority[]> {
    const payload = Array.isArray(updates) ? { priorities: updates } : updates;
    return this.http
      .patch<TaskPrioritiesResponse>(`${this.baseUrl}/${id}/priorities`, payload)
      .pipe(map((res) => res.priorities ?? []));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
