import { CaptchaImageResponse, CreateCommentAttachmentRequest } from '../../core/comments.models';
import { UiValidationError } from '../../core/api-error-presenter.service';
import { Observable } from 'rxjs';
import {
  CommentFormPreviewState,
  createInitialCommentFormPreviewState,
  createResolvedCommentFormPreviewState,
  createUnavailableCommentFormPreviewState
} from './comment-form-preview-state';
import {
  CommentFormCaptchaState,
  createFailedCommentFormCaptchaState,
  createInitialCommentFormCaptchaState,
  createResolvedCommentFormCaptchaState
} from './comment-form-ui-state';
import {
  CommentFormSubmitState,
  createFailedCommentFormState,
  createSubmittingCommentFormState,
  createSucceededCommentFormState
} from './comment-form-submit-state';

/**
 * Опис результату вставки quick-tag у textarea, щоб компонент оновив FormControl і caret.
 */
export interface QuickTagInsertResult {
  /** Підготовлений текст, який потрібно записати у FormControl. */
  updatedText: string;
  /** Позиція курсора, яку треба встановити після вставки тега. */
  caretPosition: number;
}

/**
 * Обробляє вставку підтримуваних quick-tags у textarea з урахуванням поточного виділення.
 */
export function buildQuickTagInsertResult(
  tag: 'i' | 'strong' | 'code' | 'a',
  textarea: HTMLTextAreaElement
): QuickTagInsertResult {
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

  return {
    updatedText: `${textarea.value.slice(0, selectionStart)}${replacement}${textarea.value.slice(selectionEnd)}`,
    caretPosition
  };
}

/**
 * Виконує синхронну перевірку обмежень вкладення згідно ТЗ.
 */
export function validateCommentAttachmentFile(file: File): string {
  if (file.size > 1_000_000) {
    return 'Файл перевищує 1MB.';
  }

  const allowedContentTypes = ['image/png', 'image/jpeg', 'image/gif', 'text/plain'];
  if (!allowedContentTypes.includes(file.type)) {
    return 'Недозволений тип вкладення.';
  }

  return '';
}

/**
 * Асинхронно читає файл як Data URL і формує payload для GraphQL мутації.
 */
export interface CommentAttachmentReadResult {
  attachment: CreateCommentAttachmentRequest | null;
  message: string;
  imagePreviewDataUrl: string;
}

/**
 * Асинхронно читає файл як Data URL і повертає нормалізований результат для attachment-state.
 */
export function readAttachmentAsRequest(file: File): Promise<CommentAttachmentReadResult> {
  return new Promise((resolve) => {
    const validationMessage = validateCommentAttachmentFile(file);
    if (validationMessage) {
      resolve({ attachment: null, message: validationMessage, imagePreviewDataUrl: '' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        resolve({ attachment: null, message: 'Не вдалося прочитати файл.', imagePreviewDataUrl: '' });
        return;
      }

      const base64Content = result.includes(',') ? result.split(',')[1] : result;
      resolve({
        attachment: {
          fileName: file.name,
          contentType: file.type,
          base64Content
        },
        message: `Вкладення готове: ${file.name}`,
        imagePreviewDataUrl: file.type.startsWith('image/') ? result : ''
      });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Параметри orchestration-хелпера для оновлення preview стану форми.
 */
export interface RefreshCommentPreviewOptions {
  /** Поточне значення textarea, для якого треба побудувати preview. */
  text: string;
  /** Виклик API, що повертає HTML preview. */
  requestPreview: (text: string) => Observable<string>;
  /** Записує обчислений preview-стан у фасад/компонент. */
  setPreviewState: (state: CommentFormPreviewState) => void;
  /** Fallback-повідомлення для сценарію недоступного preview. */
  unavailableMessage: string;
}

/**
 * Уніфікує логіку preview: empty -> initial, success -> resolved, error -> unavailable.
 */
export function refreshCommentPreview(options: RefreshCommentPreviewOptions): void {
  if (!options.text.trim()) {
    options.setPreviewState(createInitialCommentFormPreviewState());
    return;
  }

  options.requestPreview(options.text).subscribe({
    next: (previewHtml) => {
      options.setPreviewState(createResolvedCommentFormPreviewState(previewHtml));
    },
    error: () => {
      options.setPreviewState(createUnavailableCommentFormPreviewState(options.unavailableMessage));
    }
  });
}

/**
 * Параметри orchestration-хелпера для перезавантаження CAPTCHA.
 */
export interface ReloadCommentCaptchaOptions {
  /** Виклик API, що повертає captcha challenge + image. */
  requestCaptcha: () => Observable<CaptchaImageResponse>;
  /** Записує обчислений captcha-стан у фасад/компонент. */
  setCaptchaState: (state: CommentFormCaptchaState) => void;
  /** Фабрика повідомлення про помилку з урахуванням контексту (create/reply/thread). */
  resolveErrorMessage: (error: unknown) => string;
}

/**
 * Уніфікує lifecycle CAPTCHA: initial loading -> resolved image або failed message.
 */
export function reloadCommentCaptcha(options: ReloadCommentCaptchaOptions): void {
  options.setCaptchaState(createInitialCommentFormCaptchaState());

  options.requestCaptcha().subscribe({
    next: (response) => {
      options.setCaptchaState(
        createResolvedCommentFormCaptchaState(response.challengeId, `data:${response.mimeType};base64,${response.imageBase64}`)
      );
    },
    error: (error) => {
      options.setCaptchaState(createFailedCommentFormCaptchaState(options.resolveErrorMessage(error)));
    }
  });
}

/**
 * Нормалізований результат API-помилки для submit workflow.
 */
export interface CommentSubmitUiError {
  /** Узагальнене повідомлення для верхнього банера submit-стану. */
  summary: string;
  /** Список server-side validation-помилок, прив'язаних до полів форми. */
  validationErrors: ReadonlyArray<UiValidationError>;
  /** Прапорець показу підказки "спробуйте ще раз". */
  canRetry: boolean;
}

/**
 * Параметри shared submit workflow, який уніфікує success/error lifecycle.
 */
export interface RunCommentSubmitWorkflowOptions {
  /** Функція, що виконує фактичний submit-запит до API. */
  submitRequest: () => Observable<unknown>;
  /** Setter submit-стану через facade/компонент. */
  setSubmitState: (state: CommentFormSubmitState) => void;
  /** Повідомлення успішного submit. */
  successMessage: string;
  /** Callback успішного submit (reset/load/close/captcha). */
  onSuccess: () => void;
  /** Нормалізатор API-помилки в UI-представлення. */
  presentError: (error: unknown) => CommentSubmitUiError;
  /** Прив'язка server validation помилок до контролів форми. */
  applyServerValidationErrors: (validationErrors: ReadonlyArray<UiValidationError>) => void;
  /** Додаткова реакція на помилку (наприклад, refresh CAPTCHA). */
  onAfterError?: () => void;
}

/**
 * Запускає уніфікований submit workflow для create/reply форм list/thread сторінок.
 */
export function runCommentSubmitWorkflow(options: RunCommentSubmitWorkflowOptions): void {
  options.setSubmitState(createSubmittingCommentFormState());

  options.submitRequest().subscribe({
    next: () => {
      options.setSubmitState(createSucceededCommentFormState(options.successMessage));
      options.onSuccess();
    },
    error: (error) => {
      const uiError = options.presentError(error);
      options.setSubmitState(createFailedCommentFormState(uiError.summary, uiError.validationErrors, uiError.canRetry));
      options.applyServerValidationErrors(uiError.validationErrors);
      options.onAfterError?.();
    }
  });
}
