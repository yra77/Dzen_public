import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import {
  CaptchaImageResponse,
  CommentNode,
  CreateCommentRequest,
  PagedCommentsResponse,
  RootCommentsSortDirection,
  RootCommentsSortField
} from './comments.models';
import { environment } from '../../environments/environment';
import {
  CREATE_COMMENT_MUTATION,
  GET_ATTACHMENT_TEXT_PREVIEW_QUERY,
  GET_CAPTCHA_IMAGE_QUERY,
  GET_COMMENT_THREAD_QUERY,
  GET_ROOT_COMMENTS_QUERY,
  GET_SEARCH_COMMENTS_QUERY,
  PREVIEW_COMMENT_QUERY
} from './comments-graphql-documents';

/** GraphQL-значення enum для сортування коментарів (HotChocolate naming convention). */
type GraphqlCommentSortField = 'CREATED_AT_UTC' | 'USER_NAME' | 'EMAIL';

/** GraphQL-значення enum для напряму сортування (HotChocolate naming convention). */
type GraphqlCommentSortDirection = 'ASC' | 'DESC';

interface RootCommentsQueryData {
  /** Пейджований список кореневих коментарів. */
  comments: PagedCommentsResponse | null;
}

interface SearchCommentsQueryData {
  /** Пейджований список знайдених коментарів. */
  searchComments: PagedCommentsResponse | null;
}

interface ThreadQueryData {
  /** Повне дерево гілки для конкретного root-коментаря. */
  commentThread: CommentNode | null;
}

interface CreateCommentMutationData {
  /** Створений коментар після успішної мутації. */
  createComment: CommentNode | null;
}

interface PreviewCommentQueryData {
  /** Санітизований HTML-preview для введеного тексту. */
  previewComment: string;
}

interface CaptchaImageQueryData {
  /** Дані captcha-зображення для формування captchaToken. */
  captchaImage: CaptchaImageResponse;
}

interface AttachmentTextPreviewQueryData {
  /** Текстовий preview txt-вкладення. */
  attachmentTextPreview: string;
}

/**
 * GraphQL-клієнт frontend-рівня для запитів коментарів, thread і допоміжних сценаріїв (captcha/preview).
 */
@Injectable({ providedIn: 'root' })
export class CommentsGraphqlApiService {
  /** HTTP-клієнт для GraphQL POST-запитів до backend endpoint. */
  private readonly httpClient = inject(HttpClient);
  private readonly graphqlEndpoint = `${environment.apiBaseUrl}/graphql`;

  /** Отримує сторінку root-коментарів через GraphQL query. */
  getRootComments(
    page: number,
    pageSize: number,
    sortBy: RootCommentsSortField,
    sortDirection: RootCommentsSortDirection
  ): Observable<PagedCommentsResponse> {
    const graphqlSortBy = this.mapSortFieldToGraphql(sortBy);
    const graphqlSortDirection = this.mapSortDirectionToGraphql(sortDirection);

    return this.executeGraphql<RootCommentsQueryData>(GET_ROOT_COMMENTS_QUERY, {
      page,
      pageSize,
      sortBy: graphqlSortBy,
      sortDirection: graphqlSortDirection
    }).pipe(
      map(response => {
        const payload = response.comments;
        if (!payload) {
          throw new Error('GraphQL query comments returned empty payload.');
        }

        return {
          ...payload,
          items: payload.items
            .map(comment => this.normalizeCommentNode(comment, { includeReplies: true }))
            .filter((comment): comment is CommentNode => comment !== null)
        };
      })
    );
  }

  /** Отримує дерево гілки за id кореневого коментаря. */
  getThread(rootCommentId: string): Observable<CommentNode> {
    // GraphQL не підтримує truly-recursive selection set, тому використовуємо query з фіксованою глибиною дерева.
    return this.executeGraphql<ThreadQueryData>(GET_COMMENT_THREAD_QUERY, { rootCommentId }).pipe(
      map(response => {
        if (!response.commentThread) {
          throw new Error('GraphQL query commentThread returned empty payload.');
        }

        const normalizedThread = this.normalizeCommentNode(response.commentThread, { includeReplies: true });
        if (!normalizedThread) {
          throw new Error('GraphQL query commentThread returned null root comment.');
        }

        return normalizedThread;
      })
    );
  }

