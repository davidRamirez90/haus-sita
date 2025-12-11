import { Routes } from '@angular/router';
import { InboxPage } from './pages/inbox/inbox.page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inbox' },
  { path: 'inbox', component: InboxPage },
  { path: '**', redirectTo: 'inbox' }
];
