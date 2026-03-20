import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

import {
  CommentNode,
  CreateCommentAttachmentRequest
} from '../../core/comments.models';
import { CommentsGraphqlApiService } from '../../core/comments-graphql-api.service';
import { environment } from '../../../environments/environment';
import { ApiErrorPresenterService, UiValidationError } from '../../core/api-error-presenter.service';
import { xhtmlFragmentValidator } from '../../core/xhtml-fragment.validator';
import { CommentNodeCardComponent } from '../../shared/comment-node-card/comment-node-card.component';
import { CommentTreeComponent } from '../../shared/comment-tree/comment-tree.component';
import { FormSubmitFeedbackComponent } from '../../shared/form-submit-feedback/form-submit-feedback.component';
import { CommentAttachmentPickerComponent } from '../../shared/comment-attachment-picker/comment-attachment-picker.component';
import { CaptchaInputComponent } from '../../shared/captcha-input/captcha-input.component';
import { CommentAuthorTextFieldsComponent } from '../../shared/comment-author-text-fields/comment-author-text-fields.component';
import { CommentModalHeaderComponent } from '../../shared/comment-modal-header/comment-modal-header.component';
import { CommentFormActionsComponent } from '../../shared/comment-form-actions/comment-form-actions.component';
import { CommentModalLayoutComponent } from '../../shared/comment-modal-layout/comment-modal-layout.component';

