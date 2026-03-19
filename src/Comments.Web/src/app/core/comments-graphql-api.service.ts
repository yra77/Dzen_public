import { Injectable, inject } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map, Observable } from 'rxjs';

import {
  CaptchaImageResponse,
  CommentNode,
  CreateCommentRequest,
  PagedCommentsResponse,
  RootCommentsSortDirection,
  RootCommentsSortField
} from './comments-api.service';

/** GraphQL-значення enum для сортування коментарів (HotChocolate naming convention). */
type GraphqlCommentSortField = 'CREATED_AT_UTC' | 'USER_NAME' | 'EMAIL';

/** GraphQL-значення enum для напряму сортування (HotChocolate naming convention). */
type GraphqlCommentSortDirection = 'ASC' | 'DESC';

interface RootCommentsQueryData {
  /** Пейджований список кореневих коментарів. */
  comments: PagedCommentsResponse | null;
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
 * Apollo GraphQL-клієнт для повного frontend-переходу з REST на GraphQL API.
 */
@Injectable({ providedIn: 'root' })
export class CommentsGraphqlApiService {
  /** Apollo клієнт з link/cache, зареєстрованими в app.config. */
  private readonly apollo = inject(Apollo);

  /** Отримує сторінку root-коментарів через GraphQL query. */
  getRootComments(
    page: number,
    pageSize: number,
    sortBy: RootCommentsSortField,
    sortDirection: RootCommentsSortDirection
  ): Observable<PagedCommentsResponse> {
    const graphqlSortBy = this.mapSortFieldToGraphql(sortBy);
    const graphqlSortDirection = this.mapSortDirectionToGraphql(sortDirection);

    return this.apollo
      .query<RootCommentsQueryData>({
        query: gql`
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
        `,
        variables: { page, pageSize, sortBy: graphqlSortBy, sortDirection: graphqlSortDirection },
        fetchPolicy: 'network-only'
      })
      .pipe(
        map(response => {
          const payload = response.data.comments;
          if (!payload) {
            throw new Error('GraphQL query comments returned empty payload.');
          }

          return {
            ...payload,
            // Нормалізуємо replies, щоб шаблони Angular не падали на `undefined.length`.
            items: payload.items.map(comment => this.normalizeCommentNode(comment))
          };
        })
      );
  }

  /** Отримує дерево гілки за id кореневого коментаря. */
  getThread(rootCommentId: string): Observable<CommentNode> {
    // GraphQL не підтримує truly-recursive selection set, тому задаємо фіксовану глибину дерева (5 рівнів).
    return this.apollo
      .query<ThreadQueryData>({
        query: gql`
          query GetCommentThread($rootCommentId: Uuid!) {
            commentThread(rootCommentId: $rootCommentId) {
              ...ThreadCommentLevel1
            }
          }

          fragment ThreadAttachment on CommentAttachmentDto {
            fileName
            contentType
            storagePath
            sizeBytes
          }

          fragment ThreadCommentLevel5 on CommentDto {
            id
            parentId
            userName
            email
            homePage
            text
            createdAtUtc
            attachment {
              ...ThreadAttachment
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
                ...ThreadAttachment
              }
              replies {
                id
              }
            }
          }

          fragment ThreadCommentLevel4 on CommentDto {
            id
            parentId
            userName
            email
            homePage
            text
            createdAtUtc
            attachment {
              ...ThreadAttachment
            }
            replies {
              ...ThreadCommentLevel5
            }
          }

          fragment ThreadCommentLevel3 on CommentDto {
            id
            parentId
            userName
            email
            homePage
            text
            createdAtUtc
            attachment {
              ...ThreadAttachment
            }
            replies {
              ...ThreadCommentLevel4
            }
          }

          fragment ThreadCommentLevel2 on CommentDto {
            id
            parentId
            userName
            email
            homePage
            text
            createdAtUtc
            attachment {
              ...ThreadAttachment
            }
            replies {
              ...ThreadCommentLevel3
            }
          }

          fragment ThreadCommentLevel1 on CommentDto {
            id
            parentId
            userName
            email
            homePage
            text
            createdAtUtc
            attachment {
              ...ThreadAttachment
            }
            replies {
              ...ThreadCommentLevel2
            }
          }
        `,
        variables: { rootCommentId },
        fetchPolicy: 'network-only'
      })
      .pipe(
        map(response => {
          if (!response.data.commentThread) {
            throw new Error('GraphQL query commentThread returned empty payload.');
          }

          return this.normalizeCommentNode(response.data.commentThread);
        })
      );
  }

  /** Створює новий коментар або відповідь через GraphQL mutation. */
  createComment(request: CreateCommentRequest): Observable<CommentNode> {
    return this.apollo
      .mutate<CreateCommentMutationData>({
        mutation: gql`
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
        `,
        variables: { input: request }
      })
      .pipe(
        map(response => {
          if (!response.data) {
            throw new Error('GraphQL mutation createComment returned empty payload.');
          }

          if (!response.data.createComment) {
            throw new Error('GraphQL mutation createComment returned empty comment node.');
          }

          return this.normalizeCommentNode(response.data.createComment);
        })
      );
  }

  /** Повертає санітизований HTML preview для введеного тексту через GraphQL. */
  previewComment(text: string): Observable<string> {
    return this.apollo
      .query<PreviewCommentQueryData>({
        query: gql`
          query PreviewComment($text: String!) {
            previewComment(text: $text)
          }
        `,
        variables: { text },
        fetchPolicy: 'no-cache'
      })
      .pipe(map(response => response.data.previewComment));
  }

  /** Завантажує captcha-зображення для форми створення коментаря/відповіді. */
  getCaptcha(): Observable<CaptchaImageResponse> {
    return this.apollo
      .query<CaptchaImageQueryData>({
        query: gql`
          query GetCaptchaImage {
            captchaImage {
              challengeId
              imageBase64
              mimeType
              ttlSeconds
            }
          }
        `,
        fetchPolicy: 'no-cache'
      })
      .pipe(map(response => response.data.captchaImage));
  }

  /** Завантажує txt-вміст вкладення через GraphQL query. */
  getAttachmentText(storagePath: string): Observable<string> {
    return this.apollo
      .query<AttachmentTextPreviewQueryData>({
        query: gql`
          query GetAttachmentTextPreview($storagePath: String!) {
            attachmentTextPreview(storagePath: $storagePath)
          }
        `,
        variables: { storagePath },
        fetchPolicy: 'no-cache'
      })
      .pipe(map(response => response.data.attachmentTextPreview));
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
  private normalizeCommentNode(comment: CommentNode): CommentNode {
    const replies = (comment.replies ?? []).map(reply => this.normalizeCommentNode(reply));
    return {
      ...comment,
      replies
    };
  }
}
