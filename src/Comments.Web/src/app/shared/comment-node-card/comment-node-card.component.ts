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
  `
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