@Component({
  selector: 'app-thread-page',
  // Тримаймо лише фактично використані standalone-імпорти без зайвих пайпів.
  imports: [ReactiveFormsModule, RouterLink, CommentNodeCardComponent, CommentTreeComponent, FormSubmitFeedbackComponent, CommentAttachmentPickerComponent, CaptchaInputComponent, CommentAuthorTextFieldsComponent, CommentModalHeaderComponent, CommentFormActionsComponent, CommentModalLayoutComponent],
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
        <app-comment-node-card
          [comment]="thread"
          [renderedTextHtml]="renderCommentText(thread.text)"
          [attachmentUrl]="thread.attachment ? getAttachmentUrl(thread.attachment.storagePath) : ''"
          [textPreviewContent]="thread.attachment ? (attachmentTextPreviewByPath[thread.attachment.storagePath] ?? '') : ''"
          [isTextPreviewLoading]="thread.attachment ? attachmentTextLoadingByPath.has(thread.attachment.storagePath) : false"
          [showContentType]="true"
          (requestTextPreview)="loadTextAttachment($event)"
          (replyClicked)="openReplyModal($event)" />

        <h3>Відповіді</h3>
        @if (thread.replies.length < 1) {
          <p>Ще немає відповідей.</p>
        } @else {
          <app-comment-tree
            [comments]="thread.replies"
            [renderText]="renderCommentText.bind(this)"
            [resolveAttachmentUrl]="getAttachmentUrl.bind(this)"
            [textPreviewByPath]="attachmentTextPreviewByPath"
            [loadingPaths]="attachmentTextLoadingByPath"
            [showContentType]="true"
            (requestTextPreview)="loadTextAttachment($event)"
            (replyClicked)="openReplyModal($event)" />
        }

        @if (isReplyModalOpen && activeReplyTarget) {
          <app-comment-modal-layout
            layoutTestId="thread-reply-modal-layout"
            backdropTestId="thread-reply-modal-backdrop"
            panelTestId="thread-reply-modal-panel"
            closeMode="always"
            (closeRequested)="closeReplyModal()">
              <app-comment-modal-header title="Нова відповідь" (closeClicked)="closeReplyModal()" />
              <p class="meta">Відповідь на: <strong>{{ activeReplyTarget.userName }}</strong></p>

              <form class="form-grid" [formGroup]="replyForm" (ngSubmit)="submitReply()" data-testid="thread-reply-form">
                <app-form-submit-feedback
                  [message]="submitMessage"
                  [validationErrors]="submitValidationErrors"
                  [showRetryHint]="showRetryHint"
                  testId="thread-submit-message" />

                <app-comment-author-text-fields
                  class="wide"
                  [formGroup]="replyForm"
                  [shouldHighlightInvalid]="shouldHighlightInvalid.bind(this)"
                  [textValidationMessage]="getTextValidationMessage(replyForm.controls.text)"
                  [previewHtml]="textPreviewHtml"
                  [previewMessage]="previewMessage"
                  quickTagsAriaLabel="Швидкі теги форматування"
                  userNameTestId="thread-user-name-input"
                  emailTestId="thread-email-input"
                  textTestId="thread-text-input"
                  quickTagsTestId="thread-quick-tags"
                  previewContainerTestId="thread-preview-container"
                  (textChanged)="previewText()"
                  (quickTagSelected)="insertQuickTag($event.tag, $event.textArea)" />

                <app-comment-attachment-picker
                  [message]="attachmentMessage"
                  [imagePreviewDataUrl]="attachmentImagePreviewDataUrl"
                  inputTestId="thread-attachment-input"
                  previewTestId="thread-selected-image-preview"
                  (attachmentSelected)="onAttachmentSelected($event)"
                  (clearRequested)="clearReplyAttachment()" />

                <app-captcha-input
                  class="wide"
                  [imageDataUrl]="captchaImageDataUrl"
                  [isInvalid]="shouldHighlightInvalid(replyForm.controls.captchaAnswer)"
                  imageTestId="thread-captcha-image"
                  answerTestId="thread-captcha-answer-input" />

                @if (captchaMessage) {
                  <p class="error wide">{{ captchaMessage }}</p>
                }

                <app-comment-form-actions
                  [showCloseButton]="true"
                  closeLabel="Закрити"
                  (closeClicked)="closeReplyModal()"
                  submitLabel="Створити коментар"
                  [submitDisabled]="replyForm.invalid || isSubmitting || hasBlockingErrors(replyForm)"
                  submitTestId="thread-submit-button" />
              </form>
          </app-comment-modal-layout>
        }
      }
    </section>
  `,
  styles: [
    `
      .error { color: #b42318; }
      .meta, .attachment-meta { color: #475467; }
      .attachment-inline { margin-top: 8px; }
      .attachment-text { white-space: pre-wrap; background: #f8fafc; border: 1px solid #d9e0ec; border-radius: 8px; padding: 8px; }
      .thread-node { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; margin-top: 10px; background: #fcfcfd; }
      .comment-header { display: flex; gap: 10px; flex-wrap: wrap; background: #e5e7eb; padding: 6px 8px; border-radius: 8px; margin: 0 0 8px; }
      .thread-actions { margin-top: 8px; display: flex; justify-content: flex-end; }
      .tree { list-style: none; margin: 0; padding-left: 14px; }
      .text-preview { border: 1px dashed #d0d5dd; border-radius: 8px; padding: 8px; background: #f8fafc; }
      .text-preview-title { color: #344054; font-size: 14px; margin-bottom: 6px; font-weight: 600; }
      .text-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .text-toolbar-label { color: #344054; font-size: 14px; }
      .error-list { color: #b42318; margin: 6px 0 0; }
      .form-error-top { border: 1px solid #fecdca; background: #fef3f2; border-radius: 8px; padding: 10px; }
      .field-invalid { border-color: #d92d20; box-shadow: 0 0 0 1px #d92d20 inset; }
    `
  ]
})
/**
 * Сторінка перегляду однієї гілки коментарів та додавання відповіді.
 */
export class ThreadPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly commentsGraphqlApi = inject(CommentsGraphqlApiService);
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
  /** Кеш preview-вмісту text-вкладень за storagePath; значення може бути відсутнім до першого завантаження. */
  attachmentTextPreviewByPath: Record<string, string | undefined> = {};
  attachmentTextLoadingByPath = new Set<string>();

  readonly replyForm = this.formBuilder.nonNullable.group({
    userName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    text: ['', [Validators.required, Validators.maxLength(5000), xhtmlFragmentValidator()]],
    captchaAnswer: ['', [Validators.required]]
  });

  constructor() {
    this.setupServerValidationReset(this.replyForm.controls.userName);
    this.setupServerValidationReset(this.replyForm.controls.email);
    this.setupServerValidationReset(this.replyForm.controls.text);
    this.setupServerValidationReset(this.replyForm.controls.captchaAnswer);
  }

  /**
   * Повертає локалізований текст помилки XHTML-валидації для textarea відповіді.
   */
  getTextValidationMessage(control: { errors: Record<string, unknown> | null; touched: boolean; dirty: boolean }): string {
    const shouldShow = control.touched || control.dirty;
    if (!shouldShow || !control.errors) {
      return '';
    }

    if (control.errors['xhtmlFragment']) {
      return 'Текст повинен бути валідним XHTML (теги мають бути коректно закриті).';
    }

    if (control.errors['unsupportedTag']) {
      const tagName = String(control.errors['unsupportedTag']);
      return `Тег <${tagName}> заборонений. Дозволено лише: <a>, <code>, <i>, <strong>.`;
    }

    if (control.errors['invalidAnchorAttributes']) {
      return 'Для тегу <a> дозволено тільки атрибут href.';
    }

    if (control.errors['invalidAnchorHref']) {
      return 'У <a href> потрібно вказати абсолютний URL з протоколом http або https.';
    }

    if (control.errors['disallowedAttributes']) {
      const tagName = String(control.errors['disallowedAttributes']);
      return `Атрибути заборонені для тегу <${tagName}>.`;
    }

    return '';
  }

  /**
   * Повертає true, якщо конкретне поле потрібно підсвітити як помилкове.
   */
  shouldHighlightInvalid(control: AbstractControl | null): boolean {
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  /**
   * Повертає true, якщо submit має бути заблокований через помилки форми.
   */
  hasBlockingErrors(form: { invalid: boolean }): boolean {
    return form.invalid;
  }

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

    this.commentsGraphqlApi.previewComment(text).subscribe({
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


  /** Очищає вибране вкладення у формі відповіді. */
  clearReplyAttachment(): void {
    this.attachment = null;
    this.attachmentImagePreviewDataUrl = '';
    this.attachmentMessage = '';
  }

  /**
   * Перезавантажує CAPTCHA для форми відповіді.
   */
  reloadCaptcha(): void {
    this.captchaMessage = '';

    this.commentsGraphqlApi.getCaptcha().subscribe({
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

    this.commentsGraphqlApi
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
          this.applyServerValidationErrors(this.replyForm.controls, uiError.validationErrors);
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
   * Повертає безпечний HTML для відображення тексту коментаря з підтримкою переносів рядків.
   */
  renderCommentText(text: string): string {
    return text.replace(/\n/g, '<br />');
  }

  /**
   * Підвантажує вміст txt-вкладення для inline preview.
   */
  loadTextAttachment(storagePath: string): void {
    if (this.attachmentTextPreviewByPath[storagePath] || this.attachmentTextLoadingByPath.has(storagePath)) {
      return;
    }

    this.attachmentTextLoadingByPath.add(storagePath);
    this.commentsGraphqlApi.getAttachmentText(storagePath).subscribe({
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

    this.commentsGraphqlApi.getThread(commentId).subscribe({
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


  /**
   * Позначає поля форми як помилкові на основі server-side validation ключів.
   */
  private applyServerValidationErrors(
    controls: Record<string, AbstractControl>,
    validationErrors: ReadonlyArray<UiValidationError>
  ): void {
    for (const validationError of validationErrors) {
      const normalizedField = validationError.field.toLowerCase();
      const mappedControl = this.mapServerFieldToControl(controls, normalizedField);
      if (!mappedControl) {
        continue;
      }

      const existingErrors = mappedControl.errors ?? {};
      mappedControl.setErrors({ ...existingErrors, server: true });
      mappedControl.markAsTouched();
    }
  }

  /**
   * Повертає FormControl для server-side поля, якщо підтримується мапінг.
   */
  private mapServerFieldToControl(
    controls: Record<string, AbstractControl>,
    normalizedField: string
  ): AbstractControl | null {
    const mapping: Record<string, string> = {
      'request.username': 'userName',
      username: 'userName',
      'request.email': 'email',
      email: 'email',
      'request.text': 'text',
      text: 'text',
      'request.captchatoken': 'captchaAnswer',
      captchatoken: 'captchaAnswer',
      captchaanswer: 'captchaAnswer'
    };

    const controlName = mapping[normalizedField];
    if (!controlName) {
      return null;
    }

    return controls[controlName] ?? null;
  }

  /**
   * Автоматично прибирає server-помилку поля після зміни значення користувачем.
   */
  private setupServerValidationReset(control: AbstractControl): void {
    control.valueChanges.subscribe(() => {
      if (!control.errors || !control.errors['server']) {
        return;
      }

      const { server: _server, ...restErrors } = control.errors;
      control.setErrors(Object.keys(restErrors).length > 0 ? restErrors : null);
    });
  }
}
