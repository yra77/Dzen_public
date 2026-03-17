import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

import {
  CommentNode,
  CommentsApiService,
  CreateCommentAttachmentRequest
} from '../../core/comments-api.service';
import { environment } from '../../../environments/environment';
import { ApiErrorPresenterService, UiValidationError } from '../../core/api-error-presenter.service';

@Component({
  selector: 'app-thread-page',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, NgTemplateOutlet],
  template: `
    <section class="panel">
      <h2>Гілка коментаря</h2>
      <a routerLink="/" data-testid="thread-back-link">← Назад до списку</a>
      @if (signalRStatusMessage) {
        <p class="meta">{{ signalRStatusMessage }}</p>
      }

      @if (isLoading) {
        <p>Завантаження гілки...</p>
      } @else if (errorMessage) {
        <p class="error">{{ errorMessage }}</p>
        @if (loadCanRetry) {
          <p class="meta">Спробуйте оновити гілку повторно через кілька секунд.</p>
        }
      } @else if (thread) {
        <div class="thread-node">
          <p class="meta"><strong>{{ thread.userName }}</strong> · {{ thread.createdAtUtc | date: 'short' }}</p>
          <p>{{ thread.text }}</p>
          @if (thread.attachment) {
            <div class="attachment-inline">
              @if (thread.attachment.contentType.startsWith('image/')) {
                <a [href]="getAttachmentUrl(thread.attachment.storagePath)" target="_blank" rel="noreferrer">
                  <img
                    class="attachment-thumb"
                    [src]="getAttachmentUrl(thread.attachment.storagePath)"
                    [alt]="thread.attachment.fileName"
                  />
                </a>
              } @else if (thread.attachment.contentType === 'text/plain') {
                <button
                  type="button"
                  (click)="loadTextAttachment(thread.attachment.storagePath)"
                  [disabled]="attachmentTextLoadingByPath.has(thread.attachment.storagePath)"
                >
                  Показати txt preview
                </button>
                @if (attachmentTextLoadingByPath.has(thread.attachment.storagePath)) {
                  <p class="meta">Завантаження txt preview...</p>
                }
                @if (attachmentTextPreviewByPath[thread.attachment.storagePath]) {
                  <pre class="attachment-text">{{ attachmentTextPreviewByPath[thread.attachment.storagePath] }}</pre>
                }
              }
              <p class="attachment-meta">📎 <a [href]="getAttachmentUrl(thread.attachment.storagePath)" target="_blank" rel="noreferrer">{{ thread.attachment.fileName }}</a> ({{ thread.attachment.contentType }})</p>
            </div>
          }
          <div class="thread-actions">
            <button type="button" (click)="openReplyModal(thread)">Відповісти</button>
          </div>
        </div>

        <h3>Відповіді</h3>
        @if (thread.replies.length === 0) {
          <p>Ще немає відповідей.</p>
        } @else {
          <ng-container *ngTemplateOutlet="replyTree; context: { $implicit: thread.replies }"></ng-container>
        }

        <ng-template #replyTree let-replies>
          <ul class="tree">
            @for (reply of replies; track reply.id) {
              <li>
                <article class="thread-node">
                  <p class="meta"><strong>{{ reply.userName }}</strong> · {{ reply.createdAtUtc | date: 'short' }}</p>
                  <p>{{ reply.text }}</p>
                  @if (reply.attachment) {
                    <div class="attachment-inline">
                      @if (reply.attachment.contentType.startsWith('image/')) {
                        <a [href]="getAttachmentUrl(reply.attachment.storagePath)" target="_blank" rel="noreferrer">
                          <img
                            class="attachment-thumb"
                            [src]="getAttachmentUrl(reply.attachment.storagePath)"
                            [alt]="reply.attachment.fileName"
                          />
                        </a>
                      } @else if (reply.attachment.contentType === 'text/plain') {
                        <button
                          type="button"
                          (click)="loadTextAttachment(reply.attachment.storagePath)"
                          [disabled]="attachmentTextLoadingByPath.has(reply.attachment.storagePath)"
                        >
                          Показати txt preview
                        </button>
                        @if (attachmentTextLoadingByPath.has(reply.attachment.storagePath)) {
                          <p class="meta">Завантаження txt preview...</p>
                        }
                        @if (attachmentTextPreviewByPath[reply.attachment.storagePath]) {
                          <pre class="attachment-text">{{ attachmentTextPreviewByPath[reply.attachment.storagePath] }}</pre>
                        }
                      }
                      <p class="attachment-meta">📎 <a [href]="getAttachmentUrl(reply.attachment.storagePath)" target="_blank" rel="noreferrer">{{ reply.attachment.fileName }}</a> ({{ reply.attachment.contentType }})</p>
                    </div>
                  }
                  <div class="thread-actions">
                    <button type="button" (click)="openReplyModal(reply)">Відповісти</button>
                  </div>
                </article>

                @if (reply.replies.length > 0) {
                  <ng-container *ngTemplateOutlet="replyTree; context: { $implicit: reply.replies }"></ng-container>
                }
              </li>
            }
          </ul>
        </ng-template>

        @if (isReplyModalOpen && activeReplyTarget) {
          <div class="reply-modal-backdrop" (click)="closeReplyModal()">
            <div class="reply-modal" (click)="$event.stopPropagation()">
              <h3>Нова відповідь</h3>
              <p class="meta">Відповідь на: <strong>{{ activeReplyTarget.userName }}</strong> · #{{ activeReplyTarget.id }}</p>

              <form class="form-grid" [formGroup]="replyForm" (ngSubmit)="submitReply()" data-testid="thread-reply-form">
                <label>
                  Ім'я
                  <input type="text" formControlName="userName" data-testid="thread-user-name-input" />
                </label>

                <label>
                  Email
                  <input type="email" formControlName="email" data-testid="thread-email-input" />
                </label>

                <label class="wide">
                  Текст
                  <textarea #threadTextArea rows="5" formControlName="text" (input)="previewText()" data-testid="thread-text-input"></textarea>
                </label>

                <div class="wide text-toolbar" role="group" aria-label="Швидкі теги форматування" data-testid="thread-quick-tags">
                  <span class="text-toolbar-label">Швидкі теги:</span>
                  <button type="button" (click)="insertQuickTag('i', threadTextArea)">[i]</button>
                  <button type="button" (click)="insertQuickTag('strong', threadTextArea)">[strong]</button>
                  <button type="button" (click)="insertQuickTag('code', threadTextArea)">[code]</button>
                  <button type="button" (click)="insertQuickTag('a', threadTextArea)">[a]</button>
                </div>

                @if (textPreviewHtml) {
                  <div class="text-preview" data-testid="thread-preview-container">
                    <div class="text-preview-title">Preview повідомлення</div>
                    <div [innerHTML]="textPreviewHtml"></div>
                  </div>
                }

                @if (previewMessage) {
                  <p class="meta">{{ previewMessage }}</p>
                }

                <label class="wide">
                  Вкладення (png/jpg/gif/txt, до 1MB)
                  <input type="file" (change)="onAttachmentSelected($event)" accept=".txt,image/png,image/jpeg,image/gif,text/plain" data-testid="thread-attachment-input" />
                </label>
                @if (attachmentMessage) {
                  <p class="meta">{{ attachmentMessage }}</p>
                }
                @if (attachmentImagePreviewDataUrl) {
                  <figure class="attachment-selection-preview" data-testid="thread-selected-image-preview">
                    <img [src]="attachmentImagePreviewDataUrl" alt="Preview вибраного зображення" class="attachment-thumb" />
                    <figcaption class="meta">Preview вибраного зображення</figcaption>
                  </figure>
                }

                @if (captchaImageDataUrl) {
                  <img [src]="captchaImageDataUrl" alt="Captcha" class="captcha" data-testid="thread-captcha-image" />
                }

                @if (captchaMessage) {
                  <p class="error">{{ captchaMessage }}</p>
                }

                <label>
                  CAPTCHA (сума чисел)
                  <input type="text" formControlName="captchaAnswer" data-testid="thread-captcha-answer-input" />
                </label>

                <div class="actions wide">
                  <button type="button" (click)="reloadCaptcha()" data-testid="thread-captcha-reload-button">Оновити CAPTCHA</button>
                  <button type="button" (click)="closeReplyModal()">Закрити</button>
                  <button type="submit" [disabled]="replyForm.invalid || isSubmitting" data-testid="thread-submit-button">Створити коментар</button>
                </div>

                @if (submitMessage) {
                  <p data-testid="thread-submit-message">{{ submitMessage }}</p>
                  @if (showRetryHint) {
                    <p class="meta">Можна повторити запит без зміни даних форми.</p>
                  }
                  @if (submitValidationErrors.length > 0) {
                    <ul class="error-list">
                      @for (validationError of submitValidationErrors; track validationError.field) {
                        <li><strong>{{ validationError.field }}</strong>: {{ validationError.messages.join('; ') }}</li>
                      }
                    </ul>
                  }
                }
              </form>
            </div>
          </div>
        }
      }
    </section>
  `,
  styles: [
    `
      .error { color: #b42318; }
      .meta, .attachment-meta { color: #475467; }
      .attachment-inline { margin-top: 8px; }
      .attachment-thumb { max-width: 260px; max-height: 180px; border: 1px solid #d0d7de; border-radius: 8px; }
      .attachment-text { white-space: pre-wrap; background: #f8fafc; border: 1px solid #d9e0ec; border-radius: 8px; padding: 8px; }
      .attachment-selection-preview { margin: 0; }
      .thread-node { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; margin-top: 10px; background: #fcfcfd; }
      .thread-actions { margin-top: 8px; display: flex; justify-content: flex-end; }
      .tree { list-style: none; margin: 0; padding-left: 14px; }
      .captcha { width: 160px; height: 60px; border: 1px solid #d9e0ec; border-radius: 6px; }
      .reply-modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
      .reply-modal { width: min(760px, 100%); max-height: 92vh; overflow-y: auto; background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.25); }
      .text-preview { border: 1px dashed #d0d5dd; border-radius: 8px; padding: 8px; background: #f8fafc; }
      .text-preview-title { color: #344054; font-size: 14px; margin-bottom: 6px; font-weight: 600; }
      .text-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .text-toolbar-label { color: #344054; font-size: 14px; }
      .error-list { color: #b42318; margin: 6px 0 0; }
      @media (max-width: 900px) { .actions { flex-direction: column; } }
    `
  ]
})
/**
 * Сторінка перегляду однієї гілки коментарів та додавання відповіді.
 */
