/**
 * Будує GraphQL fragment для вузла коментаря із заданою глибиною вкладеності `replies`.
 * @param fragmentPrefix Префікс імені fragment (щоб уникати колізій між різними запитами).
 * @param depth Поточна глибина фрагмента (1 = кореневий рівень).
 * @param maxDepth Максимальна глибина дерева, яку дозволяємо запитувати.
 */
function buildCommentFragment(fragmentPrefix: string, depth: number, maxDepth: number): string {
  const fragmentName = `${fragmentPrefix}Level${depth}`;
  const nextFragmentName = `${fragmentPrefix}Level${depth + 1}`;
  const hasNestedReplies = depth < maxDepth;

  return `
fragment ${fragmentName} on CommentDto {
  id
  parentId
  userName
  email
  homePage
  text
  createdAtUtc
  attachment {
    ...${fragmentPrefix}Attachment
  }
  ${hasNestedReplies
    ? `replies {
    ...${nextFragmentName}
  }`
    : '# На найглибшому рівні replies не запитуємо, щоб не створювати id-only вузли.'}
  __typename
}`;
}

/**
 * Генерує повний набір fragment-блоків для дерева коментарів фіксованої глибини.
 * Використовується як для root-list, так і для thread-сторінки, щоб уникнути розсинхрону selection set.
 */
function buildCommentTreeFragments(fragmentPrefix: string, maxDepth: number): string {
  const fragments: string[] = [
    `
fragment ${fragmentPrefix}Attachment on AttachmentDto {
  fileName
  contentType
  storagePath
  sizeBytes
  __typename
}`
  ];

  for (let depth = maxDepth; depth >= 1; depth -= 1) {
    fragments.push(buildCommentFragment(fragmentPrefix, depth, maxDepth));
  }

  return fragments.join('\n\n');
}

/** GraphQL query для отримання сторінки root-коментарів з уніфікованими tree fragments. */
export const GET_ROOT_COMMENTS_QUERY = `
query GetRootComments($page: Int!, $pageSize: Int!, $sortBy: CommentSortField!, $sortDirection: CommentSortDirection!) {
  comments(page: $page, pageSize: $pageSize, sortBy: $sortBy, sortDirection: $sortDirection) {
    page
    pageSize
    totalCount
    items {
      ...RootCommentLevel1
    }
  }
}

${buildCommentTreeFragments('RootComment', 5)}
`;

/** GraphQL query для повнотекстового пошуку коментарів із пагінацією. */
export const GET_SEARCH_COMMENTS_QUERY = `
query SearchComments($query: String!, $page: Int!, $pageSize: Int!) {
  searchComments(query: $query, page: $page, pageSize: $pageSize) {
    page
    pageSize
    totalCount
    items {
      ...SearchCommentLevel1
    }
  }
}

${buildCommentTreeFragments('SearchComment', 5)}
`;

/** GraphQL query для отримання повного дерева thread-коментаря з фіксованою глибиною. */
export const GET_COMMENT_THREAD_QUERY = `
query GetCommentThread($rootCommentId: UUID!) {
  commentThread(rootCommentId: $rootCommentId) {
    ...ThreadCommentLevel1
  }
}

${buildCommentTreeFragments('ThreadComment', 5)}
`;

/** GraphQL mutation для створення нового коментаря або відповіді. */
export const CREATE_COMMENT_MUTATION = `
mutation CreateComment($input: CreateCommentInput!) {
  createComment(input: $input) {
    id
    parentId
    userName
    email
    homePage
    text
    createdAtUtc
    attachment {
      fileName
      contentType
      storagePath
      sizeBytes
    }
    replies {
      id
    }
  }
}
`;

/** GraphQL query для preview HTML-версії тексту коментаря. */
export const PREVIEW_COMMENT_QUERY = `
query PreviewComment($text: String!) {
  previewComment(text: $text)
}
`;

/** GraphQL query для отримання captcha challenge/image. */
export const GET_CAPTCHA_IMAGE_QUERY = `
query GetCaptchaImage {
  captchaImage {
    challengeId
    imageBase64
    mimeType
    ttlSeconds
  }
}
`;

/** GraphQL query для читання txt-вмісту вкладення. */
export const GET_ATTACHMENT_TEXT_PREVIEW_QUERY = `
query GetAttachmentTextPreview($storagePath: String!) {
  attachmentTextPreview(storagePath: $storagePath)
}
`;
