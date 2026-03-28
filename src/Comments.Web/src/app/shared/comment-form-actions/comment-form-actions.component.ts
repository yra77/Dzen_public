import { Component, Input } from '@angular/core';

/**
 * Уніфікований рядок дій форми для модальних create/reply сценаріїв.
 *
 * Рендерить тільки submit-кнопку, бо закриття модалки виконується через header.
 */
@Component({
  selector: 'app-comment-form-actions',
  standalone: true,
  template: `
    <div class="actions wide">
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
      :host {
        display: block;
        grid-column: 1 / -1;
      }

      .actions {
        display: flex;
        justify-content: center;
        gap: 8px;
        width: 100%;
      }

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
}