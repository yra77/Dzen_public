import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';

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
        <button
          type="button"
          class="attachment-image-button"
          (click)="openImageLightbox()"
          [attr.aria-label]="'Відкрити зображення ' + attachment.fileName"
        >
          <img
            class="attachment-thumb"
            [src]="attachmentUrl"
            [alt]="attachment.fileName"
          />
        </button>

        <dialog #lightboxDialog class="lightbox" (click)="onLightboxBackdropClick($event)">
          <button type="button" class="lightbox-close" (click)="closeImageLightbox()" aria-label="Закрити перегляд">
            ×
          </button>
          <img
            class="lightbox-image"
            [src]="attachmentUrl"
            [alt]="attachment.fileName"
          />
        </dialog>
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
      .attachment-image-button {
        border: 0;
        background: transparent;
        padding: 0;
      }
      .attachment-thumb {
        max-width: 260px;
        max-height: 180px;
        border: 1px solid #d0d7de;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.14);
        cursor: zoom-in;
        transition: transform 180ms ease, box-shadow 180ms ease;
      }
      .attachment-image-button:hover .attachment-thumb {
        transform: translateY(-2px) scale(1.015);
        box-shadow: 0 14px 28px rgba(15, 23, 42, 0.2);
      }
      .lightbox {
        border: 0;
        border-radius: 14px;
        padding: 0;
        max-width: min(92vw, 980px);
        max-height: 92vh;
        overflow: hidden;
        background: #0f172a;
      }
      .lightbox::backdrop {
        background: rgba(2, 6, 23, 0.84);
        backdrop-filter: blur(3px);
        animation: lightboxBackdropFadeIn 190ms ease-out;
      }
      .lightbox-image {
        display: block;
        max-width: min(92vw, 980px);
        max-height: 88vh;
        width: auto;
        height: auto;
        animation: lightboxZoomIn 220ms ease-out;
      }
      .lightbox-close {
        position: absolute;
        right: 10px;
        top: 10px;
        width: 36px;
        height: 36px;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.75);
        border: 1px solid #cbd5e1;
        color: #fff;
        font-size: 24px;
        line-height: 1;
        padding: 0;
        cursor: pointer;
      }
      .attachment-text {
        white-space: pre-wrap;
        background: #f8fafc;
        border: 1px solid #d9e0ec;
        border-radius: 8px;
        padding: 8px;
      }
      @keyframes lightboxZoomIn {
        from {
          transform: scale(0.93);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }
      @keyframes lightboxBackdropFadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
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

  /** Посилання на елемент діалогу для показу lightbox з візуальними ефектами. */
  @ViewChild('lightboxDialog') private lightboxDialogRef?: ElementRef<HTMLDialogElement>;

  /** Відкриває lightbox-перегляд зображення. */
  openImageLightbox(): void {
    this.lightboxDialogRef?.nativeElement.showModal();
  }

  /** Закриває lightbox-перегляд зображення. */
  closeImageLightbox(): void {
    this.lightboxDialogRef?.nativeElement.close();
  }

  /** Закриває lightbox при кліку на затемнену область поза контентом. */
  onLightboxBackdropClick(event: MouseEvent): void {
    if (event.target === this.lightboxDialogRef?.nativeElement) {
      this.closeImageLightbox();
    }
  }
}
