import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import { TaskCardComponent } from '../../components/task-card/task-card.component';
import { CategoryService } from '../../core/category.service';
import { TaskListFilters, TaskService } from '../../core/task.service';
import { Task, TaskStatus } from '../../core/task.model';
import { Category } from '../../core/category.model';
import { UserService } from '../../core/user.service';
import { User } from '../../core/user.model';
import { TaskPriority } from '../../core/priority.model';

@Component({
  selector: 'app-inbox-page',
  standalone: true,
  imports: [CommonModule, RouterModule, TaskCardComponent],
  templateUrl: './inbox.page.html',
  styleUrls: ['./inbox.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InboxPage implements OnInit {
  constructor(
    private readonly taskService: TaskService,
    private readonly categoryService: CategoryService,
    private readonly userService: UserService,
    private readonly destroyRef: DestroyRef
  ) {}

  protected tasks = signal<Task[]>([]);
  protected categories = signal<Category[]>([]);
  protected users = signal<User[]>([]);
  protected taskPriorities = signal<Record<string, TaskPriority[]>>({});
  protected loading = signal(false);
  protected error = signal<string | null>(null);

  protected statusFilter = signal<TaskStatus | 'all'>('inbox');
  protected categoryFilter = signal<string>('all');
  protected dateFilter = signal<'any' | 'due' | 'planned'>('any');
  protected sortMode = signal<'created' | 'due' | 'planned'>('created');

  protected filteredTasks = computed(() => {
    const selectedStatus = this.statusFilter();
    const selectedCategory = this.categoryFilter();
    const selectedDateFilter = this.dateFilter();
    const selectedSort = this.sortMode();

    let list = this.tasks();

    if (selectedStatus !== 'all') {
      list = list.filter((task) => task.status === selectedStatus);
    }

    if (selectedCategory !== 'all') {
      list = list.filter((task) => task.category === selectedCategory);
    }

    if (selectedDateFilter === 'due') {
      list = list.filter((task) => Boolean(task.due_date));
    } else if (selectedDateFilter === 'planned') {
      list = list.filter((task) => Boolean(task.planned_date));
    }

    const sorter = this.sorterFor(selectedSort);
    return [...list].sort(sorter);
  });

  protected readonly statusOptions: { value: TaskStatus | 'all'; label: string }[] = [
    { value: 'inbox', label: 'Inbox' },
    { value: 'planned', label: 'Geplant' },
    { value: 'today', label: 'Heute' },
    { value: 'done', label: 'Erledigt' },
    { value: 'all', label: 'Alle' }
  ];

  protected readonly dateFilters = [
    { value: 'any', label: 'Alle Aufgaben' },
    { value: 'due', label: 'Mit Fälligkeitsdatum' },
    { value: 'planned', label: 'Mit geplantem Datum' }
  ];

  protected readonly sortOptions = [
    { value: 'created', label: 'Zuletzt hinzugefügt' },
    { value: 'due', label: 'Nach Fälligkeit' },
    { value: 'planned', label: 'Nach geplantem Datum' }
  ];

  ngOnInit(): void {
    this.loadFilters();
    this.loadInbox();
    this.loadCategories();
    this.loadUsers();
  }

  loadInbox(): void {
    this.loading.set(true);
    this.error.set(null);

    const filters: TaskListFilters = {};
    const status = this.statusFilter();
    const category = this.categoryFilter();

    if (status !== 'all') {
      filters.status = status;
    }

    if (category !== 'all') {
      filters.category = category;
    }

    this.taskService
      .list(filters)
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

  loadCategories(): void {
    this.categoryService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((categories) => this.categories.set(categories));
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

  onStatusChange(event: Event): void {
    const nextStatus = (event.target as HTMLSelectElement | null)?.value as TaskStatus | 'all' | undefined;
    this.statusFilter.set(this.normalizeStatus(nextStatus));
    this.loadInbox();
  }

  onCategoryChange(event: Event): void {
    const nextCategory = (event.target as HTMLSelectElement | null)?.value ?? 'all';
    this.categoryFilter.set(nextCategory || 'all');
    this.loadInbox();
  }

  onDateFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement | null)?.value as 'any' | 'due' | 'planned' | undefined;
    this.dateFilter.set(value ?? 'any');
  }

  onSortChange(event: Event): void {
    const value = (event.target as HTMLSelectElement | null)?.value as 'created' | 'due' | 'planned' | undefined;
    this.sortMode.set(value ?? 'created');
  }

  private sorterFor(mode: 'created' | 'due' | 'planned'): (a: Task, b: Task) => number {
    if (mode === 'due') {
      return (a, b) => this.compareDates(a.due_date, b.due_date) || this.compareDates(a.created_at, b.created_at, 'desc');
    }

    if (mode === 'planned') {
      return (a, b) =>
        this.compareDates(a.planned_date, b.planned_date) || this.compareDates(a.created_at, b.created_at, 'desc');
    }

    return (a, b) => this.compareDates(a.created_at, b.created_at, 'desc');
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

  private normalizeStatus(value: TaskStatus | 'all' | undefined): TaskStatus | 'all' {
    if (!value) return 'all';
    return this.statusOptions.some((option) => option.value === value) ? value : 'all';
  }

  private loadFilters(): void {
    this.statusFilter.set('inbox');
    this.categoryFilter.set('all');
    this.dateFilter.set('any');
    this.sortMode.set('created');
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
}
