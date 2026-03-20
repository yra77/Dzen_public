import { CreateCommentAttachmentRequest } from '../../core/comments.models';

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
export function readAttachmentAsRequest(file: File): Promise<{
  attachment: CreateCommentAttachmentRequest | null;
  message: string;
  imagePreviewDataUrl: string;
}> {
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
