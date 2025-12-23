import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { Task } from '../../core/task.model';
import { PriorityLevel, TaskPriority } from '../../core/priority.model';
import { User } from '../../core/user.model';
import { TaskService } from '../../core/task.service';

@Component({
  selector: 'app-task-card',
  imports: [],
  templateUrl: './task-card.component.html',
  styleUrls: ['./task-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskCardComponent {
  private readonly taskService = inject(TaskService);

  readonly task = input.required<Task>();
  readonly priority = input<PriorityLevel>('none');
  readonly priorities = input<TaskPriority[]>([]);
  readonly users = input<User[]>([]);
  readonly taskUpdated = output<Task>();

  readonly markingDone = signal(false);

  private readonly priorityColors: Record<PriorityLevel, string> = {
    none: '#D1D5DB',
    low: '#34D399',
    medium: '#FBBF24',
    high: '#F87171'
  };

  private readonly ownerColors: Record<'you' | 'partner' | 'both', string> = {
    you: '#818CF8',
    partner: '#2DD4BF',
    both: '#10B981'
  };

  readonly priorityColor = computed(() => this.priorityColors[this.priority()] ?? this.priorityColors.none);

  readonly isUnassigned = computed(() => {
    const owner = this.task().owner;
    return owner === null || typeof owner === 'undefined';
  });

  readonly ownerColor = computed(() => {
    if (this.isUnassigned()) return '#D1D5DB';
    const owner = this.task().owner;
    if (!owner) return this.ownerColors.you;
    return this.ownerColors[owner] ?? this.ownerColors.you;
  });

  readonly effortLabel = computed(() => {
    const effort = this.task().effort;
    if (typeof effort === 'number' && effort > 0) return `${effort}m`;
    return '–';
  });

  readonly priorityBadges = computed(() => {
    const priorities = this.priorities();
    if (!priorities.length) return [];

    const userMap = new Map(this.users().map((user) => [user.id, user]));

    return priorities.map((item) => {
      const user = userMap.get(item.user_id);
      return {
        id: item.user_id,
        name: user?.name ?? item.user_id,
        priorityColor: this.priorityColors[item.priority] ?? this.priorityColors.none,
        userColor: user?.color ?? '#9CA3AF'
      };
    });
  });

  readonly missingOwner = computed(() => this.isUnassigned());

  readonly missingScheduling = computed(() => {
    const task = this.task();
    if (!task.time_mode) return true;
    if (task.time_mode === 'flexible') return !task.due_date;
    if (task.time_mode === 'fixed') return !task.planned_date;
    return false;
  });

  readonly missingCategory = computed(
    () => this.task().category === null || typeof this.task().category === 'undefined'
  );

  readonly needsAttention = computed(
    () => this.missingOwner() || this.missingScheduling() || this.missingCategory()
  );

  readonly isCompleted = computed(() => Boolean(this.task().completed_at) || this.task().status === 'done');

  readonly attentionChips = computed(() => {
    const chips: { label: string; icon: string }[] = [];

    if (this.missingOwner()) {
      chips.push({ label: 'Keine Zuordnung', icon: '👤' });
    }

    if (this.missingScheduling()) {
      chips.push({ label: 'Kein Datum', icon: '📅' });
    }

    if (this.missingCategory()) {
      chips.push({ label: 'Keine Kategorie', icon: '🏷️' });
    }

    return chips;
  });

  markDone(): void {
    if (this.isCompleted() || this.markingDone()) return;
    this.markingDone.set(true);

    const completedAt = new Date().toISOString();
    this.taskService.update(this.task().id, { completed_at: completedAt }).subscribe({
      next: (task) => {
        this.markingDone.set(false);
        this.taskUpdated.emit(task);
      },
      error: () => {
        this.markingDone.set(false);
      }
    });
  }
}
