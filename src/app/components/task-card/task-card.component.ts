import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { Task } from '../../core/task.model';
import { PriorityLevel, TaskPriority } from '../../core/priority.model';
import { User } from '../../core/user.model';

@Component({
  selector: 'app-task-card',
  imports: [NgIf],
  templateUrl: './task-card.component.html',
  styleUrls: ['./task-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskCardComponent {
  @Input({ required: true }) task!: Task;
  @Input() priority: PriorityLevel = 'none';
  @Input() priorities: TaskPriority[] = [];
  @Input() users: User[] = [];

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

  get priorityColor(): string {
    return this.priorityColors[this.priority] ?? this.priorityColors.none;
  }

  get isUnassigned(): boolean {
    return this.task.owner === null || typeof this.task.owner === 'undefined';
  }

  get ownerColor(): string {
    if (this.isUnassigned) return '#D1D5DB';
    return this.ownerColors[this.task.owner ?? 'you'] ?? this.ownerColors.you;
  }

  get effortLabel(): string {
    const effort = this.task.effort;
    if (typeof effort === 'number' && effort > 0) return `${effort}m`;
    return '–';
  }

  get priorityBadges(): { id: string; name: string; priorityColor: string; userColor: string }[] {
    if (!this.priorities.length) return [];

    const userMap = new Map(this.users.map((user) => [user.id, user]));

    return this.priorities.map((item) => {
      const user = userMap.get(item.user_id);
      return {
        id: item.user_id,
        name: user?.name ?? item.user_id,
        priorityColor: this.priorityColors[item.priority] ?? this.priorityColors.none,
        userColor: user?.color ?? '#9CA3AF'
      };
    });
  }
}
