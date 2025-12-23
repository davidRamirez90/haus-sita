import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import { TaskCardComponent } from '../../components/task-card/task-card.component';
import { TaskService } from '../../core/task.service';
import { Task } from '../../core/task.model';
import { UserService } from '../../core/user.service';
import { User } from '../../core/user.model';
import { TaskPriority } from '../../core/priority.model';
import { OwnerFilterService } from '../../core/owner-filter.service';

@Component({
  selector: 'app-inbox-page',
  imports: [CommonModule, RouterModule, TaskCardComponent],
  templateUrl: './inbox.page.html',
  styleUrls: ['./inbox.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InboxPage implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly userService = inject(UserService);
  private readonly ownerFilter = inject(OwnerFilterService);
  private readonly destroyRef = inject(DestroyRef);

  protected tasks = signal<Task[]>([]);
  protected users = signal<User[]>([]);
  protected taskPriorities = signal<Record<string, TaskPriority[]>>({});
  protected loading = signal(false);
  protected error = signal<string | null>(null);

  protected triageSections = computed(() => {
    const filtered = this.ownerFilter.filterTasks(this.tasks()).filter((task) => task.status !== 'done');
    const ordered = this.sortByCreated(filtered);

    const result: Record<'unassigned' | 'missingScheduling' | 'missingCategory' | 'ready', Task[]> = {
      unassigned: [],
      missingScheduling: [],
      missingCategory: [],
      ready: []
    };

    for (const task of ordered) {
      if (this.isUnassigned(task)) {
        result.unassigned.push(task);
        continue;
      }

      if (this.isMissingScheduling(task)) {
        result.missingScheduling.push(task);
        continue;
      }

      if (this.isMissingCategory(task)) {
        result.missingCategory.push(task);
        continue;
      }

      result.ready.push(task);
    }

    return result;
  });

  ngOnInit(): void {
    this.loadInbox();
    this.loadUsers();
  }

  loadInbox(): void {
    this.loading.set(true);
    this.error.set(null);

    this.taskService
      .listInbox()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (tasks) => {
          this.tasks.set(tasks);
          this.fetchPriorities(tasks);
        },
        error: () => this.error.set('Aufgaben konnten nicht geladen werden')
      });
  }

  loadUsers(): void {
    this.userService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => this.users.set(users),
        error: () => this.error.set('Nutzer konnten nicht geladen werden')
      });
  }

  private isUnassigned(task: Task): boolean {
    return task.owner === null || typeof task.owner === 'undefined';
  }

  private isMissingScheduling(task: Task): boolean {
    if (!task.time_mode) return true;
    if (task.time_mode === 'flexible') return !task.due_date;
    if (task.time_mode === 'fixed') return !task.planned_date;
    return false;
  }

  private isMissingCategory(task: Task): boolean {
    return task.category === null || typeof task.category === 'undefined';
  }

  private sortByCreated(list: Task[]): Task[] {
    return [...list].sort((a, b) => this.compareDates(a.created_at, b.created_at, 'desc'));
  }

  private compareDates(
    first: string | null | undefined,
    second: string | null | undefined,
    direction: 'asc' | 'desc' = 'asc'
  ): number {
    const firstTime = this.asTimestamp(first, direction === 'asc' ? Number.MAX_SAFE_INTEGER : 0);
    const secondTime = this.asTimestamp(second, direction === 'asc' ? Number.MAX_SAFE_INTEGER : 0);

    const delta = firstTime - secondTime;
    return direction === 'asc' ? delta : -delta;
  }

  private asTimestamp(value: string | null | undefined, fallback: number): number {
    if (!value) return fallback;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private fetchPriorities(tasks: Task[]): void {
    const ids = tasks.map((task) => task.id);
    if (!ids.length) {
      this.taskPriorities.set({});
      return;
    }

    forkJoin(
      ids.map((id) =>
        this.taskService
          .getPriorities(id)
          .pipe(
            map((list) => ({ id, list })),
            catchError(() => of({ id, list: [] as TaskPriority[] }))
          )
      )
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((entries) => {
        const next: Record<string, TaskPriority[]> = {};
        for (const entry of entries) {
          next[entry.id] = entry.list;
        }
        this.taskPriorities.set(next);
      });
  }

  protected handleTaskUpdated(task: Task): void {
    this.tasks.update((items) => items.map((item) => (item.id === task.id ? task : item)));
  }
}
