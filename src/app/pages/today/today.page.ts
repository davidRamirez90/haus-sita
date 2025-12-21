import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import { TaskCardComponent } from '../../components/task-card/task-card.component';
import { TaskService } from '../../core/task.service';
import { UserService } from '../../core/user.service';
import { AuthService } from '../../core/auth.service';
import { Task } from '../../core/task.model';
import { PriorityLevel, TaskPriority } from '../../core/priority.model';
import { User } from '../../core/user.model';
import { highestPriority, priorityForUser, priorityScore } from '../../core/priority.utils';

type TaskCardView = {
  task: Task;
  priority: PriorityLevel;
  priorities: TaskPriority[];
};

type TaskSection = {
  id: string;
  title: string;
  emptyMessage: string;
  tasks: TaskCardView[];
};

@Component({
  selector: 'app-today-page',
  imports: [CommonModule, TaskCardComponent],
  templateUrl: './today.page.html',
  styleUrls: ['./today.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TodayPage implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tasks = signal<Task[]>([]);
  protected readonly users = signal<User[]>([]);
  protected readonly taskPriorities = signal<Record<string, TaskPriority[]>>({});
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly currentUserId = computed(() => this.authService.currentUser()?.id ?? 'you');
  private readonly partnerUserId = computed(() => {
    const currentId = this.currentUserId();
    const partner = this.users().find((user) => user.id !== currentId)?.id;
    return partner ?? 'partner';
  });
  private readonly todayKey = this.toDateKey(new Date());

  protected readonly greetingLine = computed(() => {
    const authUser = this.authService.currentUser();
    const match = authUser ?? this.users().find((user) => user.id === this.currentUserId());
    return match?.name ? `Guten Morgen, ${match.name}.` : 'Guten Morgen.';
  });

  protected readonly totalEffortLabel = computed(() => this.formatEffort(this.totalEffort()));

  protected readonly totalEffort = computed(() =>
    this.tasks().reduce((sum, task) => {
      const effort = task.effort ?? 0;
      return sum + (Number.isFinite(effort) ? effort : 0);
    }, 0)
  );

  protected readonly sections = computed<TaskSection[]>(() => {
    const list = this.tasks();
    const priorities = this.taskPriorities();
    const partnerName = this.userLabel(this.partnerUserId(), 'Partner');

    const groups: Record<'you' | 'partner' | 'both', TaskCardView[]> = {
      you: [],
      partner: [],
      both: []
    };

    for (const task of list) {
      const taskPriorities = priorities[task.id] ?? [];
      const priority = this.priorityForSection(task.owner, taskPriorities);
      const card: TaskCardView = { task, priority, priorities: taskPriorities };

      if (task.owner === 'you') {
        groups.you.push(card);
      } else if (task.owner === 'partner') {
        groups.partner.push(card);
      } else {
        groups.both.push(card);
      }
    }

    return [
      {
        id: 'you',
        title: 'Deine Aufgaben',
        emptyMessage: 'Keine Aufgaben für dich heute.',
        tasks: this.sortByPriority(groups.you)
      },
      {
        id: 'partner',
        title: `Aufgaben von ${partnerName}`,
        emptyMessage: `Keine Aufgaben für ${partnerName}.`,
        tasks: this.sortByPriority(groups.partner)
      },
      {
        id: 'both',
        title: 'Zusammen',
        emptyMessage: 'Keine gemeinsamen Aufgaben.',
        tasks: this.sortByPriority(groups.both)
      }
    ];
  });

  ngOnInit(): void {
    this.loadUsers();
    this.loadToday();
  }

  private loadToday(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      today: this.taskService.list({ status: 'today', limit: 200 }),
      planned: this.taskService.list({ planned_for: this.todayKey, limit: 200 })
    })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ today, planned }) => {
          const merged = this.mergeTasks([...today, ...planned]).filter((task) => task.status !== 'done');
          this.tasks.set(merged);
          this.fetchPriorities(merged);
        },
        error: () => this.error.set('Heutige Aufgaben konnten nicht geladen werden')
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

  private priorityForSection(owner: Task['owner'], priorities: TaskPriority[]): PriorityLevel {
    if (owner === 'you') {
      return priorityForUser(priorities, this.currentUserId());
    }

    if (owner === 'partner') {
      return priorityForUser(priorities, this.partnerUserId());
    }

    return highestPriority(priorities);
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

  private mergeTasks(tasks: Task[]): Task[] {
    const map = new Map<string, Task>();
    for (const task of tasks) {
      if (!map.has(task.id)) {
        map.set(task.id, task);
      }
    }
    return [...map.values()];
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

  private userLabel(id: string, fallback: string): string {
    return this.users().find((user) => user.id === id)?.name ?? fallback;
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
