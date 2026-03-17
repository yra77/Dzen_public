import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

/**
 * Нормалізована помилка валідації для показу у UI.
 */
export interface UiValidationError {
  field: string;
  messages: string[];
}

/**
 * Уніфікований формат помилки API (REST/GraphQL) для Angular-компонентів.
 */
export interface UiApiError {
  summary: string;
  validationErrors: UiValidationError[];
}

/**
 * Перетворює різні формати server-side помилок у єдине представлення для UI.
 */
@Injectable({ providedIn: 'root' })
export class ApiErrorPresenterService {
  /**
   * Будує повідомлення для користувача з HttpErrorResponse.
   */
  present(error: unknown, fallbackMessage: string): UiApiError {
    if (!(error instanceof HttpErrorResponse)) {
      return { summary: fallbackMessage, validationErrors: [] };
    }

    const validationErrors = this.extractValidationErrors(error.error);
    if (validationErrors.length > 0) {
      return {
        summary: this.buildValidationSummary(validationErrors),
        validationErrors
      };
    }

    if (error.status === 0) {
      return { summary: 'Сервер недоступний. Перевірте підключення та спробуйте ще раз.', validationErrors: [] };
    }

    return { summary: fallbackMessage, validationErrors: [] };
  }

  private buildValidationSummary(validationErrors: ReadonlyArray<UiValidationError>): string {
    const firstError = validationErrors[0];
    const firstMessage = firstError.messages[0];
    return `Помилка валідації: ${firstMessage}`;
  }

  private extractValidationErrors(errorBody: unknown): UiValidationError[] {
    if (!errorBody || typeof errorBody !== 'object') {
      return [];
    }

    const restErrors = this.tryExtractRestValidationErrors(errorBody as Record<string, unknown>);
    if (restErrors.length > 0) {
      return restErrors;
    }

    return this.tryExtractGraphQlValidationErrors(errorBody as Record<string, unknown>);
  }

  private tryExtractRestValidationErrors(errorBody: Record<string, unknown>): UiValidationError[] {
    const errorsCandidate = errorBody['errors'];
    if (!errorsCandidate || typeof errorsCandidate !== 'object' || Array.isArray(errorsCandidate)) {
      return [];
    }

    return Object.entries(errorsCandidate).flatMap(([field, value]) => {
      if (!Array.isArray(value)) {
        return [];
      }

      const messages = value.filter((item): item is string => typeof item === 'string');
      if (messages.length === 0) {
        return [];
      }

      return [{ field, messages }];
    });
  }

  private tryExtractGraphQlValidationErrors(errorBody: Record<string, unknown>): UiValidationError[] {
    const errorsCandidate = errorBody['errors'];
    if (!Array.isArray(errorsCandidate)) {
      return [];
    }

    return errorsCandidate.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') {
        return [];
      }

      const extensions = (entry as Record<string, unknown>)['extensions'];
      if (!extensions || typeof extensions !== 'object') {
        return [];
      }

      const validationErrors = (extensions as Record<string, unknown>)['validationErrors'];
      if (!validationErrors || typeof validationErrors !== 'object' || Array.isArray(validationErrors)) {
        return [];
      }

      return Object.entries(validationErrors).flatMap(([field, value]) => {
        if (!Array.isArray(value)) {
          return [];
        }

        const messages = value.filter((item): item is string => typeof item === 'string');
        if (messages.length === 0) {
          return [];
        }

        return [{ field, messages }];
      });
    });
  }
}

