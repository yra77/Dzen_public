import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Уніфікований контейнер модального вікна (backdrop + panel).
 *
 * Компонент прибирає дублювання розмітки/стилів модального layout у різних сторінках.
 */
@Component({
  selector: 'app-comment-modal-layout',
  standalone: true,
  template: `
    <div
      class="reply-modal-backdrop"
      [attr.data-testid]="backdropTestId || null"
      (click)="onBackdropClick()">
      <div
        class="reply-modal"
        [attr.data-testid]="panelTestId || null"
        (click)="$event.stopPropagation()">
        <ng-content />
      </div>
    </div>
  `,
  styles: [
    `
      .reply-modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
      .reply-modal { width: min(760px, 100%); max-height: 92vh; overflow-y: auto; background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.25); }
    `
  ]
})
export class CommentModalLayoutComponent {
  /** Дозволяє вимкнути закриття модалки по кліку в backdrop. */
  @Input() closeOnBackdropClick = true;
  /** Опційний data-testid для backdrop-контейнера. */
  @Input() backdropTestId = '';
  /** Опційний data-testid для panel-контейнера. */
  @Input() panelTestId = '';
  /** Подія кліку по backdrop для зовнішньої обробки закриття. */
  @Output() readonly backdropClicked = new EventEmitter<void>();

  /**
   * Емітить подію кліку по backdrop, якщо поведінка не вимкнена.
   */
  onBackdropClick(): void {
    if (!this.closeOnBackdropClick) {
      return;
    }

    this.backdropClicked.emit();
  }
}
