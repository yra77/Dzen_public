import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { CommentNode, CreateCommentRequest, PagedCommentsResponse, RootCommentsSortDirection, RootCommentsSortField } from './comments-api.service';

interface GraphQlResponse<TData> {
  /** Дані успішної GraphQL-відповіді. */
  data?: TData;
  /** Масив GraphQL-помилок, якщо запит не був виконаний успішно. */
  errors?: ReadonlyArray<{ message: string }>;
}

interface RootCommentsQueryData {
  /** Пейджований список кореневих коментарів. */
  comments: PagedCommentsResponse;
}

interface ThreadQueryData {
  /** Повне дерево гілки для конкретного root-коментаря. */
  commentThread: CommentNode;
}

interface CreateCommentMutationData {
  /** Створений коментар після успішної мутації. */
  createComment: CommentNode;
}

interface PreviewCommentQueryData {
  /** Санітизований HTML-preview для введеного тексту. */
  previewComment: string;
}

/**
 * Базовий GraphQL-клієнт поверх HttpClient для поступового переходу фронтенда з REST на GraphQL.
 */
@Injectable({ providedIn: 'root' })
export class CommentsGraphqlApiService {
  /** HTTP-клієнт для POST-запитів до /graphql endpoint. */
  private readonly httpClient = inject(HttpClient);
  private readonly graphqlUrl = `${environment.apiBaseUrl}/graphql`;

  /**
   * Отримує сторінку root-коментарів через GraphQL query.
   */
  getRootComments(
    page: number,
    pageSize: number,
    sortBy: RootCommentsSortField,
    sortDirection: RootCommentsSortDirection
  ): Observable<PagedCommentsResponse> {
    const query = `
      query GetRootComments($page: Int!, $pageSize: Int!, $sortBy: CommentSortField!, $sortDirection: CommentSortDirection!) {
        comments(page: $page, pageSize: $pageSize, sortBy: $sortBy, sortDirection: $sortDirection) {
          page
          pageSize
          totalCount
          items {
            id
            parentId
            userName
            email
            homePage
            text
            createdAtUtc
            attachment {
              fileName
              contentType
              storagePath
              sizeBytes
            }
            replies {
              id
            }
          }
        }
      }
    `;

    return this.execute<RootCommentsQueryData>(query, { page, pageSize, sortBy, sortDirection }).pipe(
      map(response => response.comments)
    );
  }

  /**
   * Отримує дерево гілки за id кореневого коментаря.
   */
  getThread(rootCommentId: string): Observable<CommentNode> {
    const query = `
      query GetCommentThread($rootCommentId: UUID!) {
        commentThread(rootCommentId: $rootCommentId) {
          id
          parentId
          userName
          email
          homePage
          text
          createdAtUtc
          attachment {
            fileName
            contentType
            storagePath
            sizeBytes
          }
          replies {
            id
            parentId
            userName
            email
            homePage
            text
            createdAtUtc
            attachment {
              fileName
              contentType
              storagePath
              sizeBytes
            }
            replies {
              id
            }
          }
        }
      }
    `;

    return this.execute<ThreadQueryData>(query, { rootCommentId }).pipe(map(response => response.commentThread));
  }

  /**
   * Створює новий коментар або відповідь через GraphQL mutation.
   */
  createComment(request: CreateCommentRequest): Observable<CommentNode> {
    const mutation = `
      mutation CreateComment($input: CreateCommentInput!) {
        createComment(input: $input) {
          id
          parentId
          userName
          email
          homePage
          text
          createdAtUtc
          attachment {
            fileName
            contentType
            storagePath
            sizeBytes
          }
          replies {
            id
          }
        }
      }
    `;

    return this.execute<CreateCommentMutationData>(mutation, { input: request }).pipe(
      map(response => response.createComment)
    );
  }

  /**
   * Повертає санітизований HTML preview для введеного тексту через GraphQL.
   */
  previewComment(text: string): Observable<string> {
    const query = `
      query PreviewComment($text: String!) {
        previewComment(text: $text)
      }
    `;

    return this.execute<PreviewCommentQueryData>(query, { text }).pipe(
      map(response => response.previewComment)
    );
  }

  /**
   * Виконує GraphQL-запит і перетворює транспортні помилки у виняток з людиночитаним повідомленням.
   */
  private execute<TData>(query: string, variables: Record<string, unknown>): Observable<TData> {
    return this.httpClient.post<GraphQlResponse<TData>>(this.graphqlUrl, { query, variables }).pipe(
      map(response => {
        if (response.errors && response.errors.length > 0) {
          throw new Error(response.errors.map(error => error.message).join('; '));
        }

        if (!response.data) {
          throw new Error('GraphQL response does not contain data payload.');
        }

        return response.data;
      })
    );
  }
}
