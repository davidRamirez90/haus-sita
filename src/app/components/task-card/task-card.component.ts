import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Task } from '../../core/task.model';
import { PriorityLevel, TaskPriority } from '../../core/priority.model';
import { User } from '../../core/user.model';

@Component({
  selector: 'app-task-card',
  imports: [],
  templateUrl: './task-card.component.html',
  styleUrls: ['./task-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskCardComponent {
  readonly task = input.required<Task>();
  readonly priority = input<PriorityLevel>('none');
  readonly priorities = input<TaskPriority[]>([]);
  readonly users = input<User[]>([]);

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
}