export class ThreadPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly commentsApi = inject(CommentsApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly apiErrorPresenter = inject(ApiErrorPresenterService);

  private signalRConnection: HubConnection | null = null;

  thread: CommentNode | null = null;
  isLoading = true;
  isSubmitting = false;
  errorMessage = '';
  /** Прапорець для показу підказки щодо повторної спроби завантаження. */
  loadCanRetry = false;
  submitMessage = '';
  submitValidationErrors: ReadonlyArray<UiValidationError> = [];
  showRetryHint = false;
  captchaChallengeId = '';
  captchaImageDataUrl = '';
  /** Повідомлення про помилку завантаження CAPTCHA. */
  captchaMessage = '';
  textPreviewHtml = '';
  /** Повідомлення про fallback-стан, коли preview тимчасово недоступний. */
  previewMessage = '';
  /** Поточний статус realtime-з'єднання SignalR. */
  signalRStatusMessage = '';
  /** Поточний коментар, на який користувач відповідає у модальному вікні. */
  activeReplyTarget: CommentNode | null = null;
  /** Прапорець видимості модального вікна створення відповіді. */
  isReplyModalOpen = false;
  attachmentMessage = '';
  attachment: CreateCommentAttachmentRequest | null = null;
  /** Data URL для preview вибраного зображення перед submit. */
  attachmentImagePreviewDataUrl = '';
  attachmentTextPreviewByPath: Record<string, string> = {};
  attachmentTextLoadingByPath = new Set<string>();

  readonly replyForm = this.formBuilder.nonNullable.group({
    userName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    text: ['', [Validators.required, Validators.maxLength(5000)]],
    captchaAnswer: ['', [Validators.required]]
  });

  /**
   * Ініціалізує стан сторінки та realtime-підписку.
   */
  ngOnInit(): void {
    this.loadThread();
    this.reloadCaptcha();
    this.initializeSignalR();
  }

  /**
   * Коректно завершує SignalR-з'єднання при знищенні компонента.
   */
  ngOnDestroy(): void {
    if (this.signalRConnection) {
      void this.signalRConnection.stop();
    }
  }

  /**
   * Оновлює HTML preview для тексту відповіді.
   */
  previewText(): void {
    const text = this.replyForm.controls.text.value;
    if (!text || !text.trim()) {
      this.textPreviewHtml = '';
      this.previewMessage = '';
      return;
    }

    this.commentsApi.previewComment(text).subscribe({
      next: (preview) => {
        this.textPreviewHtml = preview;
        this.previewMessage = '';
      },
      error: () => {
        this.textPreviewHtml = '';
        this.previewMessage = 'Preview тимчасово недоступний. Ви можете продовжити відправку відповіді без preview.';
      }
    });
  }

  /**
   * Валідовує і читає вкладення відповіді у base64-представлення.
   */
  onAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.attachment = null;
    this.attachmentMessage = '';
    this.attachmentImagePreviewDataUrl = '';

    if (!file) {
      return;
    }

    if (file.size > 1_000_000) {
      this.attachmentMessage = 'Файл перевищує 1MB.';
      input.value = '';
      return;
    }

    const allowedContentTypes = ['image/png', 'image/jpeg', 'image/gif', 'text/plain'];
    if (!allowedContentTypes.includes(file.type)) {
      this.attachmentMessage = 'Недозволений тип вкладення.';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        this.attachmentMessage = 'Не вдалося прочитати файл.';
        return;
      }

      const base64Content = result.includes(',') ? result.split(',')[1] : result;
      this.attachment = {
        fileName: file.name,
        contentType: file.type,
        base64Content
      };
      this.attachmentImagePreviewDataUrl = file.type.startsWith('image/') ? result : '';
      this.attachmentMessage = `Вкладення готове: ${file.name}`;
    };
    reader.readAsDataURL(file);
  }



  /**
   * Додає HTML-тег у текстове поле з урахуванням поточного виділення користувача.
   */
  insertQuickTag(tag: 'i' | 'strong' | 'code' | 'a', textarea: HTMLTextAreaElement): void {
    const selectionStart = textarea.selectionStart ?? 0;
    const selectionEnd = textarea.selectionEnd ?? selectionStart;
    const selectedText = textarea.value.slice(selectionStart, selectionEnd);

    const openTag = `<${tag}>`;
    const closeTag = `</${tag}>`;
    let replacement = `${openTag}${selectedText}${closeTag}`;
    let caretPosition = selectionStart + openTag.length;

    if (tag === 'a') {
      const hasSelection = selectedText.trim().length > 0;
      const linkText = hasSelection ? selectedText : 'посилання';
      replacement = `<a href="https://example.com">${linkText}</a>`;
      caretPosition = hasSelection
        ? selectionStart + replacement.length
        : selectionStart + '<a href="'.length;
    } else if (selectedText.length > 0) {
      caretPosition = selectionStart + replacement.length;
    }

    const updatedText = `${textarea.value.slice(0, selectionStart)}${replacement}${textarea.value.slice(selectionEnd)}`;
    this.replyForm.controls.text.setValue(updatedText);
    textarea.focus();
    textarea.setSelectionRange(caretPosition, caretPosition);
    this.previewText();
  }

  /**
   * Перезавантажує CAPTCHA для форми відповіді.
   */
  reloadCaptcha(): void {
    this.captchaMessage = '';

    this.commentsApi.getCaptcha().subscribe({
      next: (response) => {
        this.captchaChallengeId = response.challengeId;
        this.captchaImageDataUrl = `data:${response.mimeType};base64,${response.imageBase64}`;
        this.captchaMessage = '';
      },
      error: (error) => {
        const uiError = this.apiErrorPresenter.present(error, 'Не вдалося завантажити CAPTCHA.');
        this.captchaMessage = uiError.summary;
      }
    });
  }

  /**
   * Надсилає нову відповідь у поточну гілку.
   */
  submitReply(): void {
    if (!this.activeReplyTarget || this.replyForm.invalid || !this.captchaChallengeId) {
      return;
    }

    this.isSubmitting = true;
    this.submitMessage = '';
    this.submitValidationErrors = [];
    this.showRetryHint = false;

    const raw = this.replyForm.getRawValue();

    this.commentsApi
      .createComment({
        userName: raw.userName,
        email: raw.email,
        homePage: null,
        text: raw.text,
        parentId: this.activeReplyTarget.id,
        captchaToken: `${this.captchaChallengeId}:${raw.captchaAnswer}`,
        attachment: this.attachment
      })
      .subscribe({
        next: () => {
          this.submitMessage = 'Відповідь додано.';
          this.replyForm.reset({ userName: raw.userName, email: raw.email, text: '', captchaAnswer: '' });
          this.textPreviewHtml = '';
          this.previewMessage = '';
          this.attachment = null;
          this.attachmentMessage = '';
          this.attachmentImagePreviewDataUrl = '';
          this.closeReplyModal();
          this.loadThread();
          this.reloadCaptcha();
          this.isSubmitting = false;
        },
        error: (error) => {
          const uiError = this.apiErrorPresenter.present(error, 'Не вдалося надіслати відповідь. Перевірте дані форми.');
          this.submitMessage = uiError.summary;
          this.submitValidationErrors = uiError.validationErrors;
          this.showRetryHint = uiError.canRetry;
          this.reloadCaptcha();
          this.isSubmitting = false;
        }
      });
  }

  /**
   * Відкриває модальне вікно створення відповіді для вибраного коментаря.
   */
  openReplyModal(comment: CommentNode): void {
    this.activeReplyTarget = comment;
    this.isReplyModalOpen = true;
    this.submitMessage = '';
    this.submitValidationErrors = [];
    this.showRetryHint = false;
    this.reloadCaptcha();
  }

  /**
   * Закриває модальне вікно відповіді та очищає тимчасові стани форми.
   */
  closeReplyModal(): void {
    this.isReplyModalOpen = false;
    this.activeReplyTarget = null;
    this.replyForm.controls.text.reset('');
    this.replyForm.controls.captchaAnswer.reset('');
    this.textPreviewHtml = '';
    this.previewMessage = '';
    this.attachment = null;
    this.attachmentMessage = '';
    this.attachmentImagePreviewDataUrl = '';
  }

  /**
   * Формує абсолютне посилання на файл вкладення.
   */
  getAttachmentUrl(storagePath: string): string {
    const normalizedPath = storagePath.startsWith('/') ? storagePath : `/${storagePath}`;
    return `${environment.apiBaseUrl}${normalizedPath}`;
  }

  /**
   * Підвантажує вміст txt-вкладення для inline preview.
   */
  loadTextAttachment(storagePath: string): void {
    if (this.attachmentTextPreviewByPath[storagePath] || this.attachmentTextLoadingByPath.has(storagePath)) {
      return;
    }

    this.attachmentTextLoadingByPath.add(storagePath);
    this.commentsApi.getAttachmentText(storagePath).subscribe({
      next: (content) => {
        this.attachmentTextPreviewByPath[storagePath] = content;
        this.attachmentTextLoadingByPath.delete(storagePath);
      },
      error: () => {
        this.attachmentTextPreviewByPath[storagePath] = 'Не вдалося завантажити txt-preview.';
        this.attachmentTextLoadingByPath.delete(storagePath);
      }
    });
  }

  /**
   * Ініціалізує SignalR-підписку на створення нових коментарів.
   */
  private initializeSignalR(): void {
    this.signalRConnection = new HubConnectionBuilder()
      .withUrl(`${environment.apiBaseUrl}/hubs/comments`)
      .withAutomaticReconnect()
      .build();

    this.signalRConnection.on('commentCreated', () => {
      this.loadThread();
    });

    this.signalRConnection.onreconnecting(() => {
      this.signalRStatusMessage = "Realtime-з'єднання втрачено. Виконуємо перепідключення...";
    });

    this.signalRConnection.onreconnected(() => {
      this.signalRStatusMessage = "Realtime-з'єднання відновлено.";
      this.loadThread();
    });

    this.signalRConnection.onclose(() => {
      this.signalRStatusMessage = 'Realtime недоступний. Дані можна оновити перезавантаженням сторінки.';
    });

    void this.signalRConnection
      .start()
      .then(() => {
        this.signalRStatusMessage = '';
      })
      .catch(() => {
        this.signalRStatusMessage = 'Realtime недоступний. Дані можна оновити перезавантаженням сторінки.';
      });
  }

  /**
   * Завантажує дерево поточної гілки за id з маршруту.
   */
  private loadThread(): void {
    const commentId = this.route.snapshot.paramMap.get('id');
    if (!commentId) {
      this.errorMessage = 'Некоректний id коментаря.';
      this.loadCanRetry = false;
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.loadCanRetry = false;

    this.commentsApi.getThread(commentId).subscribe({
      next: (response) => {
        this.thread = response;
        this.isLoading = false;
      },
      error: (error) => {
        const uiError = this.apiErrorPresenter.present(error, 'Не вдалося завантажити гілку.');
        this.errorMessage = uiError.summary;
        this.loadCanRetry = uiError.canRetry;
        this.isLoading = false;
      }
    });
  }
}
