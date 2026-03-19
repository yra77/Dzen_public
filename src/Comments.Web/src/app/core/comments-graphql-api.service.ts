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
        variables: { page, pageSize, sortBy, sortDirection },
        fetchPolicy: 'network-only'
      })
      .pipe(map(response => response.data.comments));
  }

  /** Отримує дерево гілки за id кореневого коментаря. */
  getThread(rootCommentId: string): Observable<CommentNode> {
    return this.apollo
      .query<ThreadQueryData>({
        query: gql`
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
        `,
        variables: { rootCommentId },
        fetchPolicy: 'network-only'
      })
      .pipe(map(response => response.data.commentThread));
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

          return response.data.createComment;
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
}
