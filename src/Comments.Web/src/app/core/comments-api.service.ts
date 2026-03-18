import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface CommentAttachment {
  /** Оригінальна назва вкладення, яку ввів користувач. */
  fileName: string;
  /** MIME-тип файлу, дозволений серверною валідацією. */
  contentType: string;
  /** Шлях до збереженого файла на бекенді. */
  storagePath: string;
  /** Розмір вкладення у байтах. */
  sizeBytes: number;
}

export interface CommentNode {
  /** Унікальний ідентифікатор коментаря. */
  id: string;
  /** Посилання на батьківський коментар, null для root-вузла. */
  parentId: string | null;
  /** Ім'я автора. */
  userName: string;
  /** Email автора (для валідації/адмін-дій). */
  email: string;
  /** Домашня сторінка автора, якщо її було вказано. */
  homePage: string | null;
  /** Санітизований текст коментаря. */
  text: string;
  /** UTC-дата створення коментаря. */
  createdAtUtc: string;
  /** Додане вкладення (за наявності). */
  attachment: CommentAttachment | null;
  /** Дочірні відповіді у вигляді дерева. */
  replies: CommentNode[];
}

export interface PagedCommentsResponse {
  /** Номер запитаної сторінки. */
  page: number;
  /** Кількість елементів на сторінці. */
  pageSize: number;
  /** Загальна кількість root-коментарів. */
  totalCount: number;
  /** Поточна порція коментарів. */
  items: CommentNode[];
}

/** Доступні поля сортування root-коментарів у REST API. */
export type RootCommentsSortField = 'CreatedAtUtc' | 'UserName' | 'Email';

/** Доступні напрямки сортування root-коментарів у REST API. */
export type RootCommentsSortDirection = 'Asc' | 'Desc';

export interface CreateCommentAttachmentRequest {
  /** Ім'я файлу, що буде відображено в UI. */
  fileName: string;
  /** MIME-тип файлу для серверної перевірки. */
  contentType: string;
  /** Вміст файлу у Base64 без data-url префікса. */
  base64Content: string;
}

export interface CreateCommentRequest {
  /** Ім'я автора коментаря. */
  userName: string;
  /** Email автора. */
  email: string;
  /** Необов'язковий URL домашньої сторінки. */
  homePage: string | null;
  /** Текст нового коментаря/відповіді. */
  text: string;
  /** Батьківський id: null для root, id коментаря для reply. */
  parentId: string | null;
  /** CAPTCHA токен у форматі challengeId:answer. */
  captchaToken: string | null;
  /** Необов'язкове вкладення. */
  attachment: CreateCommentAttachmentRequest | null;
}

export interface CaptchaImageResponse {
  /** Ідентифікатор captcha-челенджу. */
  challengeId: string;
  /** Зображення captcha у Base64. */
  imageBase64: string;
  /** MIME-тип зображення captcha. */
  mimeType: string;
  /** Час життя captcha у секундах. */
  ttlSeconds: number;
}

@Injectable({ providedIn: 'root' })
export class CommentsApiService {
  /** HTTP-клієнт для взаємодії з REST API. */
  private readonly httpClient = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl;

  /** Отримує сторінку root-коментарів з урахуванням пагінації та сортування. */
  getRootComments(
    page: number,
    pageSize: number,
    sortBy: RootCommentsSortField,
    sortDirection: RootCommentsSortDirection
  ): Observable<PagedCommentsResponse> {
    return this.httpClient.get<PagedCommentsResponse>(`${this.apiBaseUrl}/api/comments`, {
      params: {
        page,
        pageSize,
        sortBy,
        sortDirection
      }
    });
  }

  /** Отримує повне дерево гілки для root-коментаря. */
  getThread(rootCommentId: string): Observable<CommentNode> {
    return this.httpClient.get<CommentNode>(`${this.apiBaseUrl}/api/comments/${rootCommentId}/thread`);
  }

  /** Завантажує captcha-зображення для наступного submit. */
  getCaptcha(): Observable<CaptchaImageResponse> {
    return this.httpClient.get<CaptchaImageResponse>(`${this.apiBaseUrl}/api/captcha/image`);
  }

  /** Створює новий коментар або відповідь. */
  createComment(request: CreateCommentRequest): Observable<CommentNode> {
    return this.httpClient.post<CommentNode>(`${this.apiBaseUrl}/api/comments`, request);
  }

  /** Повертає санітизований HTML preview для введеного тексту. */
  previewComment(text: string): Observable<string> {
    return this.httpClient.post(`${this.apiBaseUrl}/api/comments/preview`, { text }, { responseType: 'text' });
  }

  /** Завантажує текстовий вміст txt-вкладення для inline preview. */
  getAttachmentText(storagePath: string): Observable<string> {
    const normalizedPath = storagePath.startsWith('/') ? storagePath : `/${storagePath}`;
    return this.httpClient.get(`${this.apiBaseUrl}${normalizedPath}`, { responseType: 'text' });
  }
}
