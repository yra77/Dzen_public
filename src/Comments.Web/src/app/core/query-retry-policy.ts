/**
 * Єдиний retry-профіль для короткочасних network/server збоїв під час завантаження comment list/thread/search.
 *
 * Важливо: значення тримаємо консервативними, щоб не перевантажувати API та не погіршувати UX.
 */
export const COMMENT_QUERY_RETRY_POLICY = {
  /**
   * Кількість додаткових спроб після першої невдалої відповіді.
   */
  autoRetryCount: 2,
  /**
   * Базова затримка (мс) для лінійного backoff між повторними спробами.
   */
  autoRetryBaseDelayMs: 600
} as const;
