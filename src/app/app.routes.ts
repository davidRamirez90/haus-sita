import { Routes } from '@angular/router';
import { InboxPage } from './pages/inbox/inbox.page';
import { TaskCreatePage } from './pages/task-create/task-create.page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inbox' },
  { path: 'inbox', component: InboxPage },
  { path: 'tasks/new', component: TaskCreatePage },
  { path: '**', redirectTo: 'inbox' }
];
