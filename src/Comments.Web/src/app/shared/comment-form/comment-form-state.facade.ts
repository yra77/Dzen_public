import { UiValidationError } from '../../core/api-error-presenter.service';
import { CommentFormPreviewState, createInitialCommentFormPreviewState } from './comment-form-preview-state';
import { CommentFormSubmitState, createInitialCommentFormSubmitState } from './comment-form-submit-state';
import {
  CommentFormCaptchaState,
  CommentFormModalState,
  createClosedCommentFormModalState,
  createInitialCommentFormCaptchaState
} from './comment-form-ui-state';

/**
 * Shared facade для зберігання та синхронного оновлення UI-станів create/reply форм.
 */
export class CommentFormStateFacade {
  private submitState: CommentFormSubmitState = createInitialCommentFormSubmitState();
  private previewState: CommentFormPreviewState = createInitialCommentFormPreviewState();
  private captchaState: CommentFormCaptchaState = createInitialCommentFormCaptchaState();
  private modalState: CommentFormModalState = createClosedCommentFormModalState();

  /** Оновлює submit-стан форми. */
  setSubmitState(state: CommentFormSubmitState): void {
    this.submitState = state;
  }

  /** Повертає submit-індикатор для блокування кнопок/закриття модалки. */
  get isSubmitting(): boolean {
    return this.submitState.isSubmitting;
  }

  /** Повертає повідомлення submit-операції. */
  get submitMessage(): string {
    return this.submitState.message;
  }

  /** Повертає normalized validation-помилки submit-операції. */
  get submitValidationErrors(): ReadonlyArray<UiValidationError> {
    return this.submitState.validationErrors;
  }

  /** Повертає ознаку показу retry-підказки після submit-помилки. */
  get showRetryHint(): boolean {
    return this.submitState.showRetryHint;
  }

  /** Оновлює preview-стан форми. */
  setPreviewState(state: CommentFormPreviewState): void {
    this.previewState = state;
  }

  /** Повертає HTML preview. */
  get previewHtml(): string {
    return this.previewState.html;
  }

  /** Повертає текст fallback-повідомлення для preview. */
  get previewMessage(): string {
    return this.previewState.message;
  }

  /** Оновлює CAPTCHA-стан форми. */
  setCaptchaState(state: CommentFormCaptchaState): void {
    this.captchaState = state;
  }

  /** Повертає challenge id CAPTCHA. */
  get captchaChallengeId(): string {
    return this.captchaState.challengeId;
  }

  /** Повертає DataURL CAPTCHA-зображення. */
  get captchaImageDataUrl(): string {
    return this.captchaState.imageDataUrl;
  }

  /** Повертає статусне/помилкове повідомлення CAPTCHA. */
  get captchaMessage(): string {
    return this.captchaState.message;
  }

  /** Оновлює стан відкриття/закриття модалки. */
  setModalState(state: CommentFormModalState): void {
    this.modalState = state;
  }

  /** Повертає true, якщо модалка форми відкрита. */
  get isModalOpen(): boolean {
    return this.modalState.isOpen;
  }
}