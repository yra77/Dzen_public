import { Component, OnDestroy, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

import {
  CommentNode,
  CreateCommentAttachmentRequest,
  RootCommentsSortDirection,
  RootCommentsSortField
} from '../../core/comments.models';
import { CommentsGraphqlApiService } from '../../core/comments-graphql-api.service';
import { ApiErrorPresenterService, UiValidationError } from '../../core/api-error-presenter.service';
import { environment } from '../../../environments/environment';
import { xhtmlFragmentValidator } from '../../core/xhtml-fragment.validator';
import { CommentTreeComponent } from '../../shared/comment-tree/comment-tree.component';
import { FormSubmitFeedbackComponent } from '../../shared/form-submit-feedback/form-submit-feedback.component';
import { CommentAttachmentPickerComponent } from '../../shared/comment-attachment-picker/comment-attachment-picker.component';
import { CaptchaInputComponent } from '../../shared/captcha-input/captcha-input.component';
import { CommentAuthorTextFieldsComponent } from '../../shared/comment-author-text-fields/comment-author-text-fields.component';
import { CommentModalHeaderComponent } from '../../shared/comment-modal-header/comment-modal-header.component';
import { CommentFormActionsComponent } from '../../shared/comment-form-actions/comment-form-actions.component';


@Component({
  selector: 'app-root-list-page',
  // Тримаймо лише фактично використані standalone-імпорти без зайвих пайпів.
  imports: [ReactiveFormsModule, CommentTreeComponent, FormSubmitFeedbackComponent, CommentAttachmentPickerComponent, CaptchaInputComponent, CommentAuthorTextFieldsComponent, CommentModalHeaderComponent, CommentFormActionsComponent],
  template: `
    <section class="panel">
      <button class="btn-answer" type="button" (click)="openCreateModal()" data-testid="root-open-create-modal-button">Коментувати</button>
      @if (signalRStatusMessage) {
        <p class="meta">{{ signalRStatusMessage }}</p>
      }
       <div class="list-controls">
        <label>
          Сортувати за
          <select [value]="sortBy" (change)="onSortByChanged($event)" data-testid="root-sort-by">
            <option value="CreatedAtUtc">Дата</option>
            <option value="UserName">User Name</option>
            <option value="Email">E-mail</option>
          </select>
        </label>

        <label>
          Напрям
          <select [value]="sortDirection" (change)="onSortDirectionChanged($event)" data-testid="root-sort-direction">
            <option value="Desc">Спадання</option>
            <option value="Asc">Зростання</option>
          </select>
        </label>
      </div>


      @if (isCreateModalOpen) {
        <div class="reply-modal-backdrop" (click)="closeCreateModal()">
          <div class="reply-modal" (click)="$event.stopPropagation()">
            <app-comment-modal-header title="Новий коментар" (closeClicked)="closeCreateModal()" />
            <form class="form-grid" [formGroup]="createForm" (ngSubmit)="submitComment()" data-testid="root-create-form">
              <app-form-submit-feedback
                [message]="submitMessage"
                [validationErrors]="submitValidationErrors"
                [showRetryHint]="showRetryHint"
                testId="root-submit-message" />

              <app-comment-author-text-fields
                class="wide"
                [formGroup]="createForm"
                [shouldHighlightInvalid]="shouldHighlightInvalid.bind(this)"
                [showHomePage]="true"
                [textValidationMessage]="getTextValidationMessage(createForm.controls.text)"
                [previewHtml]="textPreviewHtml"
                [previewMessage]="previewMessage"
                quickTagsAriaLabel="Швидкі теги форматування"
                userNameTestId="root-user-name-input"
                emailTestId="root-email-input"
                homePageTestId="root-home-page-input"
                textTestId="root-text-input"
                quickTagsTestId="root-quick-tags"
                previewContainerTestId="root-preview-container"
                (textChanged)="previewText()"
                (quickTagSelected)="insertQuickTag($event.tag, $event.textArea)" />

              <app-comment-attachment-picker
                [message]="attachmentMessage"
                [imagePreviewDataUrl]="attachmentImagePreviewDataUrl"
                inputTestId="root-attachment-input"
                previewTestId="root-selected-image-preview"
                (attachmentSelected)="onAttachmentSelected($event)"
                (clearRequested)="clearCreateAttachment()" />

              <app-captcha-input
                class="wide"
                [imageDataUrl]="captchaImageDataUrl"
                [isInvalid]="shouldHighlightInvalid(createForm.controls.captchaAnswer)"
                imageTestId="root-captcha-image"
                answerTestId="root-captcha-answer-input" />

              @if (captchaMessage) {
                <p class="error wide">{{ captchaMessage }}</p>
              }

              <app-comment-form-actions
                submitLabel="Створити коментар"
                [submitDisabled]="createForm.invalid || isSubmitting || hasBlockingErrors(createForm)"
                submitTestId="root-submit-button" />
            </form>
          </div>
        </div>
      }

      @if (isLoading) {
        <p>Завантаження...</p>
      } @else if (errorMessage) {
        <p class="error">{{ errorMessage }}</p>
        @if (loadCanRetry) {
          <p class="meta">Спробуйте повторити завантаження через кілька секунд.</p>
        }
      } @else if (comments.length === 0) {
        <p>Поки що коментарів немає.</p>
      } @else {
        <ul class="comments-list" data-testid="root-comments-list">
          <li>
            <app-comment-tree
              [comments]="comments"
              [renderText]="renderCommentText.bind(this)"
              [resolveAttachmentUrl]="getAttachmentUrl.bind(this)"
              [textPreviewByPath]="attachmentTextPreviewByPath"
              [loadingPaths]="attachmentTextLoadingByPath"
              (requestTextPreview)="loadTextAttachment($event)"
              (replyClicked)="openReplyModal($event)" />
          </li>
        </ul>

        <div class="pagination">
          <button type="button" (click)="goToPreviousPage()" [disabled]="page <= 1 || isLoading">← Попередня</button>
          <span>Сторінка {{ page }} з {{ totalPages }}</span>
          <button type="button" (click)="goToNextPage()" [disabled]="page >= totalPages || isLoading">Наступна →</button>
        </div>
        @if (isReplyModalOpen) {
          <div class="reply-modal-backdrop" (click)="closeReplyModal()">
            <div class="reply-modal" (click)="$event.stopPropagation()">
              <app-comment-modal-header title="Нова відповідь" (closeClicked)="closeReplyModal()" />
              <p class="meta">Відповідь для: <strong>{{ activeReplyTarget?.userName }}</strong></p>

              <form class="form-grid" [formGroup]="replyForm" (ngSubmit)="submitReplyComment()">
                <app-form-submit-feedback
                  [message]="replySubmitMessage"
                  [validationErrors]="replySubmitValidationErrors"
                  [showRetryHint]="replyShowRetryHint" />

                <app-comment-author-text-fields
                  class="wide"
                  [formGroup]="replyForm"
                  [shouldHighlightInvalid]="shouldHighlightInvalid.bind(this)"
                  [textValidationMessage]="getTextValidationMessage(replyForm.controls.text)"
                  [previewHtml]="replyTextPreviewHtml"
                  [previewMessage]="replyPreviewMessage"
                  quickTagsAriaLabel="Швидкі теги форматування для відповіді"
                  (textChanged)="previewReplyText()"
                  (quickTagSelected)="insertReplyQuickTag($event.tag, $event.textArea)" />

                <app-comment-attachment-picker
                  [message]="replyAttachmentMessage"
                  [imagePreviewDataUrl]="replyAttachmentImagePreviewDataUrl"
                  (attachmentSelected)="onReplyAttachmentSelected($event)"
                  (clearRequested)="clearReplyAttachment()" />

                <app-captcha-input
                  class="wide"
                  [imageDataUrl]="replyCaptchaImageDataUrl"
                  [isInvalid]="shouldHighlightInvalid(replyForm.controls.captchaAnswer)" />

                @if (replyCaptchaMessage) {
                  <p class="error wide">{{ replyCaptchaMessage }}</p>
                }

                <app-comment-form-actions
                  submitLabel="Створити коментар"
                  [submitDisabled]="replyForm.invalid || isReplySubmitting || hasBlockingErrors(replyForm)" />
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
      .meta { color: #475467; }
      .list-controls { display: flex; gap: 12px; flex-wrap: wrap; margin: 12px 0; }
      .pagination { margin-top: 12px; display: flex; align-items: center; gap: 10px; }
      .comments-list { padding: 0; list-style: none; display: grid; gap: 10px; }
      .comment { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; background: #fcfcfd; }
      .comment-header { display: flex; gap: 10px; flex-wrap: wrap; background: #e5e7eb; padding: 6px 8px; border-radius: 8px; margin: 0 0 8px; }
      .thread-node { margin-top: 10px; }
      .thread-actions { margin-top: 8px; display: flex; justify-content: flex-end; }
      .tree { list-style: none; margin: 0; padding-left: 14px; }
      .attachment-inline { margin-top: 8px; }
      .attachment-text { white-space: pre-wrap; background: #f8fafc; border: 1px solid #d9e0ec; border-radius: 8px; padding: 8px; }
      .error-list { color: #b42318; margin: 6px 0 0; }
      .form-error-top { border: 1px solid #fecdca; background: #fef3f2; border-radius: 8px; padding: 10px; }
      .field-invalid { border-color: #d92d20; box-shadow: 0 0 0 1px #d92d20 inset; }
      .text-preview { border: 1px dashed #d0d5dd; border-radius: 8px; padding: 8px; background: #f8fafc; }
      .text-preview-title { color: #344054; font-size: 14px; margin-bottom: 6px; font-weight: 600; }
      .text-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .text-toolbar-label { color: #344054; font-size: 14px; }
      .reply-modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
      .reply-modal { width: min(760px, 100%); max-height: 92vh; overflow-y: auto; background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.25); }
    `
  ]
})
/**
 * Сторінка списку кореневих коментарів з формою створення нового запису.
 */
