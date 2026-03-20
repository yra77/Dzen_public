import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Уніфікована панель швидких тегів форматування для форм коментарів.
 */
@Component({
  selector: 'app-quick-tags-toolbar',
  standalone: true,
  template: `
    <div class="text-toolbar" role="group" [attr.aria-label]="ariaLabel" [attr.data-testid]="testId">
      <span class="text-toolbar-label">Швидкі теги:</span>
      <button type="button" (click)="selectTag('i')">[i]</button>
      <button type="button" (click)="selectTag('strong')">[strong]</button>
      <button type="button" (click)="selectTag('code')">[code]</button>
      <button type="button" (click)="selectTag('a')">[a]</button>
    </div>
  `
})
export class QuickTagsToolbarComponent {
  /** Текст для aria-label групи швидких тегів. */
  @Input() ariaLabel = 'Швидкі теги форматування';

  /** Необов'язковий data-testid для e2e/integration тестів. */
  @Input() testId: string | null = null;

  /** Повідомляє батьківський компонент, який саме тег було обрано. */
  @Output() readonly tagSelected = new EventEmitter<'i' | 'strong' | 'code' | 'a'>();

  /** Емітить вибраний тег уніфікованим event-контрактом. */
  selectTag(tagName: 'i' | 'strong' | 'code' | 'a'): void {
    this.tagSelected.emit(tagName);
  }
}