  /** Виконує повнотекстовий пошук коментарів із пагінацією через GraphQL query. */
  searchComments(query: string, page: number, pageSize: number): Observable<PagedCommentsResponse> {
    return this.executeGraphql<SearchCommentsQueryData>(GET_SEARCH_COMMENTS_QUERY, { query, page, pageSize }).pipe(
      map(response => {
        const payload = response.searchComments;
        if (!payload) {
          throw new Error('GraphQL query searchComments returned empty payload.');
        }

        return {
          ...payload,
          items: payload.items
            .map(comment => this.normalizeCommentNode(comment, { includeReplies: true }))
            .filter((comment): comment is CommentNode => comment !== null)
        };
      })
    );
  }

  /** Створює новий коментар або відповідь через GraphQL mutation. */
  createComment(request: CreateCommentRequest): Observable<CommentNode> {
    return this.executeGraphql<CreateCommentMutationData>(CREATE_COMMENT_MUTATION, { input: request }).pipe(
      map(response => {
        if (!response.createComment) {
          throw new Error('GraphQL mutation createComment returned empty comment node.');
        }

        const normalizedComment = this.normalizeCommentNode(response.createComment, { includeReplies: false });
        if (!normalizedComment) {
          throw new Error('GraphQL mutation createComment returned null comment node.');
        }

        return normalizedComment;
      })
    );
  }

  /** Повертає санітизований HTML preview для введеного тексту через GraphQL. */
  previewComment(text: string): Observable<string> {
    return this.executeGraphql<PreviewCommentQueryData>(PREVIEW_COMMENT_QUERY, { text }).pipe(
      map(response => response.previewComment)
    );
  }

  /** Завантажує captcha-зображення для форми створення коментаря/відповіді. */
  getCaptcha(): Observable<CaptchaImageResponse> {
    return this.executeGraphql<CaptchaImageQueryData>(GET_CAPTCHA_IMAGE_QUERY, {}).pipe(
      map(response => response.captchaImage)
    );
  }

  /** Завантажує txt-вміст вкладення через GraphQL query. */
  getAttachmentText(storagePath: string): Observable<string> {
    return this.executeGraphql<AttachmentTextPreviewQueryData>(GET_ATTACHMENT_TEXT_PREVIEW_QUERY, { storagePath }).pipe(
      map(response => response.attachmentTextPreview)
    );
  }

  /**
   * Виконує типовий POST-запит до GraphQL endpoint і піднімає змістовну помилку для `errors`.
   */
  private executeGraphql<TData>(query: string, variables: Record<string, unknown>): Observable<TData> {
    return this.httpClient.post<GraphqlResponse<TData>>(this.graphqlEndpoint, { query, variables }).pipe(
      map(response => {
        if (response.errors && response.errors.length > 0) {
          throw new Error(response.errors.map(error => error.message).join('; '));
        }

        if (!response.data) {
          throw new Error('GraphQL response did not include data payload.');
        }

        return response.data;
      })
    );
  }

  /**
   * Мапить frontend enum поля сортування до GraphQL enum (SCREAMING_SNAKE_CASE).
   */
  private mapSortFieldToGraphql(sortBy: RootCommentsSortField): GraphqlCommentSortField {
    const mapping: Record<RootCommentsSortField, GraphqlCommentSortField> = {
      CreatedAtUtc: 'CREATED_AT_UTC',
      UserName: 'USER_NAME',
      Email: 'EMAIL'
    };

    return mapping[sortBy];
  }

  /**
   * Мапить frontend enum напряму сортування до GraphQL enum (SCREAMING_SNAKE_CASE).
   */
  private mapSortDirectionToGraphql(sortDirection: RootCommentsSortDirection): GraphqlCommentSortDirection {
    const mapping: Record<RootCommentsSortDirection, GraphqlCommentSortDirection> = {
      Asc: 'ASC',
      Desc: 'DESC'
    };

    return mapping[sortDirection];
  }

  /**
   * Гарантує, що в кожному вузлі дерева `replies` завжди масив, а не `undefined/null`.
   */
  private normalizeCommentNode(
    comment: CommentNode | null | undefined,
    options: { includeReplies: boolean }
  ): CommentNode | null {
    if (!comment) {
      return null;
    }

    const replies = options.includeReplies
      ? (comment.replies ?? [])
          .map(reply => this.normalizeCommentNode(reply, options))
          .filter((reply): reply is CommentNode => reply !== null)
      : [];

    return {
      ...comment,
      replies
    };
  }
}

interface GraphqlResponse<TData> {
  data?: TData;
  errors?: Array<{ message: string }>;
}
