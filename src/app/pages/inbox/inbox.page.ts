import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { TaskCardComponent } from '../../components/task-card/task-card.component';
import { TaskService } from '../../core/task.service';
import { Task } from '../../core/task.model';

@Component({
  selector: 'app-inbox-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskCardComponent],
  templateUrl: './inbox.page.html',
  styleUrls: ['./inbox.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InboxPage implements OnInit {
  protected tasks = signal<Task[]>([]);
  protected loading = signal(false);
  protected error = signal<string | null>(null);

  protected newTitle = signal('');
  protected submitting = signal(false);

  private readonly taskService = inject(TaskService);

  ngOnInit(): void {
    this.loadInbox();
  }

  loadInbox(): void {
    this.loading.set(true);
    this.error.set(null);

    this.taskService
      .listInbox()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed()
      )
      .subscribe({
        next: (tasks) => this.tasks.set(tasks),
        error: () => this.error.set('Could not load tasks')
      });
  }

  addTask(): void {
    const title = this.newTitle().trim();
    if (!title || this.submitting()) return;

    this.submitting.set(true);
    this.error.set(null);

    const payload: Partial<Task> = {
      title,
      owner: 'both',
      status: 'inbox',
      effort: 15,
      category: 'general',
      time_mode: 'flexible'
    };

    this.taskService
      .create(payload)
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed()
      )
      .subscribe({
        next: (task) => {
          this.tasks.update((list) => [task, ...list]);
          this.newTitle.set('');
        },
        error: () => this.error.set('Could not add task')
      });
  }
}
