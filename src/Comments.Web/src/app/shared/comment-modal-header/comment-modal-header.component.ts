import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ModalCloseReason } from '../comment-modal-layout/comment-modal-layout.component';

/**
 * Уніфікований заголовок модального вікна з кнопкою закриття.
 *
 * Компонент прибирає дублювання розмітки `modal-header` у root/thread сторінках.
 */
@Component({
  selector: 'app-comment-modal-header',
  standalone: true,
  template: `
    <div class="modal-header">
      <h3>{{ title }}</h3>
      <button
        type="button"
        class="modal-close-button"
        [attr.data-testid]="closeTestId || null"
        (click)="closeClicked.emit('close-button')"
        title="Закрити">
        <img class="btn-answer-icon" [src]="closeIconPath" alt="Закрити" aria-hidden="true" />
        </button>
    </div>
  `,
  styles: [
    `
      .modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
      .modal-header h3 { }
      .modal-close-button { margin-left: auto; background: transparent; }
    `
  ]
})
export class CommentModalHeaderComponent {
  /** Локальний SVG-asset для кнопки Close. */
  readonly closeIconPath = '/images/red-close.svg';
  /** Текст заголовка модального вікна. */
  @Input({ required: true }) title = '';
  /** Текст кнопки закриття. */
  @Input() closeLabel = 'Закрити';
  /** Опційний data-testid для кнопки закриття. */
  @Input() closeTestId = '';
  /** Подія кліку по кнопці закриття з явною причиною закриття. */
  @Output() readonly closeClicked = new EventEmitter<ModalCloseReason>();
}
