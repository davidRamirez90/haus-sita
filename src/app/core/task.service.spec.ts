import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TaskService } from './task.service';
import { Task } from './task.model';

describe('TaskService', () => {
  let service: TaskService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TaskService]
    });
    service = TestBed.inject(TaskService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('builds list params from filters', () => {
    service
      .list({
        status: 'planned',
        owner: 'you',
        category: 'room.living',
        is_project: true,
        limit: 20,
        offset: 10
      })
      .subscribe();

    const req = httpMock.expectOne((request) => request.url === '/api/tasks');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('status')).toBe('planned');
    expect(req.request.params.get('owner')).toBe('you');
    expect(req.request.params.get('category')).toBe('room.living');
    expect(req.request.params.get('is_project')).toBe('1');
    expect(req.request.params.get('limit')).toBe('20');
    expect(req.request.params.get('offset')).toBe('10');
    req.flush({ tasks: [] });
  });

  it('omits status when set to all', () => {
    service.list({ status: 'all' }).subscribe();

    const req = httpMock.expectOne('/api/tasks');
    expect(req.request.params.has('status')).toBeFalse();
    req.flush({ tasks: [] });
  });

  it('posts payload on create', () => {
    const payload: Partial<Task> = { title: 'Test task' };
    const responseTask: Task = { id: 'task-1', title: 'Test task' };

    service.create(payload).subscribe((task) => {
      expect(task).toEqual(responseTask);
    });

    const req = httpMock.expectOne('/api/tasks');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ task: responseTask });
  });

  it('patches payload on update', () => {
    const patch: Partial<Task> = { title: 'Updated task' };
    const responseTask: Task = { id: 'task-1', title: 'Updated task' };

    service.update('task-1', patch).subscribe((task) => {
      expect(task).toEqual(responseTask);
    });

    const req = httpMock.expectOne('/api/tasks/task-1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(patch);
    req.flush({ task: responseTask });
  });
});
