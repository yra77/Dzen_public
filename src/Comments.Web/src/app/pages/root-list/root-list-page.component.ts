import { Component, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

import {
  CommentNode,
  PagedCommentsResponse,
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
import { CommentFormAttachmentState } from '../../shared/comment-form/comment-form-attachment-state';
import { CommentQueryStateStream } from '../../shared/comment-query-state/comment-query-state.stream';
import { mergeCommentIntoRootPage } from '../../shared/comment-realtime/comment-realtime-merge';


@Component({
  selector: 'app-root-list-page',
  // Тримаймо лише фактично використані standalone-імпорти без зайвих пайпів.
  imports: [ReactiveFormsModule, CommentTreeComponent, FormSubmitFeedbackComponent, CommentAttachmentPickerComponent, CaptchaInputComponent, CommentAuthorTextFieldsComponent, CommentModalHeaderComponent, CommentFormActionsComponent, CommentModalLayoutComponent],
  template: `
    <section class="panel">
      <button class="btn-answer" type="button" (click)="openCreateModal()" data-testid="root-open-create-modal-button">Коментувати</button>
      @if (signalRStatusMessage) {
        <p class="meta">{{ signalRStatusMessage }}</p>
      }
      <div class="list-controls">
        <label>
          Пошук
          <input
            type="search"
            [value]="searchQuery"
            (input)="onSearchQueryChanged($event)"
            (keydown.enter)="onSearchSubmitted()"
            placeholder="Текст, email або ім'я автора"
            data-testid="root-search-input" />
        </label>
        <button type="button" (click)="onSearchSubmitted()" [disabled]="isLoading" data-testid="root-search-submit">Шукати</button>
        <button type="button" (click)="clearSearch()" [disabled]="isLoading || !searchQuery.trim()" data-testid="root-search-reset">Скинути пошук</button>

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
        <app-comment-modal-layout
          layoutTestId="root-create-modal-layout"
          backdropTestId="root-create-modal-backdrop"
          panelTestId="root-create-modal-panel"
          [closeMode]="isSubmitting ? 'disabled' : 'always'"
          (closeRequested)="onCreateModalCloseRequested($event)">
            <app-comment-modal-header title="Новий коментар" (closeClicked)="onCreateModalCloseRequested($event)" />
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
        </app-comment-modal-layout>
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
          <app-comment-modal-layout
            layoutTestId="root-reply-modal-layout"
            backdropTestId="root-reply-modal-backdrop"
            panelTestId="root-reply-modal-panel"
            [closeMode]="isReplySubmitting ? 'disabled' : 'always'"
            (closeRequested)="onReplyModalCloseRequested($event)">
              <app-comment-modal-header title="Нова відповідь" (closeClicked)="onReplyModalCloseRequested($event)" />
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
          </app-comment-modal-layout>
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
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  private signalRConnection: HubConnection | null = null;
  /** Підписка на shared load-state stream root/list сценарію. */
  private readonly rootListLoadStateSubscription: Subscription;
  /** Debounced-підписка для зміни тексту пошуку без зайвого API-spam на кожен символ. */
  private readonly searchInputSubscription: Subscription;
  /** Subject для debounce-потоку зміни пошуку. */
  private readonly searchInputChanges = new Subject<string>();
  /** Shared RxJS stream для list/search-state (loading/error/data) у list/search/realtime сценаріях. */
  private readonly rootListLoadStateStream = new CommentQueryStateStream<{
    page: number;
    pageSize: number;
    sortBy: RootCommentsSortField;
    sortDirection: RootCommentsSortDirection;
    searchQuery: string;
  }, PagedCommentsResponse>(
    (request) => request.searchQuery
      ? this.commentsGraphqlApi.searchComments(request.searchQuery, request.page, request.pageSize)
      : this.commentsGraphqlApi.getRootComments(request.page, request.pageSize, request.sortBy, request.sortDirection),
    (error) => this.apiErrorPresenter.present(error, 'Не вдалося завантажити коментарі.'),
    // Для list/search дозволяємо короткий auto-retry лише на тимчасових збоях мережі.
    { autoRetryCount: 2, autoRetryBaseDelayMs: 600 }
  );

  /** Мапінг server-side полів на FormControl для root/create форми. */
  private readonly createFormServerFieldMapping: ServerFieldControlMapping = {
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

  /** Мапінг server-side полів на FormControl для reply форми без homePage. */
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
  /** Поточний текст пошуку для режиму search/list. */
  searchQuery = '';
  isLoading = false;
  errorMessage = '';
  /** Прапорець для показу підказки щодо повторної спроби завантаження. */
  loadCanRetry = false;
  /** Shared facade для create-форми: submit/preview/captcha/modal стани. */
  private readonly createFormState = new CommentFormStateFacade();
  /** Поточний статус realtime-з'єднання SignalR. */
  signalRStatusMessage = '';
  /** Shared state вкладення create-форми (payload + message + image preview). */
  private readonly createAttachmentState = new CommentFormAttachmentState();
  /** Кеш preview-вмісту text-вкладень за storagePath; значення може бути відсутнім до першого завантаження. */
  attachmentTextPreviewByPath: Record<string, string | undefined> = {};
  attachmentTextLoadingByPath = new Set<string>();
  activeReplyTarget: CommentNode | null = null;
  /** Shared facade для reply-форми: submit/preview/captcha/modal стани. */
  private readonly replyFormState = new CommentFormStateFacade();
  /** Shared state вкладення reply-форми (payload + message + image preview). */
  private readonly replyAttachmentState = new CommentFormAttachmentState();

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
    setupServerValidationReset(this.createForm.controls.userName);
    setupServerValidationReset(this.createForm.controls.email);
    setupServerValidationReset(this.createForm.controls.homePage);
    setupServerValidationReset(this.createForm.controls.text);
    setupServerValidationReset(this.createForm.controls.captchaAnswer);
    setupServerValidationReset(this.replyForm.controls.userName);
    setupServerValidationReset(this.replyForm.controls.email);
    setupServerValidationReset(this.replyForm.controls.text);
    setupServerValidationReset(this.replyForm.controls.captchaAnswer);

    this.createFormState.setSubmitState(createInitialCommentFormSubmitState());
    this.createFormState.setPreviewState(createInitialCommentFormPreviewState());
    this.createFormState.setCaptchaState(createInitialCommentFormCaptchaState());
    this.createFormState.setModalState(createClosedCommentFormModalState());
    this.replyFormState.setSubmitState(createInitialCommentFormSubmitState());
    this.replyFormState.setPreviewState(createInitialCommentFormPreviewState());
    this.replyFormState.setCaptchaState(createInitialCommentFormCaptchaState());
    this.replyFormState.setModalState(createClosedCommentFormModalState());

    this.rootListLoadStateSubscription = this.rootListLoadStateStream.subscribe((state) => {
      this.isLoading = state.isLoading;
      this.errorMessage = state.errorMessage;
      this.loadCanRetry = state.canRetry;

      if (state.data) {
        this.comments = state.data.items;
        this.totalCount = state.data.totalCount;
      }
    });

    this.searchInputSubscription = this.searchInputChanges
      .pipe(
        debounceTime(350),
        distinctUntilChanged()
      )
      .subscribe((query) => {
        this.searchQuery = query;
        this.page = 1;
        this.load();
      });

    this.hydrateListStateFromUrl();
    this.load();
    this.reloadCaptcha();
    this.initializeSignalR();
  }

  /** Прапорець видимості create-модалки для template. */
  get isCreateModalOpen(): boolean {
    return this.createFormState.isModalOpen;
  }

  /** Прапорець видимості reply-модалки для template. */
  get isReplyModalOpen(): boolean {
    return this.replyFormState.isModalOpen;
  }

  /** Прапорець активного submit у create-формі. */
  get isSubmitting(): boolean {
    return this.createFormState.isSubmitting;
  }

  /** Повідомлення submit-операції create-форми. */
  get submitMessage(): string {
    return this.createFormState.submitMessage;
  }

  /** Нормалізовані validation-помилки submit-операції create-форми. */
  get submitValidationErrors(): ReadonlyArray<UiValidationError> {
    return this.createFormState.submitValidationErrors;
  }

  /** Показувати чи ні retry-підказку для create submit. */
  get showRetryHint(): boolean {
    return this.createFormState.showRetryHint;
  }

  /** HTML preview поточного тексту create-форми. */
  get textPreviewHtml(): string {
    return this.createFormState.previewHtml;
  }

  /** Повідомлення про fallback-стан preview у create-формі. */
  get previewMessage(): string {
    return this.createFormState.previewMessage;
  }

  /** Активний challenge id CAPTCHA для create-форми. */
  get captchaChallengeId(): string {
    return this.createFormState.captchaChallengeId;
  }

  /** Data URL CAPTCHA для create-форми. */
  get captchaImageDataUrl(): string {
    return this.createFormState.captchaImageDataUrl;
  }

  /** Повідомлення про стан CAPTCHA для create-форми. */
  get captchaMessage(): string {
    return this.createFormState.captchaMessage;
  }

  /** Повідомлення стану вкладення create-форми для attachment picker. */
  get attachmentMessage(): string {
    return this.createAttachmentState.statusMessage;
  }

  /** Data URL preview вибраного зображення create-форми. */
  get attachmentImagePreviewDataUrl(): string {
    return this.createAttachmentState.previewDataUrl;
  }

  /** Прапорець активного submit у reply-формі. */
  get isReplySubmitting(): boolean {
    return this.replyFormState.isSubmitting;
  }

  /** Повідомлення submit-операції reply-форми. */
  get replySubmitMessage(): string {
    return this.replyFormState.submitMessage;
  }

  /** Нормалізовані validation-помилки submit-операції reply-форми. */
  get replySubmitValidationErrors(): ReadonlyArray<UiValidationError> {
    return this.replyFormState.submitValidationErrors;
  }

  /** Показувати чи ні retry-підказку для reply submit. */
  get replyShowRetryHint(): boolean {
    return this.replyFormState.showRetryHint;
  }

  /** HTML preview поточного тексту reply-форми. */
  get replyTextPreviewHtml(): string {
    return this.replyFormState.previewHtml;
  }

  /** Повідомлення про fallback-стан preview у reply-формі. */
  get replyPreviewMessage(): string {
    return this.replyFormState.previewMessage;
  }

  /** Активний challenge id CAPTCHA для reply-форми. */
  get replyCaptchaChallengeId(): string {
    return this.replyFormState.captchaChallengeId;
  }

  /** Data URL CAPTCHA для reply-форми. */
  get replyCaptchaImageDataUrl(): string {
    return this.replyFormState.captchaImageDataUrl;
  }

  /** Повідомлення про стан CAPTCHA для reply-форми. */
  get replyCaptchaMessage(): string {
    return this.replyFormState.captchaMessage;
  }

  /** Повідомлення стану вкладення reply-форми для attachment picker. */
  get replyAttachmentMessage(): string {
    return this.replyAttachmentState.statusMessage;
  }

  /** Data URL preview вибраного зображення reply-форми. */
  get replyAttachmentImagePreviewDataUrl(): string {
    return this.replyAttachmentState.previewDataUrl;
  }

  /**
   * Коректно завершує SignalR-з'єднання при знищенні компонента.
   */
  ngOnDestroy(): void {
    this.rootListLoadStateSubscription.unsubscribe();
    this.searchInputSubscription.unsubscribe();
    this.rootListLoadStateStream.destroy();

    if (this.signalRConnection) {
      void this.signalRConnection.stop();
    }
  }


  /**
   * Відкриває модальне вікно створення кореневого коментаря.
   */
  openCreateModal(): void {
    this.setCreateModalState(createOpenedCommentFormModalState());
    this.setCreateSubmitState(createInitialCommentFormSubmitState());
    this.reloadCaptcha();
  }

  /**
   * Централізовано обробляє запити на закриття create-модалки.
   */
  onCreateModalCloseRequested(reason: ModalCloseReason): void {
    this.closeCreateModal(reason);
  }

  /**
   * Закриває модальне вікно створення кореневого коментаря.
   */
  closeCreateModal(reason: ModalCloseReason = 'backdrop', force = false): void {
    if (!canCloseModal(this.isSubmitting, reason, force)) {
      return;
    }

    this.setCreateModalState(createClosedCommentFormModalState());
  }

  /**
   * Завантажує сторінку кореневих коментарів.
   */
  load(): void {
    this.syncUrlWithCurrentListState();
    this.rootListLoadStateStream.reload({
      page: this.page,
      pageSize: this.pageSize,
      sortBy: this.sortBy,
      sortDirection: this.sortDirection,
      searchQuery: this.searchQuery.trim()
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

  /** Оновлює локальний текст пошуку без зайвих API-запитів на кожен символ. */
  onSearchQueryChanged(event: Event): void {
    const nextQuery = (event.target as HTMLInputElement).value;
    this.searchQuery = nextQuery;
    this.searchInputChanges.next(nextQuery);
  }

  /** Запускає пошук (або повернення в list-mode, якщо запит порожній). */
  onSearchSubmitted(): void {
    const normalizedQuery = this.searchQuery.trim();
    this.searchQuery = normalizedQuery;
    this.page = 1;
    this.load();
  }

  /** Скидає пошук і завантажує стандартний список кореневих коментарів. */
  clearSearch(): void {
    this.searchInputChanges.next('');
    this.searchQuery = '';
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
    refreshCommentPreview({
      text: this.createForm.controls.text.value,
      requestPreview: (text) => this.commentsGraphqlApi.previewComment(text),
      setPreviewState: (state) => this.setCreatePreviewState(state),
      unavailableMessage: 'Preview тимчасово недоступний. Ви можете продовжити відправку коментаря без preview.'
    });
  }

  /**
   * Валідовує і читає вкладення користувача у base64-представлення.
   */
  async onAttachmentSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.createAttachmentState.reset();

    if (!file) {
      return;
    }

    // Використовуємо shared helper, щоб не дублювати валідацію/читання вкладень між list/thread сценаріями.
    const readResult = await readAttachmentAsRequest(file);
    this.createAttachmentState.applyReadResult(readResult);

    if (!readResult.attachment) {
      input.value = '';
    }
  }


  /** Очищає вибране вкладення у формі створення кореневого коментаря. */
  clearCreateAttachment(): void {
    this.createAttachmentState.reset();
  }

  /**
   * Додає HTML-тег у текстове поле з урахуванням поточного виділення користувача.
   */
  insertQuickTag(tag: 'i' | 'strong' | 'code' | 'a', textarea: HTMLTextAreaElement): void {
    const quickTagInsertResult = buildQuickTagInsertResult(tag, textarea);
    this.createForm.controls.text.setValue(quickTagInsertResult.updatedText);
    textarea.focus();
    textarea.setSelectionRange(quickTagInsertResult.caretPosition, quickTagInsertResult.caretPosition);
    this.previewText();
  }

  /**
   * Перезавантажує CAPTCHA для форми створення.
   */
  reloadCaptcha(): void {
    reloadCommentCaptcha({
      requestCaptcha: () => this.commentsGraphqlApi.getCaptcha(),
      setCaptchaState: (state) => this.setCreateCaptchaState(state),
      resolveErrorMessage: (error) => this.apiErrorPresenter.present(error, 'Не вдалося завантажити CAPTCHA.').summary
    });
  }

  /**
   * Надсилає створення кореневого коментаря через REST API.
   */
  submitComment(): void {
    if (this.createForm.invalid || !this.captchaChallengeId) {
      return;
    }

    const raw = this.createForm.getRawValue();
    runCommentSubmitWorkflow({
      submitRequest: () => this.commentsGraphqlApi.createComment({
        userName: raw.userName,
        email: raw.email,
        homePage: raw.homePage.trim() ? raw.homePage : null,
        text: raw.text,
        parentId: null,
        captchaToken: `${this.captchaChallengeId}:${raw.captchaAnswer}`,
        attachment: this.createAttachmentState.value
      }),
      setSubmitState: (state) => this.setCreateSubmitState(state),
      successMessage: 'Коментар успішно створено.',
      onSuccess: () => {
        this.createForm.reset({
          userName: raw.userName,
          email: raw.email,
          homePage: raw.homePage,
          text: '',
          captchaAnswer: ''
        });
        this.setCreatePreviewState(createInitialCommentFormPreviewState());
        this.createAttachmentState.reset();
        this.closeCreateModal('backdrop', true);
        this.load();
        this.reloadCaptcha();
      },
      presentError: (error) => this.apiErrorPresenter.present(error, 'Не вдалося створити коментар. Перевірте дані форми.'),
      applyServerValidationErrors: (validationErrors) => {
        applyServerValidationErrorsToControls(this.createForm.controls, validationErrors, this.createFormServerFieldMapping);
      },
      onAfterError: () => this.reloadCaptcha()
    });
  }

  /**
   * Відкриває модальне вікно створення відповіді для вибраного коментаря.
   */
  openReplyModal(target: CommentNode): void {
    this.activeReplyTarget = target;
    this.setReplyModalState(createOpenedCommentFormModalState());
    this.setReplySubmitState(createInitialCommentFormSubmitState());
    this.setReplyPreviewState(createInitialCommentFormPreviewState());
    this.replyAttachmentState.reset();
    this.replyForm.reset({
      userName: this.createForm.controls.userName.value,
      email: this.createForm.controls.email.value,
      text: '',
      captchaAnswer: ''
    });
    this.reloadReplyCaptcha();
  }

  /**
   * Централізовано обробляє запити на закриття reply-модалки.
   */
  onReplyModalCloseRequested(reason: ModalCloseReason): void {
    this.closeReplyModal(reason);
  }

  /**
   * Закриває модальне вікно створення відповіді.
   */
  closeReplyModal(reason: ModalCloseReason = 'backdrop', force = false): void {
    if (!canCloseModal(this.isReplySubmitting, reason, force)) {
      return;
    }

    this.setReplyModalState(createClosedCommentFormModalState());
    this.activeReplyTarget = null;
  }

  /**
   * Оновлює HTML preview для тексту відповіді з модального вікна.
   */
  previewReplyText(): void {
    refreshCommentPreview({
      text: this.replyForm.controls.text.value,
      requestPreview: (text) => this.commentsGraphqlApi.previewComment(text),
      setPreviewState: (state) => this.setReplyPreviewState(state),
      unavailableMessage: 'Preview тимчасово недоступний. Ви можете продовжити відправку відповіді без preview.'
    });
  }

  /**
   * Додає HTML-тег у поле тексту відповіді модального вікна.
   */
  insertReplyQuickTag(tag: 'i' | 'strong' | 'code' | 'a', textarea: HTMLTextAreaElement): void {
    const quickTagInsertResult = buildQuickTagInsertResult(tag, textarea);
    this.replyForm.controls.text.setValue(quickTagInsertResult.updatedText);
    textarea.focus();
    textarea.setSelectionRange(quickTagInsertResult.caretPosition, quickTagInsertResult.caretPosition);
    this.previewReplyText();
  }

  /**
   * Валідовує та читає вкладення для reply-форми.
   */
  async onReplyAttachmentSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.replyAttachmentState.reset();

    if (!file) {
      return;
    }

    // Shared helper тримає однакові правила attachment для форми root-коментаря та reply-коментаря.
    const readResult = await readAttachmentAsRequest(file);
    this.replyAttachmentState.applyReadResult(readResult);

    if (!readResult.attachment) {
      input.value = '';
    }
  }


  /** Очищає вибране вкладення у формі створення відповіді. */
  clearReplyAttachment(): void {
    this.replyAttachmentState.reset();
  }

  /**
   * Перезавантажує CAPTCHA для модального вікна відповіді.
   */
  reloadReplyCaptcha(): void {
    reloadCommentCaptcha({
      requestCaptcha: () => this.commentsGraphqlApi.getCaptcha(),
      setCaptchaState: (state) => this.setReplyCaptchaState(state),
      resolveErrorMessage: (error) => this.apiErrorPresenter.present(error, 'Не вдалося завантажити CAPTCHA для відповіді.').summary
    });
  }

  /**
   * Надсилає створення відповіді на обраний коментар.
   */
  submitReplyComment(): void {
    if (this.replyForm.invalid || !this.activeReplyTarget || !this.replyCaptchaChallengeId) {
      return;
    }

    const replyTarget = this.activeReplyTarget;
    const raw = this.replyForm.getRawValue();
    runCommentSubmitWorkflow({
      submitRequest: () => this.commentsGraphqlApi.createComment({
        userName: raw.userName,
        email: raw.email,
        homePage: null,
        text: raw.text,
        parentId: replyTarget.id,
        captchaToken: `${this.replyCaptchaChallengeId}:${raw.captchaAnswer}`,
        attachment: this.replyAttachmentState.value
      }),
      setSubmitState: (state) => this.setReplySubmitState(state),
      successMessage: 'Коментар успішно створено.',
      onSuccess: () => {
        this.closeReplyModal('backdrop', true);
        this.load();
      },
      presentError: (error) => this.apiErrorPresenter.present(error, 'Не вдалося створити відповідь. Перевірте дані форми.'),
      applyServerValidationErrors: (validationErrors) => {
        applyServerValidationErrorsToControls(this.replyForm.controls, validationErrors, this.replyFormServerFieldMapping);
      },
      onAfterError: () => this.reloadReplyCaptcha()
    });
  }

  /**
   * Проксі-оновлення submit-стану create-форми через shared facade.
   */
  private setCreateSubmitState(state: ReturnType<typeof createInitialCommentFormSubmitState>): void {
    this.createFormState.setSubmitState(state);
  }

  /**
   * Проксі-оновлення submit-стану reply-форми через shared facade.
   */
  private setReplySubmitState(state: ReturnType<typeof createInitialCommentFormSubmitState>): void {
    this.replyFormState.setSubmitState(state);
  }

  /**
   * Проксі-оновлення preview-стану create-форми через shared facade.
   */
  private setCreatePreviewState(state: ReturnType<typeof createInitialCommentFormPreviewState>): void {
    this.createFormState.setPreviewState(state);
  }

  /**
   * Проксі-оновлення preview-стану reply-форми через shared facade.
   */
  private setReplyPreviewState(state: ReturnType<typeof createInitialCommentFormPreviewState>): void {
    this.replyFormState.setPreviewState(state);
  }

  /**
   * Проксі-оновлення UI-стану видимості create-модалки.
   */
  private setCreateModalState(state: ReturnType<typeof createClosedCommentFormModalState>): void {
    this.createFormState.setModalState(state);
  }

  /**
   * Проксі-оновлення UI-стану видимості reply-модалки.
   */
  private setReplyModalState(state: ReturnType<typeof createClosedCommentFormModalState>): void {
    this.replyFormState.setModalState(state);
  }

  /**
   * Проксі-оновлення CAPTCHA-стану create-форми.
   */
  private setCreateCaptchaState(state: ReturnType<typeof createInitialCommentFormCaptchaState>): void {
    this.createFormState.setCaptchaState(state);
  }

  /**
   * Проксі-оновлення CAPTCHA-стану reply-форми.
   */
  private setReplyCaptchaState(state: ReturnType<typeof createInitialCommentFormCaptchaState>): void {
    this.replyFormState.setCaptchaState(state);
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
   * Ініціалізує SignalR-підписку з локальним realtime merge; fallback — повний reload.
   */
  private initializeSignalR(): void {
    this.signalRConnection = new HubConnectionBuilder()
      .withUrl(`${environment.apiBaseUrl}/hubs/comments`)
      .withAutomaticReconnect()
      .build();

    this.signalRConnection.on('commentCreated', (incomingComment: CommentNode) => {
      if (this.searchQuery.trim()) {
        // У search-mode безпечніше виконати reload, бо склад фільтрованої видачі може змінитися неочевидно.
        this.load();
        return;
      }

      let wasMerged = false;

      this.rootListLoadStateStream.mutateData((currentData) => {
        if (!currentData) {
          return currentData;
        }

        const mergeResult = mergeCommentIntoRootPage(currentData, incomingComment, this.page, this.sortBy, this.sortDirection);
        wasMerged = mergeResult.wasMerged;
        return mergeResult.data;
      });

      if (!wasMerged) {
        this.load();
      }
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

  /**
   * Ініціалізує list/search/sort/page стан із URL query params під час першого відкриття сторінки.
   */
  private hydrateListStateFromUrl(): void {
    const queryParams = this.activatedRoute.snapshot.queryParamMap;
    const pageFromUrl = Number.parseInt(queryParams.get('page') ?? '', 10);
    const sortByFromUrl = queryParams.get('sortBy');
    const sortDirectionFromUrl = queryParams.get('sortDirection');
    const queryFromUrl = queryParams.get('query');

    if (Number.isInteger(pageFromUrl) && pageFromUrl > 0) {
      this.page = pageFromUrl;
    }

    if (sortByFromUrl === 'CreatedAtUtc' || sortByFromUrl === 'UserName' || sortByFromUrl === 'Email') {
      this.sortBy = sortByFromUrl;
    }

    if (sortDirectionFromUrl === 'Asc' || sortDirectionFromUrl === 'Desc') {
      this.sortDirection = sortDirectionFromUrl;
    }

    if (typeof queryFromUrl === 'string') {
      this.searchQuery = queryFromUrl.trim();
    }
  }

  /**
   * Синхронізує поточний list/search/sort/page стан у query params для reload/back-forward навігації.
   */
  private syncUrlWithCurrentListState(): void {
    void this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {
        page: this.page > 1 ? this.page : null,
        sortBy: this.sortBy !== 'CreatedAtUtc' ? this.sortBy : null,
        sortDirection: this.sortDirection !== 'Desc' ? this.sortDirection : null,
        query: this.searchQuery.trim() ? this.searchQuery.trim() : null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }
}
