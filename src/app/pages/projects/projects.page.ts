import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin } from 'rxjs';
import { ProgressBarComponent } from '../../components/progress-bar/progress-bar.component';
import { CategoryService } from '../../core/category.service';
import { TaskService } from '../../core/task.service';
import { Category } from '../../core/category.model';
import { Task } from '../../core/task.model';

type ProjectCard = {
  id: string;
  title: string;
  description: string | null;
  categoryLabel: string | null;
  completed: number;
  total: number;
  progressLabel: string;
};

@Component({
  selector: 'app-projects-page',
  imports: [CommonModule, RouterModule, ProgressBarComponent],
  templateUrl: './projects.page.html',
  styleUrls: ['./projects.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectsPage implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly categoryService = inject(CategoryService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly projects = signal<Task[]>([]);
  protected readonly tasks = signal<Task[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly projectCards = computed<ProjectCard[]>(() => {
    const projects = this.projects();
    const tasks = this.tasks();
    const categoryMap = this.categoryMap();

    return projects.map((project) => {
      const subtasks = tasks.filter((task) => task.parent_id === project.id);
      const completed = subtasks.filter((task) => task.status === 'done').length;
      const total = subtasks.length;
      const categoryKey = project.category ?? null;
      const categoryLabel = categoryKey ? categoryMap[categoryKey] ?? null : null;

      return {
        id: project.id,
        title: project.title,
        description: project.description ?? null,
        categoryLabel,
        completed,
        total,
        progressLabel: `${completed}/${total} erledigt`
      };
    });
  });

  protected readonly activeCount = computed(() => this.projectCards().length);

  ngOnInit(): void {
    this.loadOverview();
  }

  private loadOverview(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      projects: this.taskService.listProjects(),
      tasks: this.taskService.list({ limit: 200 }),
      categories: this.categoryService.list()
    })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ projects, tasks, categories }) => {
          this.projects.set(projects);
          this.tasks.set(tasks);
          this.categories.set(categories);
        },
        error: () => this.error.set('Projekte konnten nicht geladen werden')
      });
  }

  private categoryMap(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const category of this.categories()) {
      map[category.id] = category.label;
    }
    return map;
  }
}
