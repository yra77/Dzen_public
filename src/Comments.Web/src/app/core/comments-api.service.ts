import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface CommentAttachment {
  fileName: string;
  contentType: string;
  storagePath: string;
  sizeBytes: number;
}

export interface CommentNode {
  id: string;
  parentId: string | null;
  userName: string;
  email: string;
  homePage: string | null;
  text: string;
  createdAtUtc: string;
  attachment: CommentAttachment | null;
  replies: CommentNode[];
}

export interface PagedCommentsResponse {
  page: number;
  pageSize: number;
  totalCount: number;
  items: CommentNode[];
}

export interface CreateCommentAttachmentRequest {
  fileName: string;
  contentType: string;
  base64Content: string;
}

export interface CreateCommentRequest {
  userName: string;
  email: string;
  homePage: string | null;
  text: string;
  parentId: string | null;
  captchaToken: string | null;
  attachment: CreateCommentAttachmentRequest | null;
}

export interface CaptchaImageResponse {
  challengeId: string;
  imageBase64: string;
  mimeType: string;
  ttlSeconds: number;
}

@Injectable({ providedIn: 'root' })
export class CommentsApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl;

  getRootComments(): Observable<PagedCommentsResponse> {
    return this.httpClient.get<PagedCommentsResponse>(`${this.apiBaseUrl}/api/comments`);
  }

  getThread(rootCommentId: string): Observable<CommentNode> {
    return this.httpClient.get<CommentNode>(`${this.apiBaseUrl}/api/comments/${rootCommentId}/thread`);
  }

  getCaptcha(): Observable<CaptchaImageResponse> {
    return this.httpClient.get<CaptchaImageResponse>(`${this.apiBaseUrl}/api/captcha/image`);
  }

  createComment(request: CreateCommentRequest): Observable<CommentNode> {
    return this.httpClient.post<CommentNode>(`${this.apiBaseUrl}/api/comments`, request);
  }

  previewComment(text: string): Observable<string> {
    return this.httpClient.post(`${this.apiBaseUrl}/api/comments/preview`, { text }, { responseType: 'text' });
  }

  getAttachmentText(storagePath: string): Observable<string> {
    const normalizedPath = storagePath.startsWith('/') ? storagePath : `/${storagePath}`;
    return this.httpClient.get(`${this.apiBaseUrl}${normalizedPath}`, { responseType: 'text' });
  }
}
