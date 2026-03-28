/**
 * Додаткові поля GraphQL-помилки, які повертає сервер у `errors[].extensions`.
 */
export interface GraphqlErrorExtensions {
  code?: string;
  validationErrors?: Record<string, string[]>;
}

/**
 * Окремий елемент масиву GraphQL-помилок.
 */
export interface GraphqlErrorEntry {
  message: string;
  extensions?: GraphqlErrorExtensions;
}

/**
 * Спеціалізована помилка GraphQL-рівня для коректного UX-представлення (retry/validation).
 */
export class GraphqlRequestError extends Error {
  /** Первинний масив GraphQL-помилок із payload відповіді сервера. */
  readonly errors: ReadonlyArray<GraphqlErrorEntry>;
  /** Чи є серед GraphQL-помилок ознаки тимчасового збою, для якого можна запропонувати retry. */
  readonly canRetry: boolean;

  constructor(errors: ReadonlyArray<GraphqlErrorEntry>) {
    super(errors.map((error) => error.message).join('; '));
    this.name = 'GraphqlRequestError';
    this.errors = errors;
    this.canRetry = errors.some((error) => GraphqlRequestError.isTransientCode(error.extensions?.code));
  }

  /** Визначає, чи GraphQL `extensions.code` належить до набору тимчасових помилок. */
  private static isTransientCode(code: string | undefined): boolean {
    if (!code) {
      return false;
    }

    const transientCodes = new Set([
      'INTERNAL_SERVER_ERROR',
      'REQUEST_TIMEOUT',
      'TIMEOUT',
      'TOO_MANY_REQUESTS',
      'THROTTLED',
      'SERVICE_UNAVAILABLE'
    ]);

    return transientCodes.has(code.toUpperCase());
  }
}