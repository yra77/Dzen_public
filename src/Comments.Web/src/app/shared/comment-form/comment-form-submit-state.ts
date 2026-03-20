import { UiValidationError } from '../../core/api-error-presenter.service';

/**
 * Уніфікований submit-стан форми create/reply для сторінок list/thread.
 */
export interface CommentFormSubmitState {
  /** Ознака активного submit-запиту. */
  isSubmitting: boolean;
  /** Людинозрозуміле повідомлення про результат submit-операції. */
  message: string;
  /** Нормалізований список validation-помилок для відображення у UI. */
  validationErrors: ReadonlyArray<UiValidationError>;
  /** Прапорець показу підказки "спробуйте ще раз". */
  showRetryHint: boolean;
}

/**
 * Повертає початковий submit-стан форми без активного запиту та помилок.
 */
export function createInitialCommentFormSubmitState(): CommentFormSubmitState {
  return {
    isSubmitting: false,
    message: '',
    validationErrors: [],
    showRetryHint: false
  };
}

/**
 * Повертає стан форми на момент старту submit-запиту.
 */
export function createSubmittingCommentFormState(): CommentFormSubmitState {
  return {
    isSubmitting: true,
    message: '',
    validationErrors: [],
    showRetryHint: false
  };
}

/**
 * Повертає стан форми після помилки submit-запиту.
 */
export function createFailedCommentFormState(
  message: string,
  validationErrors: ReadonlyArray<UiValidationError>,
  showRetryHint: boolean
): CommentFormSubmitState {
  return {
    isSubmitting: false,
    message,
    validationErrors,
    showRetryHint
  };
}

/**
 * Повертає стан форми після успішного submit-запиту.
 */
export function createSucceededCommentFormState(message: string): CommentFormSubmitState {
  return {
    isSubmitting: false,
    message,
    validationErrors: [],
    showRetryHint: false
  };
}
