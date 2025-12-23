import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { ProgressBarComponent } from '../../components/progress-bar/progress-bar.component';
import { TaskCardComponent } from '../../components/task-card/task-card.component';
import { TaskService } from '../../core/task.service';
import { UserService } from '../../core/user.service';
import { Task } from '../../core/task.model';
import { PriorityLevel, TaskPriority } from '../../core/priority.model';
import { User } from '../../core/user.model';
import { highestPriority, priorityScore } from '../../core/priority.utils';
import { OwnerFilterService } from '../../core/owner-filter.service';

type TaskCardView = {
  task: Task;
  priority: PriorityLevel;
  priorities: TaskPriority[];
};

@Component({
  selector: 'app-project-detail-page',
  imports: [CommonModule, ReactiveFormsModule, ProgressBarComponent, TaskCardComponent],
  templateUrl: './project-detail.page.html',
  styleUrls: ['./project-detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectDetailPage implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly userService = inject(UserService);
  private readonly ownerFilter = inject(OwnerFilterService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly project = signal<Task | null>(null);
  protected readonly subtasks = signal<Task[]>([]);
  protected readonly users = signal<User[]>([]);
  protected readonly taskPriorities = signal<Record<string, TaskPriority[]>>({});
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly subtaskControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required]
  });

  private readonly subtaskValue = toSignal(this.subtaskControl.valueChanges, {
    initialValue: this.subtaskControl.value
  });

  private readonly subtaskStatus = toSignal(this.subtaskControl.statusChanges, {
    initialValue: this.subtaskControl.status
  });

  protected readonly canSubmit = computed(() => {
    return this.subtaskStatus() === 'VALID' && this.subtaskValue().trim().length > 0 && !this.submitting();
  });

  protected readonly filteredSubtasks = computed(() => this.ownerFilter.filterTasks(this.subtasks()));

  protected readonly progressLabel = computed(() => {
    const total = this.filteredSubtasks().length;
    const completed = this.completedCount();
    return `${completed}/${total} erledigt`;
  });

  protected readonly completedCount = computed(
    () => this.filteredSubtasks().filter((task) => task.status === 'done').length
  );

  protected readonly subtaskCards = computed<TaskCardView[]>(() => {
    const list = this.filteredSubtasks();
    const priorities = this.taskPriorities();
    return this.sortByPriority(
      list.map((task) => ({
        task,
        priority: highestPriority(priorities[task.id] ?? []),
        priorities: priorities[task.id] ?? []
      }))
    );
  });

  ngOnInit(): void {
    this.loadUsers();
    this.loadProject();
  }

  addSubtask(event?: Event): void {
    event?.preventDefault();
    if (!this.canSubmit()) return;
    const project = this.project();
    if (!project) return;

    const title = this.subtaskValue().trim();
    if (!title) return;

    this.submitting.set(true);
    this.error.set(null);

    const payload: Partial<Task> = {
      title,
      description: null,
      owner: 'both',
      effort: 15,
      category: project.category,
      time_mode: null,
      due_date: null,
      planned_date: null,
      is_project: 0,
      parent_id: project.id,
      completed_at: null
    };

    this.taskService
      .create(payload)
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (task) => {
          this.subtaskControl.setValue('');
          const next = [...this.subtasks(), task];
          this.subtasks.set(next);
          this.fetchPriorities(next);
        },
        error: () => this.error.set('Unteraufgabe konnte nicht erstellt werden')
      });
  }

  goBack(): void {
    this.router.navigateByUrl('/projects');
  }

  private loadProject(): void {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        switchMap((id) => {
          if (!id) {
            this.error.set('Projekt konnte nicht geladen werden');
            return of({ project: null as Task | null, subtasks: [] as Task[] });
          }

          this.loading.set(true);
          this.error.set(null);

          return forkJoin({
            project: this.taskService.get(id),
            subtasks: this.taskService.list({ parent_id: id, limit: 200 })
          }).pipe(finalize(() => this.loading.set(false)));
        }),
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.error.set('Projekt konnte nicht geladen werden');
          return of({ project: null as Task | null, subtasks: [] as Task[] });
        })
      )
      .subscribe(({ project, subtasks }) => {
        this.project.set(project);
        this.subtasks.set(subtasks);
        this.fetchPriorities(subtasks);
      });
  }

  private loadUsers(): void {
    this.userService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => this.users.set(users),
        error: () => this.error.set('Nutzer konnten nicht geladen werden')
      });
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
    this.subtasks.update((items) => items.map((item) => (item.id === task.id ? task : item)));
  }

  private sortByPriority(items: TaskCardView[]): TaskCardView[] {
    return [...items].sort((first, second) => {
      const delta = priorityScore(second.priority) - priorityScore(first.priority);
      if (delta) return delta;
      return this.compareDates(first.task.created_at, second.task.created_at, 'desc');
    });
  }

  private compareDates(
    first: string | null | undefined,
    second: string | null | undefined,
    direction: 'asc' | 'desc'
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
}
