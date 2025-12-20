import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'today' },
  {
    path: 'today',
    loadComponent: () => import('./pages/today/today.page').then((m) => m.TodayPage)
  },
  {
    path: 'week',
    loadComponent: () => import('./pages/week/week.page').then((m) => m.WeekPage)
  },
  {
    path: 'categories',
    loadComponent: () => import('./pages/categories/categories.page').then((m) => m.CategoriesPage)
  },
  {
    path: 'projects/:id',
    loadComponent: () => import('./pages/project-detail/project-detail.page').then((m) => m.ProjectDetailPage)
  },
  {
    path: 'projects',
    pathMatch: 'full',
    loadComponent: () => import('./pages/projects/projects.page').then((m) => m.ProjectsPage)
  },
  {
    path: 'inbox',
    loadComponent: () => import('./pages/inbox/inbox.page').then((m) => m.InboxPage)
  },
  {
    path: 'tasks/new',
    loadComponent: () => import('./pages/task-create/task-create.page').then((m) => m.TaskCreatePage)
  },
  { path: '**', redirectTo: 'today' }
];
