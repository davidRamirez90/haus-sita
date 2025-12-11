import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Task } from './task.model';

interface TaskListResponse {
  tasks: Task[];
}

interface TaskResponse {
  task: Task;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly baseUrl = '/api/tasks';

  constructor(private readonly http: HttpClient) {}

  listInbox(): Observable<Task[]> {
    return this.http
      .get<TaskListResponse>(`${this.baseUrl}?status=inbox`)
      .pipe(map((res) => res.tasks ?? []));
  }

  create(task: Partial<Task>): Observable<Task> {
    return this.http.post<TaskResponse>(this.baseUrl, task).pipe(map((res) => res.task));
  }

  update(id: string, patch: Partial<Task>): Observable<Task> {
    return this.http.patch<TaskResponse>(`${this.baseUrl}/${id}`, patch).pipe(map((res) => res.task));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
