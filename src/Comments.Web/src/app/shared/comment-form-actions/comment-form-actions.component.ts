import { Component, EventEmitter, Input, Output } from '@angular/core';

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
        <button
          type="button"
          [attr.data-testid]="closeTestId || null"
          (click)="closeClicked.emit()">
          {{ closeLabel }}
        </button>
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
  /** Подія кліку по close-кнопці. */
  @Output() readonly closeClicked = new EventEmitter<void>();
}
