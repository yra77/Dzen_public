import { DatePipe } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

import {
  CommentNode,
  CommentsApiService,
  CreateCommentAttachmentRequest
} from '../../core/comments-api.service';
import { ApiErrorPresenterService, UiValidationError } from '../../core/api-error-presenter.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-root-list-page',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  template: `
    <section class="panel">
      <h2>Останні кореневі коментарі</h2>
      <button type="button" (click)="load()" [disabled]="isLoading" data-testid="root-refresh-button">Оновити</button>
      @if (signalRStatusMessage) {
        <p class="meta">{{ signalRStatusMessage }}</p>
      }

      <h3>Додати кореневий коментар</h3>
      <form class="form-grid" [formGroup]="createForm" (ngSubmit)="submitComment()" data-testid="root-create-form">
        <label>
          Ім'я
          <input type="text" formControlName="userName" data-testid="root-user-name-input" />
        </label>

        <label>
          Email
          <input type="email" formControlName="email" data-testid="root-email-input" />
        </label>

        <label>
          Homepage
          <input type="url" formControlName="homePage" placeholder="https://example.com" data-testid="root-home-page-input" />
        </label>

        <label class="wide">
          Текст
          <textarea #rootTextArea rows="5" formControlName="text" (input)="previewText()" data-testid="root-text-input"></textarea>
        </label>

        <div class="wide text-toolbar" role="group" aria-label="Швидкі теги форматування" data-testid="root-quick-tags">
          <span class="text-toolbar-label">Швидкі теги:</span>
          <button type="button" (click)="insertQuickTag('i', rootTextArea)">[i]</button>
          <button type="button" (click)="insertQuickTag('strong', rootTextArea)">[strong]</button>
          <button type="button" (click)="insertQuickTag('code', rootTextArea)">[code]</button>
          <button type="button" (click)="insertQuickTag('a', rootTextArea)">[a]</button>
        </div>

        @if (textPreviewHtml) {
            <div class="text-preview" data-testid="root-preview-container">
            <div class="text-preview-title">Preview повідомлення</div>
            <div [innerHTML]="textPreviewHtml"></div>
          </div>
        }

        @if (previewMessage) {
          <p class="meta">{{ previewMessage }}</p>
        }

        <label class="wide">
          Вкладення (png/jpg/gif/txt, до 1MB)
          <input type="file" (change)="onAttachmentSelected($event)" accept=".txt,image/png,image/jpeg,image/gif,text/plain" data-testid="root-attachment-input" />
        </label>
        @if (attachmentMessage) {
          <p class="meta">{{ attachmentMessage }}</p>
        }
        @if (attachmentImagePreviewDataUrl) {
          <figure class="attachment-selection-preview" data-testid="root-selected-image-preview">
            <img [src]="attachmentImagePreviewDataUrl" alt="Preview вибраного зображення" class="attachment-thumb" />
            <figcaption class="meta">Preview вибраного зображення</figcaption>
          </figure>
        }

        @if (captchaImageDataUrl) {
          <img [src]="captchaImageDataUrl" alt="Captcha" class="captcha" data-testid="root-captcha-image" />
        }

        @if (captchaMessage) {
          <p class="error">{{ captchaMessage }}</p>
        }

        <label>
          CAPTCHA (сума чисел)
          <input type="text" formControlName="captchaAnswer" data-testid="root-captcha-answer-input" />
        </label>

        <div class="actions wide">
          <button type="button" (click)="reloadCaptcha()" data-testid="root-captcha-reload-button">Оновити CAPTCHA</button>
          <button type="submit" [disabled]="createForm.invalid || isSubmitting" data-testid="root-submit-button">Створити коментар</button>
        </div>

        @if (submitMessage) {
          <p data-testid="root-submit-message">{{ submitMessage }}</p>
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

      @if (isLoading) {
        <p>Завантаження...</p>
      } @else if (errorMessage) {
        <p class="error">{{ errorMessage }}</p>
        @if (loadCanRetry) {
          <p class="meta">Спробуйте натиснути "Оновити" повторно через кілька секунд.</p>
        }
      } @else if (comments.length === 0) {
        <p>Поки що коментарів немає.</p>
      } @else {
        <ul class="comments-list" data-testid="root-comments-list">
          @for (comment of comments; track comment.id) {
            <li class="comment">
              <a [routerLink]="['/thread', comment.id]">#{{ comment.id }} {{ comment.userName }}</a>
              <small>{{ comment.createdAtUtc | date: 'short' }}</small>
              <p>{{ comment.text }}</p>
              @if (comment.attachment) {
                <div class="attachment-inline">
                  @if (comment.attachment.contentType.startsWith('image/')) {
                    <a [href]="getAttachmentUrl(comment.attachment.storagePath)" target="_blank" rel="noreferrer">
                      <img
                        class="attachment-thumb"
                        [src]="getAttachmentUrl(comment.attachment.storagePath)"
                        [alt]="comment.attachment.fileName"
                      />
                    </a>
                  } @else if (comment.attachment.contentType === 'text/plain') {
                    <button
                      type="button"
                      (click)="loadTextAttachment(comment.attachment.storagePath)"
                      [disabled]="attachmentTextLoadingByPath.has(comment.attachment.storagePath)"
                    >
                      Показати txt preview
                    </button>
                    @if (attachmentTextLoadingByPath.has(comment.attachment.storagePath)) {
                      <p class="meta">Завантаження txt preview...</p>
                    }
                    @if (attachmentTextPreviewByPath[comment.attachment.storagePath]) {
                      <pre class="attachment-text">{{ attachmentTextPreviewByPath[comment.attachment.storagePath] }}</pre>
                    }
                  }
                  <small>📎 <a [href]="getAttachmentUrl(comment.attachment.storagePath)" target="_blank" rel="noreferrer">{{ comment.attachment.fileName }}</a></small>
                </div>
              }
              <small>Відповідей: {{ comment.replies.length }}</small>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: [
    `
      .error { color: #b42318; }
      .meta { color: #475467; }
      .comments-list { padding: 0; list-style: none; display: grid; gap: 10px; }
      .comment { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; background: #fcfcfd; }
      .attachment-inline { margin-top: 8px; }
      .attachment-thumb { max-width: 260px; max-height: 180px; border: 1px solid #d0d7de; border-radius: 8px; }
      .attachment-text { white-space: pre-wrap; background: #f8fafc; border: 1px solid #d9e0ec; border-radius: 8px; padding: 8px; }
      .attachment-selection-preview { margin: 0; }
      .error-list { color: #b42318; margin: 6px 0 0; }
      .captcha { width: 160px; height: 60px; border: 1px solid #d9e0ec; border-radius: 6px; }
      .text-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .text-toolbar-label { color: #344054; font-size: 14px; }
      @media (max-width: 900px) { .actions { flex-direction: column; } }
    `
  ]
})
/**
 * Сторінка списку кореневих коментарів з формою створення нового запису.
 */
export class RootListPageComponent implements OnDestroy {
  private readonly commentsApi = inject(CommentsApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly apiErrorPresenter = inject(ApiErrorPresenterService);

  private signalRConnection: HubConnection | null = null;

  comments: ReadonlyArray<CommentNode> = [];
  isLoading = false;
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
  attachmentMessage = '';
  attachment: CreateCommentAttachmentRequest | null = null;
  /** Data URL для preview вибраного зображення перед submit. */
  attachmentImagePreviewDataUrl = '';
  attachmentTextPreviewByPath: Record<string, string> = {};
  attachmentTextLoadingByPath = new Set<string>();

  readonly createForm = this.formBuilder.nonNullable.group({
    userName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    homePage: ['', [Validators.pattern('https?://.+')]],
    text: ['', [Validators.required, Validators.maxLength(5000)]],
    captchaAnswer: ['', [Validators.required]]
  });

  constructor() {
    this.load();
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
   * Завантажує сторінку кореневих коментарів.
   */
  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.loadCanRetry = false;

    this.commentsApi.getRootComments().subscribe({
      next: (response) => {
        this.comments = response.items;
        this.isLoading = false;
      },
      error: (error) => {
        const uiError = this.apiErrorPresenter.present(error, 'Не вдалося завантажити коментарі.');
        this.errorMessage = uiError.summary;
        this.loadCanRetry = uiError.canRetry;
        this.isLoading = false;
      }
    });
  }

  /**
   * Оновлює HTML preview для поточного тексту коментаря.
   */
  previewText(): void {
    const text = this.createForm.controls.text.value;
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
        this.previewMessage = 'Preview тимчасово недоступний. Ви можете продовжити відправку коментаря без preview.';
      }
    });
  }

  /**
   * Валідовує і читає вкладення користувача у base64-представлення.
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
    this.createForm.controls.text.setValue(updatedText);
    textarea.focus();
    textarea.setSelectionRange(caretPosition, caretPosition);
    this.previewText();
  }

  /**
   * Перезавантажує CAPTCHA для форми створення.
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
   * Надсилає створення кореневого коментаря через REST API.
   */
  submitComment(): void {
    if (this.createForm.invalid || !this.captchaChallengeId) {
      return;
    }

    this.isSubmitting = true;
    this.submitMessage = '';
    this.submitValidationErrors = [];
    this.showRetryHint = false;

    const raw = this.createForm.getRawValue();

    this.commentsApi
      .createComment({
        userName: raw.userName,
        email: raw.email,
        homePage: raw.homePage.trim() ? raw.homePage : null,
        text: raw.text,
        parentId: null,
        captchaToken: `${this.captchaChallengeId}:${raw.captchaAnswer}`,
        attachment: this.attachment
      })
      .subscribe({
        next: () => {
          this.submitMessage = 'Коментар успішно створено.';
          this.createForm.reset({
            userName: raw.userName,
            email: raw.email,
            homePage: raw.homePage,
            text: '',
            captchaAnswer: ''
          });
          this.textPreviewHtml = '';
          this.previewMessage = '';
          this.attachment = null;
          this.attachmentMessage = '';
          this.attachmentImagePreviewDataUrl = '';
          this.load();
          this.reloadCaptcha();
          this.isSubmitting = false;
        },
        error: (error) => {
          const uiError = this.apiErrorPresenter.present(error, 'Не вдалося створити коментар. Перевірте дані форми.');
          this.submitMessage = uiError.summary;
          this.submitValidationErrors = uiError.validationErrors;
          this.showRetryHint = uiError.canRetry;
          this.reloadCaptcha();
          this.isSubmitting = false;
        }
      });
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
   * Ініціалізує SignalR-підписку, щоб оновлювати список при нових коментарях.
   */
  private initializeSignalR(): void {
    this.signalRConnection = new HubConnectionBuilder()
      .withUrl(`${environment.apiBaseUrl}/hubs/comments`)
      .withAutomaticReconnect()
      .build();

    this.signalRConnection.on('commentCreated', () => {
      this.load();
    });

    this.signalRConnection.onreconnecting(() => {
      this.signalRStatusMessage = "Realtime-з'єднання втрачено. Виконуємо перепідключення...";
    });

    this.signalRConnection.onreconnected(() => {
      this.signalRStatusMessage = "Realtime-з'єднання відновлено.";
      this.load();
    });

    this.signalRConnection.onclose(() => {
      this.signalRStatusMessage = 'Realtime недоступний. Дані можна оновити кнопкою "Оновити".';
    });

    void this.signalRConnection
      .start()
      .then(() => {
        this.signalRStatusMessage = '';
      })
      .catch(() => {
        this.signalRStatusMessage = 'Realtime недоступний. Дані можна оновити кнопкою "Оновити".';
      });
  }
}
