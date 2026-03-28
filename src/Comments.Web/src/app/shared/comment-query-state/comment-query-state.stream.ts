import { BehaviorSubject, EMPTY, Observable, Subject, Subscription, catchError, retry, switchMap, tap, timer } from 'rxjs';

/**
 * Уніфікований стан завантаження даних для list/thread/search/realtime сценаріїв.
 */
export interface CommentQueryState<TData> {
  /** Останні успішно завантажені дані. */
  data: TData | null;
  /** Прапорець активного запиту. */
  isLoading: boolean;
  /** Людиночитане повідомлення про помилку. */
  errorMessage: string;
  /** Чи показувати підказку повторної спроби. */
  canRetry: boolean;
}

/**
 * Контракт UI-помилки, який повертає presenter з API/мережевого шару.
 */
export interface CommentQueryUiError {
  /** Короткий текст помилки для користувача. */
  summary: string;
  /** Ознака, що операцію можна безпечно повторити. */
  canRetry: boolean;
}

/**
 * RxJS-stream оркестратор для повторного використання lifecycle завантаження.
 */
export interface CommentQueryStateStreamOptions {
  /**
   * Кількість автоматичних retry-спроб для тимчасових помилок (0 = вимкнено).
   */
  autoRetryCount?: number;
  /**
   * Базова затримка для backoff між retry-спробами у мілісекундах.
   */
  autoRetryBaseDelayMs?: number;
}

/**
 * Значення за замовчуванням для retry UX без агресивного перевантаження API.
 */
const DEFAULT_STREAM_OPTIONS: Required<CommentQueryStateStreamOptions> = {
  autoRetryCount: 0,
  autoRetryBaseDelayMs: 500
};

export class CommentQueryStateStream<TRequest, TData> {
  private readonly reloadRequests$ = new Subject<TRequest>();
  private readonly stateSubject = new BehaviorSubject<CommentQueryState<TData>>({
    data: null,
    isLoading: false,
    errorMessage: '',
    canRetry: false
  });
  private readonly subscription: Subscription;

  constructor(
    private readonly requestData: (request: TRequest) => Observable<TData>,
    private readonly presentError: (error: unknown) => CommentQueryUiError,
    options?: CommentQueryStateStreamOptions
  ) {
    const streamOptions = {
      ...DEFAULT_STREAM_OPTIONS,
      ...options
    };

    this.subscription = this.reloadRequests$
      .pipe(
        tap(() => {
          const currentState = this.stateSubject.value;
          this.stateSubject.next({
            ...currentState,
            isLoading: true,
            errorMessage: '',
            canRetry: false
          });
        }),
        switchMap((request) =>
          this.requestData(request).pipe(
            retry({
              count: streamOptions.autoRetryCount,
              delay: (error, retryCount) => {
                const uiError = this.presentError(error);
                if (!uiError.canRetry) {
                  throw error;
                }

                // Лінійний backoff: 500мс, 1000мс, 1500мс...
                return timer(streamOptions.autoRetryBaseDelayMs * retryCount);
              }
            }),
            tap((response) => {
              this.stateSubject.next({
                data: response,
                isLoading: false,
                errorMessage: '',
                canRetry: false
              });
            }),
            catchError((error) => {
              const uiError = this.presentError(error);
              const currentState = this.stateSubject.value;
              this.stateSubject.next({
                data: currentState.data,
                isLoading: false,
                errorMessage: uiError.summary,
                canRetry: uiError.canRetry
              });
              return EMPTY;
            })
          )
        )
      )
      .subscribe();
  }

  /** Поточний snapshot стану для imperative-використання в компоненті. */
  get snapshot(): CommentQueryState<TData> {
    return this.stateSubject.value;
  }

  /** Запускає новий цикл завантаження з параметрами запиту. */
  reload(request: TRequest): void {
    this.reloadRequests$.next(request);
  }

  /** Дає змогу підписатися на зміни стану з компонентів. */
  subscribe(next: (state: CommentQueryState<TData>) => void): Subscription {
    return this.stateSubject.subscribe(next);
  }

  /**
   * Локально оновлює поточні дані (наприклад, для realtime merge) без запуску нового HTTP/GraphQL запиту.
   */
  mutateData(mutator: (currentData: TData | null) => TData | null): void {
    const currentState = this.stateSubject.value;
    const nextData = mutator(currentState.data);

    this.stateSubject.next({
      ...currentState,
      data: nextData
    });
  }

  /** Вивільняє внутрішні RxJS ресурси під час destroy компонента. */
  destroy(): void {
    this.subscription.unsubscribe();
    this.stateSubject.complete();
    this.reloadRequests$.complete();
  }
}