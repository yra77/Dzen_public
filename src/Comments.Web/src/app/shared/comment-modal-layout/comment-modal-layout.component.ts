import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

/** Причина запиту закриття модального вікна. */
export type ModalCloseReason = 'backdrop' | 'escape';

/**
 * Уніфікований контейнер модального вікна (backdrop + panel).
 *
 * Компонент прибирає дублювання розмітки/стилів модального layout у різних сторінках.
 */
@Component({
  selector: 'app-comment-modal-layout',
  standalone: true,
  template: `
    <div [attr.data-testid]="layoutTestId || null">
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
  /**
   * Режим закриття модалки.
   * - `always`: дозволяє backdrop + Escape;
   * - `backdrop-only`: дозволяє лише backdrop;
   * - `disabled`: блокує всі автоматичні способи закриття.
   */
  @Input() closeMode: 'always' | 'backdrop-only' | 'disabled' = 'always';
  /** Опційний data-testid для backdrop-контейнера. */
  @Input() backdropTestId = '';
  /** Опційний data-testid для panel-контейнера. */
  @Input() panelTestId = '';
  /** Опційний data-testid для кореневого layout-елемента. */
  @Input() layoutTestId = '';
  /** Подія кліку по backdrop для зовнішньої обробки закриття. */
  @Output() readonly backdropClicked = new EventEmitter<void>();
  /** Уніфікована подія запиту закриття з причиною. */
  @Output() readonly closeRequested = new EventEmitter<ModalCloseReason>();

  /**
   * Обробляє натискання Escape для уніфікованого закриття модалки.
   */
  @HostListener('document:keydown.escape', ['$event'])
  onEscapePressed(event: KeyboardEvent): void {
    if (!this.canCloseByEscape()) {
      return;
    }

    event.preventDefault();
    this.closeRequested.emit('escape');
  }

  /**
   * Емітить подію кліку по backdrop, якщо поведінка не вимкнена.
   */
  onBackdropClick(): void {
    if (!this.canCloseByBackdrop()) {
      return;
    }

    this.backdropClicked.emit();
    this.closeRequested.emit('backdrop');
  }

  /**
   * Повертає true, якщо дозволено закриття через backdrop.
   */
  private canCloseByBackdrop(): boolean {
    return this.closeMode === 'always' || this.closeMode === 'backdrop-only';
  }

  /**
   * Повертає true, якщо дозволено закриття через клавішу Escape.
   */
  private canCloseByEscape(): boolean {
    return this.closeMode === 'always';
  }
}