export class RootListPageComponent implements OnDestroy {
  private readonly commentsGraphqlApi = inject(CommentsGraphqlApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly apiErrorPresenter = inject(ApiErrorPresenterService);

  private signalRConnection: HubConnection | null = null;

  comments: ReadonlyArray<CommentNode> = [];
  /** Поточна сторінка root-коментарів. */
  page = 1;
  /** Розмір сторінки згідно ТЗ: 25 кореневих повідомлень. */
  readonly pageSize = 25;
  /** Загальна кількість root-коментарів у системі. */
  totalCount = 0;
  /** Поточне поле сортування root-коментарів. */
  sortBy: RootCommentsSortField = 'CreatedAtUtc';
  /** Поточний напрям сортування root-коментарів. */
  sortDirection: RootCommentsSortDirection = 'Desc';
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
  /** Кеш preview-вмісту text-вкладень за storagePath; значення може бути відсутнім до першого завантаження. */
  attachmentTextPreviewByPath: Record<string, string | undefined> = {};
  attachmentTextLoadingByPath = new Set<string>();
  activeReplyTarget: CommentNode | null = null;
  isReplyModalOpen = false;
  isCreateModalOpen = false;
  isReplySubmitting = false;
  replySubmitMessage = '';
  replySubmitValidationErrors: ReadonlyArray<UiValidationError> = [];
  replyShowRetryHint = false;
  replyCaptchaChallengeId = '';
  replyCaptchaImageDataUrl = '';
  replyCaptchaMessage = '';
  replyTextPreviewHtml = '';
  replyPreviewMessage = '';
  replyAttachmentMessage = '';
  replyAttachment: CreateCommentAttachmentRequest | null = null;
  replyAttachmentImagePreviewDataUrl = '';

  readonly createForm = this.formBuilder.nonNullable.group({
    userName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    homePage: ['', [Validators.pattern('https?://.+')]],
    text: ['', [Validators.required, Validators.maxLength(5000), xhtmlFragmentValidator()]],
    captchaAnswer: ['', [Validators.required]]
  });

  readonly replyForm = this.formBuilder.nonNullable.group({
    userName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    text: ['', [Validators.required, Validators.maxLength(5000), xhtmlFragmentValidator()]],
    captchaAnswer: ['', [Validators.required]]
  });

  /**
   * Повертає локалізоване повідомлення про помилки XHTML-валидації поля тексту.
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

  constructor() {
    this.setupServerValidationReset(this.createForm.controls.userName);
    this.setupServerValidationReset(this.createForm.controls.email);
    this.setupServerValidationReset(this.createForm.controls.homePage);
    this.setupServerValidationReset(this.createForm.controls.text);
    this.setupServerValidationReset(this.createForm.controls.captchaAnswer);
    this.setupServerValidationReset(this.replyForm.controls.userName);
    this.setupServerValidationReset(this.replyForm.controls.email);
    this.setupServerValidationReset(this.replyForm.controls.text);
    this.setupServerValidationReset(this.replyForm.controls.captchaAnswer);

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
   * Відкриває модальне вікно створення кореневого коментаря.
   */
  openCreateModal(): void {
    this.isCreateModalOpen = true;
    this.submitMessage = '';
    this.submitValidationErrors = [];
    this.showRetryHint = false;
    this.reloadCaptcha();
  }

  /**
   * Закриває модальне вікно створення кореневого коментаря.
   */
  closeCreateModal(): void {
    this.isCreateModalOpen = false;
  }

  /**
   * Завантажує сторінку кореневих коментарів.
   */
  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.loadCanRetry = false;

    this.commentsGraphqlApi.getRootComments(this.page, this.pageSize, this.sortBy, this.sortDirection).subscribe({
      next: (response) => {
        this.comments = response.items;
        this.totalCount = response.totalCount;
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


  /** Загальна кількість сторінок для кореневих коментарів. */
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  /**
   * Повертає true, якщо конкретне поле потрібно підсвітити червоним як помилкове.
   */
  shouldHighlightInvalid(control: AbstractControl | null): boolean {
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  /**
   * Повертає true, якщо форма містить blocking-помилки для submit.
   */
  hasBlockingErrors(form: { invalid: boolean }): boolean {
    return form.invalid;
  }

  /** Оновлює поле сортування і перезавантажує першу сторінку. */
  onSortByChanged(event: Event): void {
    const selected = (event.target as HTMLSelectElement).value as RootCommentsSortField;
    this.sortBy = selected;
    this.page = 1;
    this.load();
  }

  /** Оновлює напрям сортування і перезавантажує першу сторінку. */
  onSortDirectionChanged(event: Event): void {
    const selected = (event.target as HTMLSelectElement).value as RootCommentsSortDirection;
    this.sortDirection = selected;
    this.page = 1;
    this.load();
  }

  /** Переходить на попередню сторінку root-коментарів. */
  goToPreviousPage(): void {
    if (this.page <= 1) {
      return;
    }

    this.page -= 1;
    this.load();
  }

  /** Переходить на наступну сторінку root-коментарів. */
  goToNextPage(): void {
    if (this.page >= this.totalPages) {
      return;
    }

    this.page += 1;
    this.load();
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

    this.commentsGraphqlApi.previewComment(text).subscribe({
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
    this.processAttachmentSelection(
      event,
      (attachment) => {
        this.attachment = attachment;
      },
      (message) => {
        this.attachmentMessage = message;
      },
      (preview) => {
        this.attachmentImagePreviewDataUrl = preview;
      }
    );
  }


  /** Очищає вибране вкладення у формі створення кореневого коментаря. */
  clearCreateAttachment(): void {
    this.attachment = null;
    this.attachmentImagePreviewDataUrl = '';
    this.attachmentMessage = '';
  }

  /**
   * Додає HTML-тег у текстове поле з урахуванням поточного виділення користувача.
   */
  insertQuickTag(tag: 'i' | 'strong' | 'code' | 'a', textarea: HTMLTextAreaElement): void {
    this.insertTagIntoTextarea(tag, textarea, this.createForm.controls.text);
    this.previewText();
  }

  /**
   * Перезавантажує CAPTCHA для форми створення.
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

    this.commentsGraphqlApi
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
          this.isCreateModalOpen = false;
          this.load();
          this.reloadCaptcha();
          this.isSubmitting = false;
        },
        error: (error) => {
          const uiError = this.apiErrorPresenter.present(error, 'Не вдалося створити коментар. Перевірте дані форми.');
          this.submitMessage = uiError.summary;
          this.submitValidationErrors = uiError.validationErrors;
          this.showRetryHint = uiError.canRetry;
          this.applyServerValidationErrors(this.createForm.controls, uiError.validationErrors);
          this.reloadCaptcha();
          this.isSubmitting = false;
        }
      });
  }

  /**
   * Відкриває модальне вікно створення відповіді для вибраного коментаря.
   */
  openReplyModal(target: CommentNode): void {
    this.activeReplyTarget = target;
    this.isReplyModalOpen = true;
    this.isReplySubmitting = false;
    this.replySubmitMessage = '';
    this.replySubmitValidationErrors = [];
    this.replyShowRetryHint = false;
    this.replyTextPreviewHtml = '';
    this.replyPreviewMessage = '';
    this.replyAttachment = null;
    this.replyAttachmentMessage = '';
    this.replyAttachmentImagePreviewDataUrl = '';
    this.replyForm.reset({
      userName: this.createForm.controls.userName.value,
      email: this.createForm.controls.email.value,
      text: '',
      captchaAnswer: ''
    });
    this.reloadReplyCaptcha();
  }

  /**
   * Закриває модальне вікно створення відповіді.
   */
  closeReplyModal(): void {
    this.isReplyModalOpen = false;
    this.activeReplyTarget = null;
  }

  /**
   * Оновлює HTML preview для тексту відповіді з модального вікна.
   */
  previewReplyText(): void {
    const text = this.replyForm.controls.text.value;
    if (!text || !text.trim()) {
      this.replyTextPreviewHtml = '';
      this.replyPreviewMessage = '';
      return;
    }

    this.commentsGraphqlApi.previewComment(text).subscribe({
      next: (preview) => {
        this.replyTextPreviewHtml = preview;
        this.replyPreviewMessage = '';
      },
      error: () => {
        this.replyTextPreviewHtml = '';
        this.replyPreviewMessage = 'Preview тимчасово недоступний. Ви можете продовжити відправку відповіді без preview.';
      }
    });
  }

  /**
   * Додає HTML-тег у поле тексту відповіді модального вікна.
   */
  insertReplyQuickTag(tag: 'i' | 'strong' | 'code' | 'a', textarea: HTMLTextAreaElement): void {
    this.insertTagIntoTextarea(tag, textarea, this.replyForm.controls.text);
    this.previewReplyText();
  }

  /**
   * Валідовує та читає вкладення для reply-форми.
   */
  onReplyAttachmentSelected(event: Event): void {
    this.processAttachmentSelection(
      event,
      (attachment) => {
        this.replyAttachment = attachment;
      },
      (message) => {
        this.replyAttachmentMessage = message;
      },
      (preview) => {
        this.replyAttachmentImagePreviewDataUrl = preview;
      }
    );
  }


  /** Очищає вибране вкладення у формі створення відповіді. */
  clearReplyAttachment(): void {
    this.replyAttachment = null;
    this.replyAttachmentImagePreviewDataUrl = '';
    this.replyAttachmentMessage = '';
  }

  /**
   * Перезавантажує CAPTCHA для модального вікна відповіді.
   */
  reloadReplyCaptcha(): void {
    this.replyCaptchaMessage = '';

    this.commentsGraphqlApi.getCaptcha().subscribe({
      next: (response) => {
        this.replyCaptchaChallengeId = response.challengeId;
        this.replyCaptchaImageDataUrl = `data:${response.mimeType};base64,${response.imageBase64}`;
      },
      error: (error) => {
        const uiError = this.apiErrorPresenter.present(error, 'Не вдалося завантажити CAPTCHA для відповіді.');
        this.replyCaptchaMessage = uiError.summary;
      }
    });
  }

  /**
   * Надсилає створення відповіді на обраний коментар.
   */
  submitReplyComment(): void {
    if (this.replyForm.invalid || !this.activeReplyTarget || !this.replyCaptchaChallengeId) {
      return;
    }

    this.isReplySubmitting = true;
    this.replySubmitMessage = '';
    this.replySubmitValidationErrors = [];
    this.replyShowRetryHint = false;

    const raw = this.replyForm.getRawValue();

    this.commentsGraphqlApi
      .createComment({
        userName: raw.userName,
        email: raw.email,
        homePage: null,
        text: raw.text,
        parentId: this.activeReplyTarget.id,
        captchaToken: `${this.replyCaptchaChallengeId}:${raw.captchaAnswer}`,
        attachment: this.replyAttachment
      })
      .subscribe({
        next: () => {
          this.replySubmitMessage = 'Коментар успішно створено.';
          this.closeReplyModal();
          this.load();
          this.isReplySubmitting = false;
        },
        error: (error) => {
          const uiError = this.apiErrorPresenter.present(error, 'Не вдалося створити відповідь. Перевірте дані форми.');
          this.replySubmitMessage = uiError.summary;
          this.replySubmitValidationErrors = uiError.validationErrors;
          this.replyShowRetryHint = uiError.canRetry;
          this.applyServerValidationErrors(this.replyForm.controls, uiError.validationErrors);
          this.reloadReplyCaptcha();
          this.isReplySubmitting = false;
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
   * Універсально вставляє HTML-теги у textarea та синхронізує FormControl.
   */
  private insertTagIntoTextarea(
    tag: 'i' | 'strong' | 'code' | 'a',
    textarea: HTMLTextAreaElement,
    control: { setValue: (value: string) => void }
  ): void {
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
    control.setValue(updatedText);
    textarea.focus();
    textarea.setSelectionRange(caretPosition, caretPosition);
  }

  /**
   * Валідовує вкладення, читає його як DataURL та повертає в callback-и.
   */
  private processAttachmentSelection(
    event: Event,
    setAttachment: (attachment: CreateCommentAttachmentRequest | null) => void,
    setMessage: (message: string) => void,
    setPreview: (preview: string) => void
  ): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    setAttachment(null);
    setMessage('');
    setPreview('');

    if (!file) {
      return;
    }

    if (file.size > 1_000_000) {
      setMessage('Файл перевищує 1MB.');
      input.value = '';
      return;
    }

    const allowedContentTypes = ['image/png', 'image/jpeg', 'image/gif', 'text/plain'];
    if (!allowedContentTypes.includes(file.type)) {
      setMessage('Недозволений тип вкладення.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        setMessage('Не вдалося прочитати файл.');
        return;
      }

      const base64Content = result.includes(',') ? result.split(',')[1] : result;
      setAttachment({
        fileName: file.name,
        contentType: file.type,
        base64Content
      });
      setPreview(file.type.startsWith('image/') ? result : '');
      setMessage(`Вкладення готове: ${file.name}`);
    };
    reader.readAsDataURL(file);
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
   * Повертає FormControl для заданого server-side поля, якщо мапінг відомий.
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
      'request.homepage': 'homePage',
      homepage: 'homePage',
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
   * Автоматично очищає server-помилку конкретного поля при зміні його значення.
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
      this.signalRStatusMessage = 'Realtime недоступний. Дані оновлюються автоматично після створення коментарів.';
    });

    void this.signalRConnection
      .start()
      .then(() => {
        this.signalRStatusMessage = '';
      })
      .catch(() => {
        this.signalRStatusMessage = 'Realtime недоступний. Дані оновлюються автоматично після створення коментарів.';
      });
  }
}
