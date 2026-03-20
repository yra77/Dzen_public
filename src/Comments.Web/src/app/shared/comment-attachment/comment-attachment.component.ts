import { Component, EventEmitter, Input, Output } from '@angular/core';

import { CommentAttachment } from '../../core/comments.models';

/**
 * Уніфікований UI-блок для відображення вкладення коментаря.
 *
 * Компонент інкапсулює preview зображень/txt і подію завантаження txt-вмісту,
 * щоб зменшити дублювання шаблонів на сторінках списку та гілки.
 */
@Component({
  selector: 'app-comment-attachment',
  standalone: true,
  template: `
    <div class="attachment-inline">
      @if (attachment.contentType.startsWith('image/')) {
        <a [href]="attachmentUrl" target="_blank" rel="noreferrer">
          <img
            class="attachment-thumb"
            [src]="attachmentUrl"
            [alt]="attachment.fileName"
          />
        </a>
      } @else if (attachment.contentType === 'text/plain') {
        <button type="button" (click)="requestTextPreview.emit(attachment.storagePath)" [disabled]="isTextPreviewLoading">
          Показати txt preview
        </button>
        @if (isTextPreviewLoading) {
          <p class="meta">Завантаження txt preview...</p>
        }
        @if (textPreviewContent) {
          <pre class="attachment-text">{{ textPreviewContent }}</pre>
        }
      }
      <p class="attachment-meta">
        📎
        <a [href]="attachmentUrl" target="_blank" rel="noreferrer">{{ attachment.fileName }}</a>
        @if (showContentType) {
          ({{ attachment.contentType }})
        }
      </p>
    </div>
  `,
  styles: [
    `
      .meta,
      .attachment-meta {
        color: #475467;
      }
      .attachment-inline {
        margin-top: 8px;
      }
      .attachment-thumb {
        max-width: 260px;
        max-height: 180px;
        border: 1px solid #d0d7de;
        border-radius: 8px;
      }
      .attachment-text {
        white-space: pre-wrap;
        background: #f8fafc;
        border: 1px solid #d9e0ec;
        border-radius: 8px;
        padding: 8px;
      }
    `
  ]
})
export class CommentAttachmentComponent {
  /** Метадані вкладення з API-моделі коментаря. */
  @Input({ required: true }) attachment!: CommentAttachment;
  /** Абсолютний URL завантаження/перегляду файлу. */
  @Input({ required: true }) attachmentUrl = '';
  /** Текстовий preview для txt-вкладень (якщо вже завантажено). */
  @Input() textPreviewContent = '';
  /** Прапорець завантаження txt-preview. */
  @Input() isTextPreviewLoading = false;
  /** Опція показу MIME-типу в підписі файлу. */
  @Input() showContentType = false;
  /** Подія запиту завантаження txt-preview для storagePath. */
  @Output() readonly requestTextPreview = new EventEmitter<string>();
}
