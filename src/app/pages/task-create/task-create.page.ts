import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, map, of, switchMap } from 'rxjs';
import { TaskService } from '../../core/task.service';
import { CategoryService } from '../../core/category.service';
import { Task, TaskOwner, TaskTimeMode } from '../../core/task.model';
import { Category } from '../../core/category.model';
import { PriorityLevel } from '../../core/priority.model';
import { AuthService } from '../../core/auth.service';

const EFFORT_OPTIONS = [5, 10, 15, 30, 45, 60, 90, 120];

@Component({
  selector: 'app-task-create-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './task-create.page.html',
  styleUrls: ['./task-create.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskCreatePage implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly categoryService = inject(CategoryService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected categories = signal<Category[]>([]);
  protected projects = signal<Task[]>([]);
  protected error = signal<string | null>(null);

  protected newTitle = signal('');
  protected newOwner = signal<TaskOwner | null>(null);
  protected newEffortIndex = signal(2);
  protected newCategory = signal<string | null>(null);
  protected newTimeMode = signal<TaskTimeMode | null>(null);
  protected newDueDate = signal<string | null>(null);
  protected newPlannedDate = signal<string | null>(null);
  protected newIsProject = signal(false);
  protected newParentId = signal<string | null>(null);
  protected newPriority = signal<PriorityLevel>('none');
  protected submitting = signal(false);

  private readonly currentUserId = computed(() => this.authService.currentUser()?.id ?? 'you');
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


  setEffortIndex(value: number | string): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.max(0, Math.min(this.effortOptions.length - 1, Math.trunc(parsed)));
    this.newEffortIndex.set(clamped);
  }

  setTimeMode(mode: TaskTimeMode | null): void {
    const nextMode = mode ?? null;
    this.newTimeMode.set(nextMode);
    if (!nextMode) {
      this.newDueDate.set(null);
      this.newPlannedDate.set(null);
      return;
    }
    if (nextMode === 'fixed') {
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

  setSelfPriority(priority: PriorityLevel): void {
    this.newPriority.set(priority);
  }

  canSubmit(): boolean {
    if (this.submitting()) return false;
    const title = this.newTitle().trim();
    if (!title) return false;
    const timeMode = this.newTimeMode();
    if (timeMode === 'fixed' && !this.newPlannedDate()) return false;
    if (timeMode === 'flexible' && !this.newDueDate()) return false;
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
    if (timeMode === 'flexible' && !this.newDueDate()) {
      this.error.set('Fälligkeitsdatum ist für flexible Aufgaben erforderlich');
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

    this.taskService
      .create(payload)
      .pipe(
        switchMap((task) => {
          if (priority === 'none') {
            return of(task);
          }
          const updates = [{ user_id: this.currentUserId(), priority }];
          return this.taskService.updatePriorities(task.id, updates).pipe(
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

}
