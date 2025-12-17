import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Task } from './task.model';
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

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly baseUrl = '/api/tasks';

  constructor(private readonly http: HttpClient) {}

  listInbox(): Observable<Task[]> {
    return this.http
      .get<TaskListResponse>(`${this.baseUrl}?status=inbox`)
      .pipe(map((res) => res.tasks ?? []));
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
