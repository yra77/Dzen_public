import { HttpErrorResponse } from '@angular/common/http';

import { ApiErrorPresenterService } from './api-error-presenter.service';

/**
 * Unit-тести для нормалізації API-помилок (REST/GraphQL/transient) у єдиний UI-контракт.
 */
describe('ApiErrorPresenterService', () => {
  let service: ApiErrorPresenterService;

  beforeEach(() => {
    service = new ApiErrorPresenterService();
  });

  /** Перевіряє мапінг ASP.NET ValidationProblemDetails формату. */
  it('повертає validationErrors для REST payload', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        errors: {
          'Request.CaptchaToken': ['Captcha validation failed.']
        }
      }
    });

    const result = service.present(error, 'fallback');

    expect(result.summary).toContain('Помилка валідації');
    expect(result.canRetry).toBeFalse();
    expect(result.validationErrors).toEqual([
      {
        field: 'Request.CaptchaToken',
        messages: ['Captcha validation failed.']
      }
    ]);
  });

  /** Перевіряє мапінг GraphQL validationErrors з errors[].extensions. */
  it('повертає validationErrors для GraphQL payload', () => {
    const error = new HttpErrorResponse({
      status: 200,
      error: {
        errors: [
          {
            message: 'Validation failed',
            extensions: {
              code: 'BAD_USER_INPUT',
              validationErrors: {
                'Request.Attachment': ['Attachment base64 payload is invalid.']
              }
            }
          }
        ]
      }
    });

    const result = service.present(error, 'fallback');

    expect(result.summary).toContain('Помилка валідації');
    expect(result.canRetry).toBeFalse();
    expect(result.validationErrors[0].field).toBe('Request.Attachment');
  });

  /** Перевіряє, що 503/5xx класифікуються як transient і UI може показувати retry hint. */
  it('позначає transient server error як canRetry=true', () => {
    const error = new HttpErrorResponse({
      status: 503,
      error: { message: 'Service unavailable' }
    });

    const result = service.present(error, 'fallback');

    expect(result.canRetry).toBeTrue();
    expect(result.summary).toContain('Тимчасова помилка');
    expect(result.validationErrors.length).toBe(0);
  });

  /** Перевіряє fallback для не-HTTP винятків. */
  it('повертає fallback без retry для unknown error', () => {
    const result = service.present(new Error('boom'), 'fallback text');

    expect(result).toEqual({
      summary: 'fallback text',
      validationErrors: [],
      canRetry: false
    });
  });
});
