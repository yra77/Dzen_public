export interface CommentAttachment {
  /** Оригінальна назва вкладення, яку ввів користувач. */
  fileName: string;
  /** MIME-тип файлу, дозволений серверною валідацією. */
  contentType: string;
  /** Шлях до збереженого файла на бекенді. */
  storagePath: string;
  /** Розмір вкладення у байтах. */
  sizeBytes: number;
}

export interface CommentNode {
  /** Унікальний ідентифікатор коментаря. */
  id: string;
  /** Посилання на батьківський коментар, null для root-вузла. */
  parentId: string | null;
  /** Ім'я автора. */
  userName: string;
  /** Email автора (для валідації/адмін-дій). */
  email: string;
  /** Домашня сторінка автора, якщо її було вказано. */
  homePage: string | null;
  /** Санітизований текст коментаря. */
  text: string;
  /** UTC-дата створення коментаря. */
  createdAtUtc: string;
  /** Додане вкладення (за наявності). */
  attachment: CommentAttachment | null;
  /** Дочірні відповіді у вигляді дерева. */
  replies: CommentNode[];
}

export interface PagedCommentsResponse {
  /** Номер запитаної сторінки. */
  page: number;
  /** Кількість елементів на сторінці. */
  pageSize: number;
  /** Загальна кількість root-коментарів. */
  totalCount: number;
  /** Поточна порція коментарів. */
  items: CommentNode[];
}

/** Доступні поля сортування root-коментарів у frontend-контрактах. */
export type RootCommentsSortField = 'CreatedAtUtc' | 'UserName' | 'Email';

/** Доступні напрямки сортування root-коментарів у frontend-контрактах. */
export type RootCommentsSortDirection = 'Asc' | 'Desc';

export interface CreateCommentAttachmentRequest {
  /** Ім'я файлу, що буде відображено в UI. */
  fileName: string;
  /** MIME-тип файлу для серверної перевірки. */
  contentType: string;
  /** Вміст файлу у Base64 без data-url префікса. */
  base64Content: string;
}

export interface CreateCommentRequest {
  /** Ім'я автора коментаря. */
  userName: string;
  /** Email автора. */
  email: string;
  /** Необов'язковий URL домашньої сторінки. */
  homePage: string | null;
  /** Текст нового коментаря/відповіді. */
  text: string;
  /** Батьківський id: null для root, id коментаря для reply. */
  parentId: string | null;
  /** CAPTCHA токен у форматі challengeId:answer. */
  captchaToken: string | null;
  /** Необов'язкове вкладення. */
  attachment: CreateCommentAttachmentRequest | null;
}

export interface CaptchaImageResponse {
  /** Ідентифікатор captcha-челенджу. */
  challengeId: string;
  /** Зображення captcha у Base64. */
  imageBase64: string;
  /** MIME-тип зображення captcha. */
  mimeType: string;
  /** Час життя captcha у секундах. */
  ttlSeconds: number;
}
