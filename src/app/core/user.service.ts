import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { User } from './user.model';

interface UserListResponse {
  users: User[];
}

interface UserResponse {
  user: User;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly baseUrl = '/api/users';

  constructor(private readonly http: HttpClient) {}

  list(): Observable<User[]> {
    return this.http.get<UserListResponse>(this.baseUrl).pipe(map((res) => res.users ?? []));
  }

  get(id: string): Observable<User> {
    return this.http.get<UserResponse>(`${this.baseUrl}/${id}`).pipe(map((res) => res.user));
  }

  create(user: Pick<User, 'name' | 'color' | 'email'> & Partial<Pick<User, 'id'>>): Observable<User> {
    return this.http.post<UserResponse>(this.baseUrl, user).pipe(map((res) => res.user));
  }

  update(id: string, patch: Partial<Pick<User, 'name' | 'color' | 'email'>>): Observable<User> {
    return this.http.patch<UserResponse>(`${this.baseUrl}/${id}`, patch).pipe(map((res) => res.user));
  }
}
