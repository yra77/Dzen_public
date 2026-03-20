/**
 * UI-стан CAPTCHA для create/reply форми.
 */
export interface CommentFormCaptchaState {
  /** Ідентифікатор challenge, який повернув backend. */
  challengeId: string;
  /** Data URL із зображенням CAPTCHA. */
  imageDataUrl: string;
  /** Помилка завантаження CAPTCHA або порожній рядок. */
  message: string;
}

/**
 * Повертає початковий CAPTCHA-стан без challenge і повідомлень.
 */
export function createInitialCommentFormCaptchaState(): CommentFormCaptchaState {
  return {
    challengeId: '',
    imageDataUrl: '',
    message: ''
  };
}

/**
 * Повертає CAPTCHA-стан після успішного завантаження challenge.
 */
export function createResolvedCommentFormCaptchaState(challengeId: string, imageDataUrl: string): CommentFormCaptchaState {
  return {
    challengeId,
    imageDataUrl,
    message: ''
  };
}

/**
 * Повертає CAPTCHA-стан з помилкою завантаження.
 */
export function createFailedCommentFormCaptchaState(message: string): CommentFormCaptchaState {
  return {
    challengeId: '',
    imageDataUrl: '',
    message
  };
}

/**
 * UI-стан видимості модального вікна.
 */
export interface CommentFormModalState {
  /** Чи відкрите модальне вікно. */
  isOpen: boolean;
}

/**
 * Повертає стан закритої модалки.
 */
export function createClosedCommentFormModalState(): CommentFormModalState {
  return {
    isOpen: false
  };
}

/**
 * Повертає стан відкритої модалки.
 */
export function createOpenedCommentFormModalState(): CommentFormModalState {
  return {
    isOpen: true
  };
}
