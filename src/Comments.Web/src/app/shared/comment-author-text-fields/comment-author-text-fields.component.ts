import { AbstractControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { QuickTagsToolbarComponent } from '../quick-tags-toolbar/quick-tags-toolbar.component';

/**
 * Уніфікований блок полів автора та тексту коментаря для root/reply форм.
 *
 * Компонент прибирає дублювання шаблону (user/email/homepage/text + quick-tags + preview),
 * але лишає контроль бізнес-логіки у батьківських сторінках через input/output.
 */
@Component({
  selector: 'app-comment-author-text-fields',
  standalone: true,
  imports: [ReactiveFormsModule, QuickTagsToolbarComponent],
  template: `
    <!--
      Внутрішня сітка полів форми автора.
      Дає стабільний вертикальний відступ між Ім'я / Email / Homepage у modal-вікнах root-коментарів.
    -->
    <div class="author-fields-grid" [formGroup]="formGroup">
      <label>
        Ім'я
        <input
          type="text"
          formControlName="userName"
          [class.field-invalid]="isInvalidControl('userName')"
          [attr.data-testid]="userNameTestId || null" />
      </label>

      <label>
        Email
        <input
          type="email"
          formControlName="email"
          [class.field-invalid]="isInvalidControl('email')"
          [attr.data-testid]="emailTestId || null" />
      </label>

      @if (showHomePage) {
        <label>
          Homepage
          <input
            type="url"
            formControlName="homePage"
            [class.field-invalid]="isInvalidControl('homePage')"
            placeholder="https://example.com"
            [attr.data-testid]="homePageTestId || null" />
        </label>
      }

      <label class="wide">
        Текст
        <textarea
          #textArea
          rows="5"
          formControlName="text"
          [class.field-invalid]="isInvalidControl('text')"
          (input)="textChanged.emit()"
          [attr.data-testid]="textTestId || null"></textarea>
      </label>
      @if (textValidationMessage) {
        <p class="error wide">{{ textValidationMessage }}</p>
      }

      <div class="wide">
        <app-quick-tags-toolbar
          [ariaLabel]="quickTagsAriaLabel"
          [testId]="quickTagsTestId"
          (tagSelected)="emitQuickTagSelection($event, textArea)" />
      </div>

      @if (previewHtml) {
        <div class="text-preview" [attr.data-testid]="previewContainerTestId || null">
          <div class="text-preview-title">Preview повідомлення</div>
          <div [innerHTML]="previewHtml"></div>
        </div>
      }

      @if (previewMessage) {
        <p class="meta">{{ previewMessage }}</p>
      }
    </div>
  `,
  styles: [
    `
      .error { color: #b42318; }
      .meta { color: #475467; }
      /* Локальний layout для полів автора всередині reusable блоку форми. */
      .author-fields-grid { display: grid; gap: 1.5em; }
      .field-invalid { border-color: #d92d20; box-shadow: 0 0 0 1px #d92d20 inset; }
      .text-preview { border: 1px dashed #d0d5dd; border-radius: 8px; padding: 8px; background: #f8fafc; }
      .text-preview-title { color: #344054; font-size: 14px; margin-bottom: 6px; font-weight: 600; }
    `
  ]

})
export class CommentAuthorTextFieldsComponent {
  /** Реактивна форма, з якою працює блок. */
  @Input({ required: true }) formGroup!: FormGroup;
  /** Локалізоване повідомлення про помилку валідації поля text. */
  @Input() textValidationMessage = '';
  /** HTML preview тексту (підготовлений і санітизований на сторінці). */
  @Input() previewHtml = '';
  /** Опційне повідомлення про стан preview. */
  @Input() previewMessage = '';
  /** Чи показувати поле Homepage (потрібне лише у формі root-коментаря). */
  @Input() showHomePage = false;
  /** Функція перевірки, чи потрібно підсвічувати control як невалідний. */
  @Input({ required: true }) shouldHighlightInvalid!: (control: AbstractControl | null) => boolean;
  /** ARIA-мітка для quick-tags toolbar. */
  @Input() quickTagsAriaLabel = 'Швидкі теги форматування';

  /** Опційні test id для e2e/UI тестів. */
  @Input() userNameTestId = '';
  /** Опційні test id для e2e/UI тестів. */
  @Input() emailTestId = '';
  /** Опційні test id для e2e/UI тестів. */
  @Input() homePageTestId = '';
  /** Опційні test id для e2e/UI тестів. */
  @Input() textTestId = '';
  /** Опційні test id для e2e/UI тестів. */
  @Input() quickTagsTestId = '';
  /** Опційні test id для e2e/UI тестів. */
  @Input() previewContainerTestId = '';

  /** Подія зміни textarea для тригеру preview в батьківському компоненті. */
  @Output() readonly textChanged = new EventEmitter<void>();
  /** Подія вибору quick-tag з поточним textarea контекстом. */
  @Output() readonly quickTagSelected = new EventEmitter<{ tag: 'i' | 'strong' | 'code' | 'a'; textArea: HTMLTextAreaElement }>();

  /**
   * Допоміжна перевірка невалідності control за іменем поля форми.
   */
  isInvalidControl(controlName: string): boolean {
    const control = this.formGroup.get(controlName);
    return this.shouldHighlightInvalid(control);
  }

  /**
   * Проксіює quick-tag у батьківський компонент разом з textarea,
   * щоб сторінка вставила тег у правильну позицію курсора.
   */
  emitQuickTagSelection(tag: 'i' | 'strong' | 'code' | 'a', textArea: HTMLTextAreaElement): void {
    this.quickTagSelected.emit({ tag, textArea });
  }
}