import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ModalCloseReason } from '../comment-modal-layout/comment-modal-layout.component';

/**
 * Уніфікований рядок дій форми для модальних create/reply сценаріїв.
 *
 * Дозволяє однаково рендерити submit та (опційно) cancel/close кнопку.
 */
@Component({
  selector: 'app-comment-form-actions',
  standalone: true,
  template: `
    <div class="actions wide">
      @if (showCloseButton) {
       <!-- <button
          type="button"
          [attr.data-testid]="closeTestId || null"
          (click)="emitCloseClicked()">
          {{ closeLabel }}
        </button>-->
      }
      <button
        [type]="submitButtonType"
        [disabled]="submitDisabled"
        [attr.data-testid]="submitTestId || null">
        {{ submitLabel }}
      </button>
    </div>
  `,
  styles: [
    `
      .actions { display: flex; justify-content: flex-end; gap: 8px; }
      @media (max-width: 900px) { .actions { flex-direction: column; } }
    `
  ]
})
export class CommentFormActionsComponent {
  /** Текст submit-кнопки. */
  @Input() submitLabel = 'Зберегти';
  /** Тип submit-кнопки (для form submit залишаємо `submit`). */
  @Input() submitButtonType: 'submit' | 'button' = 'submit';
  /** Прапорець блокування submit-кнопки. */
  @Input() submitDisabled = false;
  /** Опційний data-testid для submit-кнопки. */
  @Input() submitTestId = '';
  /** Чи показувати кнопку закриття/скасування. */
  @Input() showCloseButton = false;
  /** Текст кнопки закриття/скасування. */
  @Input() closeLabel = 'Закрити';
  /** Опційний data-testid для close-кнопки. */
  @Input() closeTestId = '';
  /**
   * Причина закриття, яку компонент емітить при кліку на close-кнопку.
   * За замовчуванням — `close-button`, що відповідає уніфікованому modal API.
   */
  @Input() closeReason: ModalCloseReason = 'close-button';
  /** Подія кліку по close-кнопці з типізованою причиною закриття. */
  @Output() readonly closeClicked = new EventEmitter<ModalCloseReason>();

  /**
   * Централізовано емітить причину закриття модалки при кліку на close/cancel-кнопку.
   */
  emitCloseClicked(): void {
    this.closeClicked.emit(this.closeReason);
  }
}
