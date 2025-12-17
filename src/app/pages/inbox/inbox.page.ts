import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, map, of, switchMap } from 'rxjs';
import { TaskCardComponent } from '../../components/task-card/task-card.component';
import { TaskService } from '../../core/task.service';
import { Task, TaskStatus, TaskTimeMode } from '../../core/task.model';
import { PriorityLevel } from '../../core/priority.model';

@Component({
  selector: 'app-inbox-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskCardComponent],
  templateUrl: './inbox.page.html',
  styleUrls: ['./inbox.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InboxPage implements OnInit {
  constructor(
    private readonly taskService: TaskService,
    private readonly destroyRef: DestroyRef
  ) {}

  protected tasks = signal<Task[]>([]);
  protected projects = signal<Task[]>([]);
  protected loading = signal(false);
  protected error = signal<string | null>(null);

  protected newTitle = signal('');
  protected newStatus = signal<TaskStatus>('inbox');
  protected newEffort = signal(15);
  protected newCategory = signal('general');
  protected newTimeMode = signal<TaskTimeMode>('flexible');
  protected newDueDate = signal<string | null>(null);
  protected newPlannedDate = signal<string | null>(null);
  protected newIsProject = signal(false);
  protected newParentId = signal<string | null>(null);
  protected newPriority = signal<PriorityLevel>('none');
  protected submitting = signal(false);
  protected showComposer = signal(false);

  private readonly currentUserId = 'you';

  ngOnInit(): void {
    this.loadInbox();
    this.loadProjects();
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
        next: (tasks) => this.tasks.set(tasks),
        error: () => this.error.set('Could not load tasks')
      });
  }

  loadProjects(): void {
    this.taskService
      .listProjects()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (projects) => this.projects.set(projects),
        error: () => this.error.set('Could not load projects')
      });
  }

  setEffort(value: number | string): void {
    const parsed = Number(value);
    this.newEffort.set(Number.isFinite(parsed) ? parsed : 15);
  }

  openComposer(): void {
    this.showComposer.set(true);
  }

  closeComposer(): void {
    if (this.submitting()) return;
    this.showComposer.set(false);
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

  canSubmit(): boolean {
    if (this.submitting()) return false;
    const title = this.newTitle().trim();
    if (!title) return false;
    const category = this.newCategory().trim();
    if (!category) return false;
    if (this.newTimeMode() === 'fixed' && !this.newPlannedDate()) return false;
    return true;
  }

  addTask(): void {
    const title = this.newTitle().trim();
    const category = this.newCategory().trim();
    const timeMode = this.newTimeMode();

    if (!title || this.submitting()) return;
    if (!category) {
      this.error.set('Category is required');
      return;
    }
    if (timeMode === 'fixed' && !this.newPlannedDate()) {
      this.error.set('Planned date is required for fixed tasks');
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
      effort: this.newEffort(),
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
        next: (task) => {
          if (task.status === 'inbox') {
            this.tasks.update((list) => [task, ...list]);
          }
          if (task.is_project) {
            this.projects.update((list) => [task, ...list]);
          }
          this.resetForm();
          this.closeComposer();
        },
        error: () => this.error.set('Could not add task')
      });
  }

  private resetForm(): void {
    this.newTitle.set('');
    this.newStatus.set('inbox');
    this.newEffort.set(15);
    this.newCategory.set('general');
    this.newTimeMode.set('flexible');
    this.newDueDate.set(null);
    this.newPlannedDate.set(null);
    this.newIsProject.set(false);
    this.newParentId.set(null);
    this.newPriority.set('none');
  }

  private normalizeDate(value: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
