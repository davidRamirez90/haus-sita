import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';
import { User } from './user.model';

interface AuthResponse {
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly currentUserSignal = signal<User | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly currentUser = computed(() => this.currentUserSignal());
  readonly loading = computed(() => this.loadingSignal());
  readonly error = computed(() => this.errorSignal());

  loadCurrentUser(): void {
    if (this.loadingSignal() || this.currentUserSignal()) {
      return;
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.http
      .get<AuthResponse>('/api/auth/me')
      .pipe(finalize(() => this.loadingSignal.set(false)))
      .subscribe({
        next: (res) => this.currentUserSignal.set(res.user),
        error: () => this.errorSignal.set('Authentication required')
      });
  }
}
