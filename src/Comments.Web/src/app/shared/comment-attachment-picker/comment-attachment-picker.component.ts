import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Уніфікований UI-блок вибору вкладення при створенні/відповіді на коментар.
 *
 * Компонент інкапсулює input[file], повідомлення стану та preview вибраного
 * зображення, щоби прибрати дублювання шаблону між root/thread формами.
 */
@Component({
  selector: 'app-comment-attachment-picker',
  standalone: true,
  template: `
    <label class="wide">
      Вкладення (png/jpg/gif/txt, до 1MB)
      <input
        type="file"
        (change)="attachmentSelected.emit($event)"
        accept=".txt,image/png,image/jpeg,image/gif,text/plain"
        [attr.data-testid]="inputTestId || null" />
    </label>

    @if (message) {
      <p class="meta">{{ message }}</p>
    }

    @if (imagePreviewDataUrl) {
      <div class="attachment-selection-block">
        <figure class="attachment-selection-preview" [attr.data-testid]="previewTestId || null">
          <img [src]="imagePreviewDataUrl" alt="Preview вибраного зображення" class="attachment-thumb" />
          <figcaption class="meta">Preview вибраного зображення</figcaption>
        </figure>
        <button type="button" class="attachment-remove" (click)="clearRequested.emit()">Видалити зображення</button>
      </div>
    }
  `,
  styles: [
    `
      .meta { color: #475467; }
      .attachment-thumb { max-width: 260px; max-height: 180px; border: 1px solid #d0d7de; border-radius: 8px; }
      .attachment-selection-preview { margin: 0; }
      .attachment-selection-block { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
      .attachment-remove { margin-top: 0; font-size: 12px; padding: 4px 8px; background: #b42318; color: #fff; border: 1px solid #912018; border-radius: 6px; cursor: pointer; }
      .attachment-remove:hover { background: #912018; }
    `
  ]
})
export class CommentAttachmentPickerComponent {
  /** Повідомлення про стан/помилку обробки вкладення. */
  @Input() message = '';
  /** Data URL preview обраного зображення. */
  @Input() imagePreviewDataUrl = '';
  /** Опційний test id для file input. */
  @Input() inputTestId = '';
  /** Опційний test id для контейнера preview. */
  @Input() previewTestId = '';

  /** Подія вибору нового файлу. */
  @Output() readonly attachmentSelected = new EventEmitter<Event>();
  /** Подія запиту на очищення поточного вкладення. */
  @Output() readonly clearRequested = new EventEmitter<void>();
}
