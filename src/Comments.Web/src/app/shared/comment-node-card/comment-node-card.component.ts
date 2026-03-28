import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { CommentNode } from '../../core/comments.models';
import { CommentAttachmentComponent } from '../comment-attachment/comment-attachment.component';

/**
 * Уніфікована картка вузла коментаря з діями та вкладенням.
 * Використовується на root-сторінці та сторінці гілки для зменшення дублювання шаблонів.
 */
@Component({
  selector: 'app-comment-node-card',
  imports: [DatePipe, CommentAttachmentComponent],
  template: `
    <article class="comment thread-node">
      <p class="comment-header">
        <strong class="comment-author">{{ comment.userName }}</strong>
        <span class="comment-email">{{ comment.email }}</span>
        <span class="comment-date">{{ comment.createdAtUtc | date: 'dd.MM.yy &nbsp;&nbsp;HH:mm' }}</span>
      </p>
      <p class="comment-body" [innerHTML]="renderedTextHtml"></p>
      @if (comment.attachment) {
        <app-comment-attachment
          [attachment]="comment.attachment"
          [attachmentUrl]="attachmentUrl"
          [textPreviewContent]="textPreviewContent"
          [isTextPreviewLoading]="isTextPreviewLoading"
          [showContentType]="showContentType"
          (requestTextPreview)="requestTextPreview.emit($event)" />
      }
      <div class="thread-actions">
        <button class="btn-answer" type="button" (click)="replyClicked.emit(comment)" aria-label="Відповісти" title="Відповісти">
          <img class="btn-answer-icon" [src]="replyIconPath" alt="" aria-hidden="true" />
        </button>
      </div>
    </article>
  `,
  styles: [
    `
      .comments-list { padding: 0; list-style: none; display: grid; gap: 10px; }
      .comment { border: 1px solid #e5e7eb; border-radius: 10px; padding: clamp(10px, 1.8vw, 14px); background: #fcfcfd; }
      .comment-header { display: flex; gap: 8px 12px; flex-wrap: wrap; align-items: center; background: #e5e7eb; padding: 8px 10px; border-radius: 8px; margin: 0 0 8px; }
      .comment-author { font-size: 15px; line-height: 1.2; }
      .comment-email,
      .comment-date { color: #334155; font-size: 13px; line-height: 1.3; word-break: break-word; }
      .comment-date { margin-left: auto; white-space: nowrap; }
      .comment-body { margin: 0; line-height: 1.45; overflow-wrap: anywhere; }
      .thread-node { margin-top: 10px; }
      .thread-actions { margin-top: 8px; display: flex; justify-content: flex-end; }
      .btn-answer { display: inline-flex; align-items: center; justify-content: center; min-width: 38px; min-height: 38px; padding: 8px; border-radius: 999px; background: transparent; cursor: pointer; }
      .btn-answer:hover { border-radius: 15px; border: 1px solid #999999;}
      .btn-answer:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
      .btn-answer-icon { width: 18px; height: 18px; display: block; }
      .tree { list-style: none; margin: 0; padding-left: 14px; }
      .attachment-inline { margin-top: 8px; }
      .attachment-thumb { max-width: 260px; max-height: 180px; border: 1px solid #d0d7de; border-radius: 8px; }
      .attachment-text { white-space: pre-wrap; background: #f8fafc; border: 1px solid #d9e0ec; border-radius: 8px; padding: 8px; }
      .attachment-selection-preview { margin: 0; }
      .attachment-selection-block { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
      .attachment-remove { margin-top: 0; font-size: 12px; padding: 4px 8px; background: #b42318; color: #fff; border: 1px solid #912018; border-radius: 6px; cursor: pointer; }
      .attachment-remove:hover { background: #912018; }
      @media (max-width: 900px) {
        .comment-header { gap: 6px 10px; }
        .comment-date { margin-left: 0; width: 100%; }
      }
      @media (max-width: 640px) {
        .comment { border-radius: 9px; }
        .comment-header { padding: 7px 9px; }
        .comment-author { width: 100%; }
        .thread-actions { justify-content: stretch; }
        .btn-answer { width: 100%; border-radius: 10px; border: 1px solid #d0d7de; }
      }
    `
  ]
})
export class CommentNodeCardComponent {
  /** Локальний SVG-asset для кнопки відповіді у дереві коментарів. */
  readonly replyIconPath = '/images/reply.svg';
  /** Поточний вузол дерева коментарів, який відображається у картці. */
  @Input({ required: true }) comment!: CommentNode;
  /** Підготовлений HTML тексту коментаря після санітизації/форматування. */
  @Input({ required: true }) renderedTextHtml = '';
  /** Публічний URL вкладення для відображення або завантаження. */
  @Input({ required: true }) attachmentUrl = '';
  /** Кеш preview-вмісту text-вкладення (може бути порожнім до завантаження). */
  @Input() textPreviewContent = '';
  /** Прапорець стану завантаження preview-вмісту text-вкладення. */
  @Input() isTextPreviewLoading = false;
  /** Показувати чи ні MIME-тип вкладення у дочірньому компоненті. */
  @Input() showContentType = false;

  /** Подія запиту завантаження preview для text-вкладення за storagePath. */
  @Output() readonly requestTextPreview = new EventEmitter<string>();
  /** Подія кліку на "Відповісти" для відкриття модального вікна відповіді. */
  @Output() readonly replyClicked = new EventEmitter<CommentNode>();
}