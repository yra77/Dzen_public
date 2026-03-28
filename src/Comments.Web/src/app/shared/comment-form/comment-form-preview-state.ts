/**
 * Уніфікований preview-стан форми коментаря (create/reply).
 */
export interface CommentFormPreviewState {
  /** HTML, повернений backend preview-сервісом. */
  html: string;
  /** Людинозрозуміле повідомлення про fallback, коли preview недоступний. */
  message: string;
}

/**
 * Повертає початковий preview-стан без контенту та помилки.
 */
export function createInitialCommentFormPreviewState(): CommentFormPreviewState {
  return {
    html: '',
    message: ''
  };
}

/**
 * Повертає preview-стан після успішного рендерингу XHTML-фрагмента.
 */
export function createResolvedCommentFormPreviewState(html: string): CommentFormPreviewState {
  return {
    html,
    message: ''
  };
}

/**
 * Повертає preview-стан для fallback-сценарію, коли preview недоступний.
 */
export function createUnavailableCommentFormPreviewState(message: string): CommentFormPreviewState {
  return {
    html: '',
    message
  };
}