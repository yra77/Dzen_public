import { ModalCloseReason } from './comment-modal-layout.component';

/**
 * Централізоване правило закриття модалки.
 * Повертає `true`, якщо модальне вікно можна закрити в поточному стані.
 */
export function canCloseModal(
  isSubmitting: boolean,
  closeReason: ModalCloseReason,
  force = false
): boolean {
  // Під час submit блокуємо закриття будь-якою причиною, окрім примусового сценарію.
  if (isSubmitting && !force) {
    return false;
  }

  // Дозволені всі уніфіковані UI-причини закриття поза submit-станом.
  return closeReason === 'backdrop' || closeReason === 'escape' || closeReason === 'close-button';
}