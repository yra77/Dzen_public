import { Component, input } from '@angular/core';

import { UiValidationError } from '../../core/api-error-presenter.service';

@Component({
  selector: 'app-form-submit-feedback',
  template: `
    @if (message()) {
      <div class="wide form-error-top" [attr.data-testid]="testId() || null">
        <p class="error">{{ message() }}</p>
        @if (showRetryHint()) {
          <p class="meta">Можна повторити запит без зміни даних форми.</p>
        }
        @if (validationErrors().length > 0) {
          <ul class="error-list">
            @for (validationError of validationErrors(); track validationError.field) {
              <li><strong>{{ validationError.field }}</strong>: {{ validationError.messages.join('; ') }}</li>
            }
          </ul>
        }
      </div>
    }
  `
})
/**
 * Єдиний блок відображення server-side помилок submit для форм створення/відповіді.
 */
export class FormSubmitFeedbackComponent {
  /** Коротке підсумкове повідомлення про помилку submit. */
  readonly message = input<string>('');
  /** Список детальних помилок валідації від API. */
  readonly validationErrors = input<ReadonlyArray<UiValidationError>>([]);
  /** Прапорець показу підказки, що користувач може безпечно повторити submit. */
  readonly showRetryHint = input(false);
  /** Опційний data-testid для e2e/integration сценаріїв. */
  readonly testId = input('');
}
