import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { Task } from '../../core/task.model';
import { PriorityLevel } from '../../core/priority.model';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [NgIf],
  templateUrl: './task-card.component.html',
  styleUrls: ['./task-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskCardComponent {
  @Input({ required: true }) task!: Task;
  @Input() priority: PriorityLevel = 'none';

  private readonly priorityColors: Record<PriorityLevel, string> = {
    none: '#D1D5DB',
    low: '#34D399',
    medium: '#FBBF24',
    high: '#F87171'
  };

  private readonly ownerColors: Record<Task['owner'], string> = {
    you: '#818CF8',
    partner: '#2DD4BF',
    both: '#10B981'
  };

  get priorityColor(): string {
    return this.priorityColors[this.priority] ?? this.priorityColors.none;
  }

  get ownerColor(): string {
    return this.ownerColors[this.task.owner] ?? this.ownerColors.you;
  }

  get effortLabel(): string {
    return `${this.task.effort}m`;
  }
}
