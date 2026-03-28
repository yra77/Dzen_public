import { CreateCommentAttachmentRequest } from '../../core/comments.models';
import { CommentAttachmentReadResult } from './comment-form-helpers';

/**
 * Shared state-контейнер для вкладення форми (payload + повідомлення + image preview).
 */
export class CommentFormAttachmentState {
  private attachment: CreateCommentAttachmentRequest | null = null;
  private message = '';
  private imagePreviewDataUrl = '';

  /** Повертає payload вкладення для submit-запиту або null, якщо вкладення відсутнє/невалідне. */
  get value(): CreateCommentAttachmentRequest | null {
    return this.attachment;
  }

  /** Повертає службове повідомлення для UI-компонента вибору вкладення. */
  get statusMessage(): string {
    return this.message;
  }

  /** Повертає Data URL image preview (або порожній рядок для не-image файлів). */
  get previewDataUrl(): string {
    return this.imagePreviewDataUrl;
  }

  /** Очищає весь attachment-стан (payload, повідомлення та preview). */
  reset(): void {
    this.attachment = null;
    this.message = '';
    this.imagePreviewDataUrl = '';
  }

  /** Застосовує результат читання/валідації вкладення з shared helper. */
  applyReadResult(result: CommentAttachmentReadResult): void {
    this.attachment = result.attachment;
    this.message = result.message;
    this.imagePreviewDataUrl = result.imagePreviewDataUrl;
  }
}