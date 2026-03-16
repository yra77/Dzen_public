import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface CommentListItem {
  id: number;
  userName: string;
  text: string;
  createdAtUtc: string;
}

export interface PagedCommentsResponse {
  page: number;
  pageSize: number;
  totalCount: number;
  items: CommentListItem[];
}

@Injectable({ providedIn: 'root' })
export class CommentsApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl;

  getRootComments(): Observable<PagedCommentsResponse> {
    return this.httpClient.get<PagedCommentsResponse>(`${this.apiBaseUrl}/api/comments`);
  }
}
