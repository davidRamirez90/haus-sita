import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import { CategoryChipComponent } from '../../components/category-chip/category-chip.component';
import { TaskCardComponent } from '../../components/task-card/task-card.component';
import { CategoryService } from '../../core/category.service';
import { TaskService } from '../../core/task.service';
import { UserService } from '../../core/user.service';
import { Category } from '../../core/category.model';
import { Task } from '../../core/task.model';
import { PriorityLevel, TaskPriority } from '../../core/priority.model';
import { User } from '../../core/user.model';
import { highestPriority, priorityScore } from '../../core/priority.utils';

type TaskCardView = {
  task: Task;
  priority: PriorityLevel;
  priorities: TaskPriority[];
};

@Component({
  selector: 'app-categories-page',
  imports: [CommonModule, CategoryChipComponent, TaskCardComponent],
  templateUrl: './categories.page.html',
  styleUrls: ['./categories.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriesPage implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly taskService = inject(TaskService);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly categories = signal<Category[]>([]);
  protected readonly selectedCategoryId = signal<string | null>(null);
  protected readonly tasks = signal<Task[]>([]);
  protected readonly users = signal<User[]>([]);
  protected readonly taskPriorities = signal<Record<string, TaskPriority[]>>({});
  protected readonly showCompleted = signal(false);
  private readonly loadingCategories = signal(false);
  private readonly loadingTasks = signal(false);
  protected readonly loading = computed(() => this.loadingCategories() || this.loadingTasks());
  protected readonly error = signal<string | null>(null);

  protected readonly selectedCategoryLabel = computed(() => {
    const selected = this.selectedCategoryId();
    if (!selected) return 'Alle Räume';
    return this.categories().find((category) => category.id === selected)?.label ?? 'Alle Räume';
  });

  protected readonly visibleTasks = computed<TaskCardView[]>(() => {
    const showCompleted = this.showCompleted();
    const priorities = this.taskPriorities();
    const list = showCompleted ? this.tasks() : this.tasks().filter((task) => task.status !== 'done');

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
    this.loadCategories();
  }

  selectCategory(categoryId: string): void {
    this.selectedCategoryId.set(categoryId);
    this.loadTasks(categoryId);
  }

  toggleCompleted(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.showCompleted.set(Boolean(input?.checked));
  }

  private loadCategories(): void {
    this.loadingCategories.set(true);
    this.error.set(null);

    this.categoryService
      .list()
      .pipe(
        finalize(() => this.loadingCategories.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (categories) => {
          this.categories.set(categories);
          const initial = categories[0]?.id ?? null;
          this.selectedCategoryId.set(initial);
          if (initial) {
            this.loadTasks(initial);
          } else {
            this.tasks.set([]);
          }
        },
        error: () => this.error.set('Kategorien konnten nicht geladen werden')
      });
  }

  private loadTasks(categoryId: string): void {
    this.loadingTasks.set(true);
    this.error.set(null);

    this.taskService
      .list({ category: categoryId, limit: 200 })
      .pipe(
        finalize(() => this.loadingTasks.set(false)),
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
