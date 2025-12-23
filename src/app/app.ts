import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { OwnerFilterMode, OwnerFilterService } from './core/owner-filter.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly ownerFilter = inject(OwnerFilterService);
  protected readonly title = signal('haus-sita');
  protected readonly ownerMode = computed(() => this.ownerFilter.mode());

  ngOnInit(): void {
    this.authService.loadCurrentUser();
  }

  setOwnerMode(mode: OwnerFilterMode): void {
    this.ownerFilter.setMode(mode);
  }
}
