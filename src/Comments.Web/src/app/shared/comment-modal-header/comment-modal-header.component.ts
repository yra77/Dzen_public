import { Component, EventEmitter, Input, Output } from '@angular/core';

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
        (click)="closeClicked.emit()">
        {{ closeLabel }}
      </button>
    </div>
  `,
  styles: [
    `
      .modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
      .modal-header h3 { margin: 0; }
      .modal-close-button { margin-left: auto; }
    `
  ]
})
export class CommentModalHeaderComponent {
  /** Текст заголовка модального вікна. */
  @Input({ required: true }) title = '';
  /** Текст кнопки закриття. */
  @Input() closeLabel = 'Закрити';
  /** Опційний data-testid для кнопки закриття. */
  @Input() closeTestId = '';
  /** Подія кліку по кнопці закриття. */
  @Output() readonly closeClicked = new EventEmitter<void>();
}
