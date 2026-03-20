import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

import {
  CommentNode,
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
import { ModalCloseReason } from '../../shared/comment-modal-layout/comment-modal-layout.component';
import { canCloseModal } from '../../shared/comment-modal-layout/modal-close.guard';
import {
  buildQuickTagInsertResult,
  readAttachmentAsRequest,
  refreshCommentPreview,
  reloadCommentCaptcha,
  runCommentSubmitWorkflow
} from '../../shared/comment-form/comment-form-helpers';
import { CommentFormAttachmentState } from '../../shared/comment-form/comment-form-attachment-state';
import { applyServerValidationErrorsToControls, ServerFieldControlMapping, setupServerValidationReset } from '../../shared/comment-form/comment-form-server-validation';
import {
  createInitialCommentFormSubmitState,
} from '../../shared/comment-form/comment-form-submit-state';
import {
  createInitialCommentFormPreviewState,
} from '../../shared/comment-form/comment-form-preview-state';
import {
  createClosedCommentFormModalState,
  createInitialCommentFormCaptchaState,
  createOpenedCommentFormModalState,
} from '../../shared/comment-form/comment-form-ui-state';
import { CommentFormStateFacade } from '../../shared/comment-form/comment-form-state.facade';

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
            [closeMode]="isSubmitting ? 'disabled' : 'always'"
            (closeRequested)="onReplyModalCloseRequested($event)">
              <app-comment-modal-header title="Нова відповідь" (closeClicked)="onReplyModalCloseRequested($event)" />
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

  /** Мапінг server-side полів на FormControl для reply-форми сторінки гілки. */
  private readonly replyFormServerFieldMapping: ServerFieldControlMapping = {
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

  thread: CommentNode | null = null;
  isLoading = true;
  errorMessage = '';
  /** Прапорець для показу підказки щодо повторної спроби завантаження. */
  loadCanRetry = false;
  /** Shared facade для submit/preview/captcha/modal станів reply-форми. */
  private readonly replyFormState = new CommentFormStateFacade();
  /** Поточний статус realtime-з'єднання SignalR. */
  signalRStatusMessage = '';
  /** Поточний коментар, на який користувач відповідає у модальному вікні. */
  activeReplyTarget: CommentNode | null = null;
  /** Shared state вкладення reply-форми (payload + message + image preview). */
  private readonly replyAttachmentState = new CommentFormAttachmentState();
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
    setupServerValidationReset(this.replyForm.controls.userName);
    setupServerValidationReset(this.replyForm.controls.email);
    setupServerValidationReset(this.replyForm.controls.text);
    setupServerValidationReset(this.replyForm.controls.captchaAnswer);
    this.replyFormState.setSubmitState(createInitialCommentFormSubmitState());
    this.replyFormState.setPreviewState(createInitialCommentFormPreviewState());
    this.replyFormState.setCaptchaState(createInitialCommentFormCaptchaState());
    this.replyFormState.setModalState(createClosedCommentFormModalState());
  }

  /** Прапорець активного submit у reply-формі. */
  get isSubmitting(): boolean {
    return this.replyFormState.isSubmitting;
  }

  /** Повідомлення submit-операції reply-форми. */
  get submitMessage(): string {
    return this.replyFormState.submitMessage;
  }

  /** Нормалізовані validation-помилки submit-операції reply-форми. */
  get submitValidationErrors(): ReadonlyArray<UiValidationError> {
    return this.replyFormState.submitValidationErrors;
  }

  /** Показувати чи ні retry-підказку для reply submit. */
  get showRetryHint(): boolean {
    return this.replyFormState.showRetryHint;
  }

  /** HTML preview поточного тексту reply-форми. */
  get textPreviewHtml(): string {
    return this.replyFormState.previewHtml;
  }

  /** Повідомлення про fallback-стан preview у reply-формі. */
  get previewMessage(): string {
    return this.replyFormState.previewMessage;
  }

  /** Прапорець видимості reply-модалки для template. */
  get isReplyModalOpen(): boolean {
    return this.replyFormState.isModalOpen;
  }

  /** Активний challenge id CAPTCHA для reply-форми. */
  get captchaChallengeId(): string {
    return this.replyFormState.captchaChallengeId;
  }

  /** Data URL CAPTCHA для reply-форми. */
  get captchaImageDataUrl(): string {
    return this.replyFormState.captchaImageDataUrl;
  }

  /** Повідомлення про стан CAPTCHA для reply-форми. */
  get captchaMessage(): string {
    return this.replyFormState.captchaMessage;
  }

  /** Повідомлення стану вкладення reply-форми для attachment picker. */
  get attachmentMessage(): string {
    return this.replyAttachmentState.statusMessage;
  }

  /** Data URL preview вибраного зображення reply-форми. */
  get attachmentImagePreviewDataUrl(): string {
    return this.replyAttachmentState.previewDataUrl;
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
    refreshCommentPreview({
      text: this.replyForm.controls.text.value,
      requestPreview: (text) => this.commentsGraphqlApi.previewComment(text),
      setPreviewState: (state) => this.replyFormState.setPreviewState(state),
      unavailableMessage: 'Preview тимчасово недоступний. Ви можете продовжити відправку відповіді без preview.'
    });
  }

  /**
   * Валідовує і читає вкладення відповіді у base64-представлення.
   */
  async onAttachmentSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.replyAttachmentState.reset();

    if (!file) {
      return;
    }

    const readResult = await readAttachmentAsRequest(file);
    this.replyAttachmentState.applyReadResult(readResult);

    if (!readResult.attachment) {
      input.value = '';
    }
  }



  /**
   * Додає HTML-тег у текстове поле з урахуванням поточного виділення користувача.
   */
  insertQuickTag(tag: 'i' | 'strong' | 'code' | 'a', textarea: HTMLTextAreaElement): void {
    const quickTagInsertResult = buildQuickTagInsertResult(tag, textarea);
    this.replyForm.controls.text.setValue(quickTagInsertResult.updatedText);
    textarea.focus();
    textarea.setSelectionRange(quickTagInsertResult.caretPosition, quickTagInsertResult.caretPosition);
    this.previewText();
  }


  /** Очищає вибране вкладення у формі відповіді. */
  clearReplyAttachment(): void {
    this.replyAttachmentState.reset();
  }

  /**
   * Перезавантажує CAPTCHA для форми відповіді.
   */
  reloadCaptcha(): void {
    reloadCommentCaptcha({
      requestCaptcha: () => this.commentsGraphqlApi.getCaptcha(),
      setCaptchaState: (state) => this.replyFormState.setCaptchaState(state),
      resolveErrorMessage: (error) => this.apiErrorPresenter.present(error, 'Не вдалося завантажити CAPTCHA.').summary
    });
  }

  /**
   * Надсилає нову відповідь у поточну гілку.
   */
  submitReply(): void {
    if (!this.activeReplyTarget || this.replyForm.invalid || !this.captchaChallengeId) {
      return;
    }

    const raw = this.replyForm.getRawValue();

    runCommentSubmitWorkflow({
      submitRequest: () => this.commentsGraphqlApi.createComment({
        userName: raw.userName,
        email: raw.email,
        homePage: null,
        text: raw.text,
        parentId: this.activeReplyTarget.id,
        captchaToken: `${this.captchaChallengeId}:${raw.captchaAnswer}`,
        attachment: this.replyAttachmentState.value
      }),
      setSubmitState: (state) => this.replyFormState.setSubmitState(state),
      successMessage: 'Відповідь додано.',
      onSuccess: () => {
        this.replyForm.reset({ userName: raw.userName, email: raw.email, text: '', captchaAnswer: '' });
        this.replyFormState.setPreviewState(createInitialCommentFormPreviewState());
        this.replyAttachmentState.reset();
        this.closeReplyModal('backdrop', true);
        this.loadThread();
        this.reloadCaptcha();
      },
      presentError: (error) => this.apiErrorPresenter.present(error, 'Не вдалося надіслати відповідь. Перевірте дані форми.'),
      applyServerValidationErrors: (validationErrors) => {
        applyServerValidationErrorsToControls(this.replyForm.controls, validationErrors, this.replyFormServerFieldMapping);
      },
      onAfterError: () => this.reloadCaptcha()
    });
  }

  /**
   * Відкриває модальне вікно створення відповіді для вибраного коментаря.
   */
  openReplyModal(comment: CommentNode): void {
    this.activeReplyTarget = comment;
    this.replyFormState.setModalState(createOpenedCommentFormModalState());
    this.replyFormState.setSubmitState(createInitialCommentFormSubmitState());
    this.replyFormState.setPreviewState(createInitialCommentFormPreviewState());
    this.reloadCaptcha();
  }

  /**
   * Централізовано обробляє запити на закриття reply-модалки (Escape/backdrop/кнопки).
   */
  onReplyModalCloseRequested(reason: ModalCloseReason): void {
    this.closeReplyModal(reason);
  }

  /**
   * Закриває модальне вікно відповіді та очищає тимчасові стани форми.
   */
  closeReplyModal(reason: ModalCloseReason = 'backdrop', force = false): void {
    if (!canCloseModal(this.isSubmitting, reason, force)) {
      return;
    }

    this.replyFormState.setModalState(createClosedCommentFormModalState());
    this.activeReplyTarget = null;
    this.replyForm.controls.text.reset('');
    this.replyForm.controls.captchaAnswer.reset('');
    this.replyFormState.setPreviewState(createInitialCommentFormPreviewState());
    this.replyAttachmentState.reset();
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

}
