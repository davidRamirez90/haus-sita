import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Category } from './category.model';

interface CategoryListResponse {
  categories: Category[];
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly baseUrl = '/api/categories';

  constructor(private readonly http: HttpClient) {}

  list(): Observable<Category[]> {
    return this.http.get<CategoryListResponse>(this.baseUrl).pipe(map((res) => res.categories ?? []));
  }
}
