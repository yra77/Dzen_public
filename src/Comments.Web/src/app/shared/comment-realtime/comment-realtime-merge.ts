import { CommentNode, PagedCommentsResponse, RootCommentsSortDirection, RootCommentsSortField } from '../../core/comments.models';

/**
 * Результат спроби realtime-merge для UI-стану.
 */
export interface RealtimeMergeResult<TData> {
  /** Оновлені дані після merge (або початкові, якщо merge не застосовано). */
  data: TData;
  /** Чи вдалося застосувати payload без повного перезавантаження. */
  wasMerged: boolean;
}

/**
 * Повертає true, якщо кореневий список зараз у режимі, де можна безпечно локально додавати нові root-коментарі.
 */
function canPrependRootComment(
  page: number,
  sortBy: RootCommentsSortField,
  sortDirection: RootCommentsSortDirection
): boolean {
  return page === 1 && sortBy === 'CreatedAtUtc' && sortDirection === 'Desc';
}

/**
 * Вставляє відповідь у дерево коментарів за parentId.
 */
function insertReplyIntoTree(nodes: ReadonlyArray<CommentNode>, incoming: CommentNode): RealtimeMergeResult<ReadonlyArray<CommentNode>> {
  let wasMerged = false;

  const updatedNodes = nodes.map((node) => {
    if (node.id === incoming.id) {
      wasMerged = true;
      return node;
    }

    if (node.id === incoming.parentId) {
      const hasDuplicate = node.replies.some((reply) => reply.id === incoming.id);
      if (hasDuplicate) {
        wasMerged = true;
        return node;
      }

      wasMerged = true;
      return {
        ...node,
        replies: [...node.replies, incoming]
      };
    }

    const nestedMerge = insertReplyIntoTree(node.replies, incoming);
    if (!nestedMerge.wasMerged) {
      return node;
    }

    wasMerged = true;
    return {
      ...node,
      replies: [...nestedMerge.data]
    };
  });

  return {
    data: updatedNodes,
    wasMerged
  };
}

/**
 * Застосовує payload realtime-події до paged root-list без повного reload, коли це можливо.
 */
export function mergeCommentIntoRootPage(
  currentPageData: PagedCommentsResponse,
  incoming: CommentNode,
  page: number,
  sortBy: RootCommentsSortField,
  sortDirection: RootCommentsSortDirection
): RealtimeMergeResult<PagedCommentsResponse> {
  if (!incoming.parentId && canPrependRootComment(page, sortBy, sortDirection)) {
    const hasDuplicate = currentPageData.items.some((comment) => comment.id === incoming.id);
    if (hasDuplicate) {
      return { data: currentPageData, wasMerged: true };
    }

    return {
      data: {
        ...currentPageData,
        totalCount: currentPageData.totalCount + 1,
        items: [incoming, ...currentPageData.items].slice(0, currentPageData.pageSize)
      },
      wasMerged: true
    };
  }

  const replyMerge = insertReplyIntoTree(currentPageData.items, incoming);
  if (!replyMerge.wasMerged) {
    return { data: currentPageData, wasMerged: false };
  }

  return {
    data: {
      ...currentPageData,
      items: [...replyMerge.data]
    },
    wasMerged: true
  };
}

/**
 * Застосовує payload realtime-події до відкритої гілки без повного reload, коли parent є в поточному дереві.
 */
export function mergeCommentIntoThread(
  currentThread: CommentNode,
  incoming: CommentNode
): RealtimeMergeResult<CommentNode> {
  if (currentThread.id === incoming.id) {
    return { data: currentThread, wasMerged: true };
  }

  if (!incoming.parentId) {
    return { data: currentThread, wasMerged: false };
  }

  const replyMerge = insertReplyIntoTree([currentThread], incoming);
  if (!replyMerge.wasMerged || replyMerge.data.length < 1) {
    return { data: currentThread, wasMerged: false };
  }

  return {
    data: replyMerge.data[0],
    wasMerged: true
  };
}
