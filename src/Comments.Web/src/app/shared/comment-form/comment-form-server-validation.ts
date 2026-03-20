import { AbstractControl } from '@angular/forms';

import { UiValidationError } from '../../core/api-error-presenter.service';

/**
 * Нормалізований мапінг server-side полів на назви FormControl у конкретній формі.
 */
export type ServerFieldControlMapping = Record<string, string>;

/**
 * Проставляє server-помилки для FormControl на основі validation payload від API.
 */
export function applyServerValidationErrorsToControls(
  controls: Record<string, AbstractControl>,
  validationErrors: ReadonlyArray<UiValidationError>,
  fieldMapping: ServerFieldControlMapping
): void {
  for (const validationError of validationErrors) {
    const normalizedField = validationError.field.toLowerCase();
    const controlName = fieldMapping[normalizedField];
    if (!controlName) {
      continue;
    }

    const mappedControl = controls[controlName];
    if (!mappedControl) {
      continue;
    }

    const existingErrors = mappedControl.errors ?? {};
    mappedControl.setErrors({ ...existingErrors, server: true });
    mappedControl.markAsTouched();
  }
}

/**
 * Очищає server-помилку поля після першої зміни значення користувачем.
 */
export function setupServerValidationReset(control: AbstractControl): void {
  control.valueChanges.subscribe(() => {
    if (!control.errors || !control.errors['server']) {
      return;
    }

    const { server: _server, ...restErrors } = control.errors;
    control.setErrors(Object.keys(restErrors).length > 0 ? restErrors : null);
  });
}
