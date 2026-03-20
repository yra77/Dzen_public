import { Component, Input } from '@angular/core';

/**
 * Уніфікований блок відображення CAPTCHA (зображення + поле відповіді).
 *
 * Компонент не керує FormControl напряму — він рендерить звичайний input,
 * а контейнерна форма прив'язує його через formControlName у власному шаблоні.
 */
@Component({
  selector: 'app-captcha-input',
  standalone: true,
  template: `
    <div class="captcha-block">
      @if (imageDataUrl) {
        <img [src]="imageDataUrl" alt="Captcha" class="captcha" [attr.data-testid]="imageTestId || null" />
      }
      <label class="captcha-answer-label">
        CAPTCHA (цифри і букви латинського алфавіту)
        <input
          type="text"
          formControlName="captchaAnswer"
          [class.field-invalid]="isInvalid"
          [attr.data-testid]="answerTestId || null" />
      </label>
    </div>
  `,
  styles: [
    `
      .captcha { width: 160px; height: 60px; border: 1px solid #d9e0ec; border-radius: 6px; }
      .captcha-block { display: flex; align-items: flex-start; gap: 12px; }
      .captcha-answer-label { flex: 1; min-width: 240px; }
      .field-invalid { border-color: #d92d20; box-shadow: 0 0 0 1px #d92d20 inset; }
    `
  ]
})
export class CaptchaInputComponent {
  /** Data URL зображення CAPTCHA. */
  @Input() imageDataUrl = '';
  /** Ознака невалідного стану поля відповіді CAPTCHA. */
  @Input() isInvalid = false;
  /** Опційний test id для зображення CAPTCHA. */
  @Input() imageTestId = '';
  /** Опційний test id для поля відповіді. */
  @Input() answerTestId = '';
}
