import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, map, of, switchMap } from 'rxjs';
import { TaskService } from '../../core/task.service';
import { CategoryService } from '../../core/category.service';
import { Task, TaskStatus, TaskTimeMode } from '../../core/task.model';
import { Category } from '../../core/category.model';
import { PriorityLevel } from '../../core/priority.model';

const EFFORT_OPTIONS = [5, 10, 15, 30, 45, 60, 90, 120];

@Component({
  selector: 'app-task-create-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-create.page.html',
  styleUrls: ['./task-create.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskCreatePage implements OnInit {
  constructor(
    private readonly taskService: TaskService,
    private readonly categoryService: CategoryService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly destroyRef: DestroyRef
  ) {}

  protected categories = signal<Category[]>([]);
  protected projects = signal<Task[]>([]);
  protected error = signal<string | null>(null);

  protected newTitle = signal('');
  protected newStatus = signal<TaskStatus>('inbox');
  protected newEffortIndex = signal(2);
  protected newCategory = signal<string | null>(null);
  protected newTimeMode = signal<TaskTimeMode>('flexible');
  protected newDueDate = signal<string | null>(null);
  protected newPlannedDate = signal<string | null>(null);
  protected newIsProject = signal(false);
  protected newParentId = signal<string | null>(null);
  protected newPriority = signal<PriorityLevel>('none');
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
  }

  loadCategories(): void {
    this.categoryService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => {
          this.categories.set(categories);
          if (!this.newCategory() && categories.length) {
            this.newCategory.set(categories[0].id);
          }
        },
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

  setTimeMode(mode: TaskTimeMode): void {
    this.newTimeMode.set(mode);
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

  canSubmit(): boolean {
    if (this.submitting()) return false;
    const title = this.newTitle().trim();
    if (!title) return false;
    if (!this.newCategory()) return false;
    if (this.newTimeMode() === 'fixed' && !this.newPlannedDate()) return false;
    return true;
  }

  addTask(): void {
    const title = this.newTitle().trim();
    const category = this.newCategory();
    const timeMode = this.newTimeMode();

    if (!title || this.submitting()) return;
    if (!category) {
      this.error.set('Kategorie ist erforderlich');
      return;
    }
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
      owner: 'both',
      status: this.newStatus(),
      effort: this.effortValue,
      category,
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
          return this.taskService
            .updatePriorities(task.id, { user_id: this.currentUserId, priority })
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
}
