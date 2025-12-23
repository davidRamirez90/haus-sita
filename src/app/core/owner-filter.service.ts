import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { Task } from './task.model';

export type OwnerFilterMode = 'all' | 'mine';

@Injectable({ providedIn: 'root' })
export class OwnerFilterService {
  private readonly authService = inject(AuthService);
  private readonly modeSignal = signal<OwnerFilterMode>('all');

  readonly mode = computed(() => this.modeSignal());
  readonly currentUserId = computed(() => this.authService.currentUser()?.id ?? null);

  setMode(mode: OwnerFilterMode): void {
    this.modeSignal.set(mode);
  }

  filterTasks(tasks: Task[]): Task[] {
    if (this.modeSignal() === 'all') return tasks;
    const currentUser = this.currentUserId();
    return tasks.filter((task) => this.isMine(task, currentUser));
  }

  private isMine(task: Task, currentUser: string | null): boolean {
    const owner = task.owner ?? null;
    if (owner === null) return true;
    if (owner === 'both') return true;
    if (!currentUser) return false;
    return owner === currentUser;
  }
}
