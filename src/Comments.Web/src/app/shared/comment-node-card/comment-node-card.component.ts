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
        <strong>{{ comment.userName }}</strong>
        <span>{{ comment.email }}</span>
        <span>{{ comment.createdAtUtc | date: 'dd.MM.yy HH:mm' }}</span>
      </p>
      <p [innerHTML]="renderedTextHtml"></p>
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
        <button class="btn-answer" type="button" (click)="replyClicked.emit(comment)">Відповісти</button>
      </div>
    </article>
  `,
  styles: [
    `
      .comments-list { padding: 0; list-style: none; display: grid; gap: 10px; }
      .comment { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; background: #fcfcfd; }
      .comment-header { display: flex; gap: 10px; flex-wrap: wrap; background: #e5e7eb; padding: 6px 8px; border-radius: 8px; margin: 0 0 8px; }
      .thread-node { margin-top: 10px; }
      .thread-actions { margin-top: 8px; display: flex; justify-content: flex-end; }
      .tree { list-style: none; margin: 0; padding-left: 14px; }
      .attachment-inline { margin-top: 8px; }
      .attachment-thumb { max-width: 260px; max-height: 180px; border: 1px solid #d0d7de; border-radius: 8px; }
      .attachment-text { white-space: pre-wrap; background: #f8fafc; border: 1px solid #d9e0ec; border-radius: 8px; padding: 8px; }
      .attachment-selection-preview { margin: 0; }
      .attachment-selection-block { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
      .attachment-remove { margin-top: 0; font-size: 12px; padding: 4px 8px; background: #b42318; color: #fff; border: 1px solid #912018; border-radius: 6px; cursor: pointer; }
      .attachment-remove:hover { background: #912018; }
      @media (max-width: 900px) { .actions { flex-direction: column; } }
    `
  ]
})
export class CommentNodeCardComponent {
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
