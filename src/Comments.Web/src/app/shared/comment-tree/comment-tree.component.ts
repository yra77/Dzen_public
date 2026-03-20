import { Component, EventEmitter, Input, Output } from '@angular/core';

import { CommentNode } from '../../core/comments.models';
import { CommentNodeCardComponent } from '../comment-node-card/comment-node-card.component';

/**
 * Рекурсивний компонент для рендерингу дерева коментарів без дублювання шаблонів сторінок.
 */
@Component({
  selector: 'app-comment-tree',
  imports: [CommentNodeCardComponent],
  template: `
    <ul class="tree">
      @for (comment of comments; track comment.id) {
        <li>
          <app-comment-node-card
            [comment]="comment"
            [renderedTextHtml]="renderText(comment.text)"
            [attachmentUrl]="comment.attachment ? resolveAttachmentUrl(comment.attachment.storagePath) : ''"
            [textPreviewContent]="comment.attachment ? (textPreviewByPath[comment.attachment.storagePath] ?? '') : ''"
            [isTextPreviewLoading]="comment.attachment ? loadingPaths.has(comment.attachment.storagePath) : false"
            [showContentType]="showContentType"
            (requestTextPreview)="requestTextPreview.emit($event)"
            (replyClicked)="replyClicked.emit($event)" />

          @if (comment.replies.length > 0) {
            <app-comment-tree
              [comments]="comment.replies"
              [renderText]="renderText"
              [resolveAttachmentUrl]="resolveAttachmentUrl"
              [textPreviewByPath]="textPreviewByPath"
              [loadingPaths]="loadingPaths"
              [showContentType]="showContentType"
              (requestTextPreview)="requestTextPreview.emit($event)"
              (replyClicked)="replyClicked.emit($event)" />
          }
        </li>
      }
    </ul>
  `,
  styles: [
    `
      .tree { list-style: none; margin: 0; padding-left: 14px; }
    `
  ]
})
export class CommentTreeComponent {
  /** Плоский список вузлів поточного рівня дерева. */
  @Input({ required: true }) comments: ReadonlyArray<CommentNode> = [];
  /** Функція підготовки HTML для тексту коментаря. */
  @Input({ required: true }) renderText!: (text: string) => string;
  /** Функція перетворення storagePath вкладення у публічний URL. */
  @Input({ required: true }) resolveAttachmentUrl!: (storagePath: string) => string;
  /** Кеш preview-вмісту для text-вкладень за storagePath. */
  @Input({ required: true }) textPreviewByPath: Record<string, string | undefined> = {};
  /** Поточні storagePath, для яких триває завантаження text-preview. */
  @Input({ required: true }) loadingPaths: ReadonlySet<string> = new Set<string>();
  /** Показувати MIME-тип вкладення в картці вузла. */
  @Input() showContentType = false;

  /** Подія запиту завантаження preview для text-вкладення. */
  @Output() readonly requestTextPreview = new EventEmitter<string>();
  /** Подія кліку "Відповісти" у картці конкретного вузла. */
  @Output() readonly replyClicked = new EventEmitter<CommentNode>();
}
