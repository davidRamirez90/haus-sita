import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, map, of, switchMap } from 'rxjs';
import { TaskService } from '../../core/task.service';
import { CategoryService } from '../../core/category.service';
import { Task, TaskOwner, TaskStatus, TaskTimeMode } from '../../core/task.model';
import { Category } from '../../core/category.model';
import { PriorityLevel } from '../../core/priority.model';
import { UserService } from '../../core/user.service';
import { User } from '../../core/user.model';

const EFFORT_OPTIONS = [5, 10, 15, 30, 45, 60, 90, 120];

@Component({
  selector: 'app-task-create-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './task-create.page.html',
  styleUrls: ['./task-create.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskCreatePage implements OnInit {
  constructor(
    private readonly taskService: TaskService,
    private readonly categoryService: CategoryService,
    private readonly userService: UserService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly destroyRef: DestroyRef
  ) {}

  protected categories = signal<Category[]>([]);
  protected projects = signal<Task[]>([]);
  protected users = signal<User[]>([]);
  protected error = signal<string | null>(null);

  protected newTitle = signal('');
  protected newOwner = signal<TaskOwner | null>(null);
  protected newStatus = signal<TaskStatus>('inbox');
  protected newEffortIndex = signal(2);
  protected newCategory = signal<string | null>(null);
  protected newTimeMode = signal<TaskTimeMode | null>(null);
  protected newDueDate = signal<string | null>(null);
  protected newPlannedDate = signal<string | null>(null);
  protected newIsProject = signal(false);
  protected newParentId = signal<string | null>(null);
  protected newPriority = signal<PriorityLevel>('none');
  protected userPriorities = signal<Record<string, PriorityLevel>>({});
  protected submitting = signal(false);

  private readonly currentUserId = 'you';
  private returnUrl = '/inbox';

  get effortValue(): number {
    return EFFORT_OPTIONS[this.newEffortIndex()] ?? 15;
  }

  get effortOptions(): number[] {
    return EFFORT_OPTIONS;
  }

  ngOnInit(): void {
    this.returnUrl = this.resolveReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
    this.loadCategories();
    this.loadProjects();
    this.loadUsers();
  }

  loadCategories(): void {
    this.categoryService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => this.categories.set(categories),
        error: () => this.error.set('Kategorien konnten nicht geladen werden')
      });
  }

  loadProjects(): void {
    this.taskService
      .listProjects()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (projects) => this.projects.set(projects),
        error: () => this.error.set('Projekte konnten nicht geladen werden')
      });
  }

  loadUsers(): void {
    this.userService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.users.set(users);
          this.ensurePriorityDefaults(users);
        },
        error: () => this.error.set('Nutzer konnten nicht geladen werden')
      });
  }

  setEffortIndex(value: number | string): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.max(0, Math.min(this.effortOptions.length - 1, Math.trunc(parsed)));
    this.newEffortIndex.set(clamped);
  }

  setTimeMode(mode: TaskTimeMode | null): void {
    this.newTimeMode.set(mode ?? null);
    if (mode === 'fixed') {
      this.newDueDate.set(null);
    } else {
      this.newPlannedDate.set(null);
    }
  }

  setIsProject(isProject: boolean): void {
    this.newIsProject.set(isProject);
    if (isProject) {
      this.newParentId.set(null);
    }
  }

  setOwner(owner: TaskOwner | null): void {
    this.newOwner.set(owner ?? null);
  }

  setParentId(parentId: string): void {
    const normalized = parentId?.trim() || null;
    this.newParentId.set(normalized);
    if (normalized) {
      this.newIsProject.set(false);
    }
  }

  setCategory(categoryId: string): void {
    const normalized = categoryId?.trim() || null;
    this.newCategory.set(normalized);
  }

  setUserPriority(userId: string, priority: PriorityLevel): void {
    const trimmedId = userId?.trim();
    if (!trimmedId) return;

    this.userPriorities.update((current) => ({ ...current, [trimmedId]: priority }));
  }

  setSelfPriority(priority: PriorityLevel): void {
    this.newPriority.set(priority);
    this.setUserPriority(this.currentUserId, priority);
  }

  canSubmit(): boolean {
    if (this.submitting()) return false;
    const title = this.newTitle().trim();
    if (!title) return false;
    if (this.newTimeMode() === 'fixed' && !this.newPlannedDate()) return false;
    return true;
  }

  addTask(): void {
    const title = this.newTitle().trim();
    const timeMode = this.newTimeMode();

    if (!title || this.submitting()) return;
    if (timeMode === 'fixed' && !this.newPlannedDate()) {
      this.error.set('Geplantes Datum ist für fixe Aufgaben erforderlich');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const isProject = this.newIsProject() ? 1 : 0;
    const parentId = isProject ? null : this.newParentId();
    const dueDate = timeMode === 'flexible' ? this.normalizeDate(this.newDueDate()) : null;
    const plannedDate = timeMode === 'fixed' ? this.normalizeDate(this.newPlannedDate()) : null;

    const payload: Partial<Task> = {
      title,
      description: null,
      owner: this.newOwner(),
      status: this.newStatus(),
      effort: this.effortValue,
      category: this.newCategory(),
      time_mode: timeMode,
      due_date: dueDate,
      planned_date: plannedDate,
      is_project: isProject,
      parent_id: parentId,
      completed_at: null
    };

    const priority = this.newPriority();
    const priorityUpdates = this.buildPriorityUpdates();

    this.taskService
      .create(payload)
      .pipe(
        switchMap((task) => {
          if (priority === 'none' && !priorityUpdates.length) {
            return of(task);
          }
          const updates = priorityUpdates.length
            ? priorityUpdates
            : [{ user_id: this.currentUserId, priority }];
          return this.taskService
            .updatePriorities(task.id, updates)
            .pipe(
              map(() => task),
              catchError(() => of(task))
            );
        }),
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => this.navigateBack(),
        error: () => this.error.set('Aufgabe konnte nicht angelegt werden')
      });
  }

  cancel(): void {
    if (this.submitting()) return;
    this.navigateBack();
  }

  private navigateBack(): void {
    this.router.navigateByUrl(this.returnUrl);
  }

  private resolveReturnUrl(value: string | null): string {
    if (!value) return '/inbox';
    return value.startsWith('/') ? value : '/inbox';
  }

  private normalizeDate(value: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private ensurePriorityDefaults(users: User[]): void {
    const current = this.userPriorities();
    const next: Record<string, PriorityLevel> = { ...current };

    for (const user of users) {
      if (!next[user.id]) {
        next[user.id] = 'none';
      }
    }

    this.userPriorities.set(next);
  }

  private buildPriorityUpdates(): { user_id: string; priority: PriorityLevel }[] {
    return Object.entries(this.userPriorities())
      .filter(([, priority]) => priority !== 'none')
      .map(([userId, priority]) => ({ user_id: userId, priority }));
  }
}
