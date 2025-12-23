import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import { TaskCardComponent } from '../../components/task-card/task-card.component';
import { TaskService } from '../../core/task.service';
import { UserService } from '../../core/user.service';
import { Task } from '../../core/task.model';
import { PriorityLevel, TaskPriority } from '../../core/priority.model';
import { User } from '../../core/user.model';
import { highestPriority, priorityScore } from '../../core/priority.utils';
import { OwnerFilterService } from '../../core/owner-filter.service';

type TaskCardView = {
  task: Task;
  priority: PriorityLevel;
  priorities: TaskPriority[];
};

type WeekDay = {
  key: string;
  label: string;
  fullLabel: string;
  isToday: boolean;
};

type WeekEntry = WeekDay & {
  tasks: TaskCardView[];
  effortLabel: string;
  totalEffort: number;
  isOverloaded: boolean;
};

@Component({
  selector: 'app-week-page',
  imports: [CommonModule, TaskCardComponent],
  templateUrl: './week.page.html',
  styleUrls: ['./week.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WeekPage implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly userService = inject(UserService);
  private readonly ownerFilter = inject(OwnerFilterService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tasks = signal<Task[]>([]);
  protected readonly users = signal<User[]>([]);
  protected readonly taskPriorities = signal<Record<string, TaskPriority[]>>({});
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly todayDate = new Date();
  private readonly todayKey = this.toDateKey(this.todayDate);
  private readonly weekDays = signal<WeekDay[]>(this.buildWeekDays(this.todayDate));
  private readonly overloadThreshold = 240;

  protected readonly weekEntries = computed<WeekEntry[]>(() => {
    const entries = this.weekDays();
    const list = this.ownerFilter.filterTasks(this.tasks()).filter((task) => task.status !== 'done');
    const priorities = this.taskPriorities();

    return entries.map((day) => {
      const tasks = list.filter((task) => this.taskMatchesDay(task, day.key));
      const cards = this.sortByPriority(
        tasks.map((task) => ({
          task,
          priority: highestPriority(priorities[task.id] ?? []),
          priorities: priorities[task.id] ?? []
        }))
      );
      const totalEffort = tasks.reduce((sum, task) => {
        const effort = task.effort ?? 0;
        return sum + (Number.isFinite(effort) ? effort : 0);
      }, 0);
      return {
        ...day,
        tasks: cards,
        totalEffort,
        effortLabel: this.formatEffort(totalEffort),
        isOverloaded: totalEffort > this.overloadThreshold
      };
    });
  });

  protected readonly weekBucket = computed<TaskCardView[]>(() => {
    const list = this.ownerFilter.filterTasks(this.tasks()).filter((task) => task.status !== 'done');
    const priorities = this.taskPriorities();
    const unassigned = list.filter((task) => task.status === 'planned' && !task.planned_date);

    return this.sortByPriority(
      unassigned.map((task) => ({
        task,
        priority: highestPriority(priorities[task.id] ?? []),
        priorities: priorities[task.id] ?? []
      }))
    );
  });

  protected readonly weekRangeLabel = computed(() => {
    const days = this.weekDays();
    if (!days.length) return '';
    const first = days[0];
    const last = days[days.length - 1];
    return `${first.label} - ${last.label}`;
  });

  ngOnInit(): void {
    this.loadUsers();
    this.loadWeek();
  }

  private loadWeek(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      planned: this.taskService.list({ status: 'planned', limit: 200 }),
      today: this.taskService.list({ status: 'today', limit: 200 })
    })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ planned, today }) => {
          const merged = [...planned, ...today];
          this.tasks.set(merged);
          this.fetchPriorities(merged);
        },
        error: () => this.error.set('Wochenplan konnte nicht geladen werden')
      });
  }

  private loadUsers(): void {
    this.userService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => this.users.set(users),
        error: () => this.error.set('Nutzer konnten nicht geladen werden')
      });
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

  private buildWeekDays(today: Date): WeekDay[] {
    const start = this.startOfWeek(today);
    const days: WeekDay[] = [];

    for (let index = 0; index < 7; index += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = this.toDateKey(date);
      const label = this.formatShortLabel(date);
      days.push({
        key,
        label,
        fullLabel: this.formatFullLabel(date),
        isToday: key === this.todayKey
      });
    }

    return days;
  }

  private startOfWeek(value: Date): Date {
    const date = new Date(value);
    const day = date.getDay();
    const diff = (day + 6) % 7;
    date.setDate(date.getDate() - diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatShortLabel(date: Date): string {
    const weekday = new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(date).replace('.', '');
    return `${weekday} ${date.getDate()}`;
  }

  private formatFullLabel(date: Date): string {
    return new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  }

  private taskMatchesDay(task: Task, dayKey: string): boolean {
    if (task.planned_date) {
      return task.planned_date === dayKey;
    }

    return task.status === 'today' && dayKey === this.todayKey;
  }

  private sortByPriority(items: TaskCardView[]): TaskCardView[] {
    return [...items].sort((first, second) => {
      const delta = priorityScore(second.priority) - priorityScore(first.priority);
      if (delta) return delta;
      return this.compareDates(first.task.created_at, second.task.created_at, 'desc');
    });
  }

  private compareDates(
    first: string | null | undefined,
    second: string | null | undefined,
    direction: 'asc' | 'desc'
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

  private formatEffort(totalMinutes: number): string {
    const minutes = Math.max(0, Math.round(totalMinutes));
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;

    if (hours && remainder) {
      return `${hours}h ${remainder}m`;
    }
    if (hours) {
      return `${hours}h`;
    }
    return `${remainder}m`;
  }

  protected handleTaskUpdated(task: Task): void {
    this.tasks.update((items) => items.map((item) => (item.id === task.id ? task : item)));
  }
}
