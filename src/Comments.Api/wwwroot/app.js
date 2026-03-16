const commentsEl = document.getElementById('comments');
const form = document.getElementById('comment-form');
const statusEl = document.getElementById('form-status');
const searchEl = document.getElementById('search');
const apiModeEl = document.getElementById('apiMode');
const sortByEl = document.getElementById('sortBy');
const sortDirectionEl = document.getElementById('sortDirection');
const pageSizeEl = document.getElementById('pageSize');
const pageInfoEl = document.getElementById('page-info');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const reloadBtn = document.getElementById('reload');
const expandAllBtn = document.getElementById('expand-all');
const collapseAllBtn = document.getElementById('collapse-all');
const attachmentInput = document.getElementById('attachment');
const attachmentPreviewEl = document.getElementById('attachment-preview');
const parentIdInput = form.elements.namedItem('parentId');
const replyContextEl = document.getElementById('reply-context');
const replyContextTextEl = document.getElementById('reply-context-text');
const clearReplyContextBtn = document.getElementById('clear-reply-context');
const textInput = form.elements.namedItem('text');
const textPreviewContentEl = document.getElementById('text-preview-content');
const textValidationErrorsEl = document.getElementById('text-validation-errors');
const captchaImageEl = document.getElementById('captcha-image');
const reloadCaptchaBtn = document.getElementById('reload-captcha');
const captchaChallengeIdInput = form.elements.namedItem('captchaChallengeId');
const lightboxEl = document.getElementById('attachment-lightbox');
const lightboxImageEl = document.getElementById('lightbox-image');
const lightboxCloseBtn = document.getElementById('lightbox-close');


const MAX_ATTACHMENT_SIZE = 1024 * 1024;
const MAX_TEXT_ATTACHMENT_SIZE = 100 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set(['text/plain', 'image/png', 'image/jpeg', 'image/gif']);
const MAX_GRAPHQL_THREAD_DEPTH = 25;

let previewRequestSeq = 0;

const state = {
  page: 1,
  totalPages: 1,
  hasNextPage: false,
  isSearchMode: false,
  collapsedThreads: new Set(),
  visibleThreadIds: new Set()
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}


function toSafeHref(rawUrl) {
  const value = String(rawUrl ?? '').trim();
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    return parsed.href;
  } catch (error) {
    return null;
  }
}


function setTextValidationErrors(messages) {
  if (!textValidationErrorsEl) {
    return;
  }

  if (!messages.length) {
    textValidationErrorsEl.classList.add('hidden');
    textValidationErrorsEl.innerHTML = '';
    return;
  }

  textValidationErrorsEl.classList.remove('hidden');
  textValidationErrorsEl.innerHTML = `<ul>${messages.map((message) => `<li>${escapeHtml(message)}</li>`).join('')}</ul>`;
}

function extractTextValidationMessages(errorMessage) {
  const source = String(errorMessage ?? '');
  if (!source) {
    return [];
  }

  if (source.includes('Comment text must be valid XHTML.')) {
    return ['Текст повинен містити валідний XHTML (усі теги мають бути коректно закриті).'];
  }

  const tagNotAllowedMatch = source.match(/HTML tag '([^']+)' is not allowed/i);
  if (tagNotAllowedMatch) {
    return [`Тег <${tagNotAllowedMatch[1]}> заборонений. Дозволено лише: <a>, <code>, <i>, <strong>.`];
  }

  if (source.includes("Only 'href' attribute is allowed for <a> tags.")) {
    return ['Для тегу <a> дозволено тільки атрибут href.'];
  }

  if (source.includes('<a href> must be a valid absolute http/https URL.')) {
    return ['У <a href> потрібно вказати абсолютний URL з протоколом http або https.'];
  }

  const attrsNotAllowedMatch = source.match(/Attributes are not allowed for <([^>]+)> tags\./i);
  if (attrsNotAllowedMatch) {
    return [`Атрибути заборонені для тегу <${attrsNotAllowedMatch[1]}>.`];
  }

  return [];
}

async function fetchPreviewViaRest(text) {
  const response = await fetch('/api/comments/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.text();
}

async function fetchPreviewViaGraphQl(text) {
  const data = await fetchGraphQl(
    `query PreviewComment($text: String!) {
  previewComment(text: $text)
}`,
    { text });

  return data.previewComment;
}


async function loadCaptcha() {
  const response = await fetch('/api/captcha/image');
  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = await response.json();
  captchaChallengeIdInput.value = data.challengeId;
  captchaImageEl.src = `data:${data.mimeType};base64,${data.imageBase64}`;
}

async function renderTextPreview(rawText) {
  const source = String(rawText ?? '');
  if (!source.trim()) {
    textPreviewContentEl.innerHTML = 'Попередній перегляд зʼявиться тут…';
    setTextValidationErrors([]);
    return;
  }

  const requestId = ++previewRequestSeq;

  try {
    const previewText = apiModeEl.value === 'graphql'
      ? await fetchPreviewViaGraphQl(source)
      : await fetchPreviewViaRest(source);

    if (requestId !== previewRequestSeq) {
      return;
    }

    textPreviewContentEl.innerHTML = String(previewText).replace(/\n/g, '<br />');
    setTextValidationErrors([]);
  } catch (error) {
    if (requestId !== previewRequestSeq) {
      return;
    }

    const validationMessages = extractTextValidationMessages(error?.message || '');
    setTextValidationErrors(validationMessages);
    textPreviewContentEl.innerHTML = validationMessages.length
      ? 'Preview недоступний, доки не виправите помилки форматування.'
      : 'Не вдалося побудувати preview на сервері.';
  }
}

function insertTag(tag) {
  const textarea = textInput;
  if (!(textarea instanceof HTMLTextAreaElement)) {
    return;
  }

  const selectionStart = textarea.selectionStart ?? 0;
  const selectionEnd = textarea.selectionEnd ?? selectionStart;
  const selectedText = textarea.value.slice(selectionStart, selectionEnd);

  const openTag = `<${tag}>`;
  const closeTag = `</${tag}>`;
  let replacement = `${openTag}${selectedText}${closeTag}`;
  let caretPosition = selectionStart + openTag.length;

  if (tag === 'a') {
    const hasSelection = selectedText.trim().length > 0;
    const linkText = hasSelection ? selectedText : 'посилання';
    replacement = `<a href="https://example.com">${linkText}</a>`;
    caretPosition = hasSelection
      ? selectionStart + replacement.length
      : selectionStart + '<a href="'.length;
  } else if (selectedText.length > 0) {
    caretPosition = selectionStart + replacement.length;
  }

  textarea.setRangeText(replacement, selectionStart, selectionEnd, 'end');
  textarea.focus();
  textarea.setSelectionRange(caretPosition, caretPosition);
  renderTextPreview(textarea.value);
}

function isAllowedAttachment(file) {
  return ALLOWED_ATTACHMENT_TYPES.has(file.type || '');
}

async function fileToAttachment(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return {
    fileName: file.name,
    contentType: file.type || 'application/octet-stream',
    base64Content: btoa(binary)
  };
}


function buildCaptchaToken(formData) {
  const challengeId = formData.get('captchaChallengeId')?.toString().trim() || '';
  const answer = formData.get('captchaAnswer')?.toString().trim() || '';
  if (!challengeId || !answer) {
    return null;
  }

  return `${challengeId}:${answer}`;
}

function renderAttachment(attachment) {
  if (!attachment) {
    return '';
  }

  const fileName = escapeHtml(attachment.fileName);
  const storagePath = `/${attachment.storagePath}`;

  if (attachment.contentType?.startsWith('image/')) {
    return `
      <figure class="attachment-preview-inline">
        <button class="attachment-image-button" type="button" data-lightbox-src="${storagePath}" data-lightbox-alt="${fileName}">
          <img src="${storagePath}" alt="${fileName}" loading="lazy" />
        </button>
        <figcaption>📎 <a href="${storagePath}" target="_blank" rel="noreferrer">${fileName}</a> · <button class="link-like" type="button" data-lightbox-src="${storagePath}" data-lightbox-alt="${fileName}">Відкрити preview</button></figcaption>
      </figure>
    `;
  }

  return `<div>📎 <a href="${storagePath}" target="_blank" rel="noreferrer">${fileName}</a></div>`;
}

function buildReplyButton(commentId) {
  return `<button class="reply-btn" type="button" data-reply-id="${escapeHtml(commentId)}">↪ Відповісти</button>`;
}

function openAttachmentLightbox(src, alt) {
  if (!(lightboxEl instanceof HTMLDialogElement) || !(lightboxImageEl instanceof HTMLImageElement)) {
    return;
  }

  lightboxImageEl.src = src;
  lightboxImageEl.alt = alt || 'Збільшене вкладення';
  if (!lightboxEl.open) {
    lightboxEl.showModal();
  }
}

function closeAttachmentLightbox() {
  if (!(lightboxEl instanceof HTMLDialogElement) || !(lightboxImageEl instanceof HTMLImageElement)) {
    return;
  }

  if (lightboxEl.open) {
    lightboxEl.close();
  }

  lightboxImageEl.src = '';
}

function buildToggleThreadButton(comment) {
  const repliesCount = comment.replies?.length ?? 0;
  if (!repliesCount) {
    return '';
  }

  const commentId = String(comment.id);
  const isCollapsed = state.collapsedThreads.has(commentId);
  const label = isCollapsed
    ? `Розгорнути відповіді (${repliesCount})`
    : `Згорнути відповіді (${repliesCount})`;

  return `<button class="secondary-button" type="button" data-toggle-thread-id="${escapeHtml(commentId)}">${label}</button>`;
}

function renderComment(comment) {
  const attachment = renderAttachment(comment.attachment);

  const homepage = comment.homePage
    ? ` · <a href="${escapeHtml(comment.homePage)}" target="_blank" rel="noreferrer">сайт</a>`
    : '';

  const replies = comment.replies?.length
    ? state.collapsedThreads.has(String(comment.id))
      ? '<div class="replies-collapsed">Відповіді приховано.</div>'
      : `<div class="replies">${comment.replies.map(renderComment).join('')}</div>`
    : '';

  return `
    <article class="comment">
      <div><strong>${escapeHtml(comment.userName)}</strong> (${escapeHtml(comment.email)})${homepage}</div>
      <div class="meta">${new Date(comment.createdAtUtc).toLocaleString()} · ID: ${escapeHtml(comment.id)}</div>
      <p>${escapeHtml(comment.text)}</p>
      <div class="comment-actions">${buildReplyButton(comment.id)} ${buildToggleThreadButton(comment)}</div>
      ${attachment}
      ${replies}
    </article>
  `;
}

function renderRootCommentsTable(comments) {
  if (!comments.length) {
    return '<p>Коментарів ще немає.</p>';
  }

  const rows = comments.map((comment) => {
    const homepage = comment.homePage
      ? `<a href="${escapeHtml(comment.homePage)}" target="_blank" rel="noreferrer">сайт</a>`
      : '—';

    const replies = comment.replies?.length
      ? state.collapsedThreads.has(String(comment.id))
        ? '<div class="replies-collapsed">Відповіді приховано.</div>'
        : `<div class="replies">${comment.replies.map(renderComment).join('')}</div>`
      : '<div class="replies-empty">Немає відповідей.</div>';

    return `
      <tr>
        <td><strong>${escapeHtml(comment.userName)}</strong></td>
        <td>${escapeHtml(comment.email)}</td>
        <td>${homepage}</td>
        <td>${new Date(comment.createdAtUtc).toLocaleString()}</td>
        <td>${escapeHtml(comment.text)}</td>
        <td>
          ${renderAttachment(comment.attachment)}
          <div class="comment-actions">${buildReplyButton(comment.id)} ${buildToggleThreadButton(comment)}</div>
        </td>
      </tr>
      <tr class="root-comment-thread-row">
        <td colspan="6">
          <div class="meta">ID: ${escapeHtml(comment.id)}</div>
          ${replies}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="comments-table-wrapper">
      <table class="comments-table">
        <thead>
          <tr>
            <th>Користувач</th>
            <th>Email</th>
            <th>HomePage</th>
            <th>Дата</th>
            <th>Текст</th>
            <th>Дії / Вкладення</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}


function collectCommentIdsWithReplies(comments, target = new Set()) {
  for (const comment of comments ?? []) {
    if ((comment.replies?.length ?? 0) > 0) {
      target.add(String(comment.id));
      collectCommentIdsWithReplies(comment.replies, target);
    }
  }

  return target;
}

function syncVisibleThreadIds(comments) {
  state.visibleThreadIds = collectCommentIdsWithReplies(comments);
  state.collapsedThreads = new Set(
    [...state.collapsedThreads].filter((id) => state.visibleThreadIds.has(id))
  );

  const hasThreads = state.visibleThreadIds.size > 0;
  expandAllBtn.disabled = !hasThreads;
  collapseAllBtn.disabled = !hasThreads;
}

function updatePaginationControls() {
  pageInfoEl.textContent = `Сторінка ${state.page} з ${state.totalPages}`;
  prevPageBtn.disabled = state.page <= 1;
  nextPageBtn.disabled = !state.hasNextPage;
}

function showAttachmentPreview(file) {
  attachmentPreviewEl.innerHTML = '';

  if (!file) {
    return true;
  }

  if (!isAllowedAttachment(file)) {
    attachmentPreviewEl.innerHTML = '<p class="error">Недозволений тип вкладення.</p>';
    return false;
  }

  if (file.type === 'text/plain' && file.size > MAX_TEXT_ATTACHMENT_SIZE) {
    attachmentPreviewEl.innerHTML = '<p class="error">TXT-файл перевищує 100KB.</p>';
    return false;
  }

  if (file.size > MAX_ATTACHMENT_SIZE) {
    attachmentPreviewEl.innerHTML = '<p class="error">Файл перевищує 1MB.</p>';
    return false;
  }

  if (file.type.startsWith('image/')) {
    const objectUrl = URL.createObjectURL(file);
    attachmentPreviewEl.innerHTML = `
      <figure class="attachment-preview-inline">
        <img src="${objectUrl}" alt="Попередній перегляд" />
        <figcaption>${escapeHtml(file.name)} (${Math.round(file.size / 1024)} KB)</figcaption>
      </figure>
    `;
    const img = attachmentPreviewEl.querySelector('img');
    img?.addEventListener('load', () => URL.revokeObjectURL(objectUrl), { once: true });
    return true;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || '').slice(0, 500);
    attachmentPreviewEl.innerHTML = `
      <div class="text-preview">
        <div><strong>${escapeHtml(file.name)}</strong> (${Math.round(file.size / 1024)} KB)</div>
        <pre>${escapeHtml(text)}</pre>
      </div>
    `;
  };
  reader.readAsText(file);
  return true;
}

async function fetchGraphQl(query, variables = {}) {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((x) => x.message).join('; '));
  }

  return payload.data;
}

async function fetchCommentsViaRest(q, page, pageSize) {
  const query = q
    ? `/api/comments/search?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`
    : `/api/comments?page=${page}&pageSize=${pageSize}&sortBy=${sortByEl.value}&sortDirection=${sortDirectionEl.value}`;

  const response = await fetch(query);
  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

async function fetchCommentsViaGraphQl(q, page, pageSize) {
  const buildRepliesSelection = (depth) => {
    if (depth <= 0) {
      return '';
    }

    return `
      replies {
        id
        parentId
        userName
        email
        homePage
        text
        createdAtUtc
        attachment { fileName contentType storagePath sizeBytes }${buildRepliesSelection(depth - 1)}
      }`;
  };

  const commentSelection = `
      id
      parentId
      userName
      email
      homePage
      text
      createdAtUtc
      attachment { fileName contentType storagePath sizeBytes }${buildRepliesSelection(MAX_GRAPHQL_THREAD_DEPTH)}
  `;

  const document = q
    ? `query SearchComments($query: String!, $page: Int!, $pageSize: Int!) {
  searchComments(query: $query, page: $page, pageSize: $pageSize) {
    page
    pageSize
    totalCount
    totalPages
    items {
${commentSelection}
    }
  }
}`
    : `query Comments($page: Int!, $pageSize: Int!, $sortBy: CommentSortField!, $sortDirection: CommentSortDirection!) {
  comments(page: $page, pageSize: $pageSize, sortBy: $sortBy, sortDirection: $sortDirection) {
    page
    pageSize
    totalCount
    totalPages
    items {
${commentSelection}
    }
  }
}`;

  const variables = q
    ? { query: q, page, pageSize }
    : { page, pageSize, sortBy: sortByEl.value, sortDirection: sortDirectionEl.value };

  const data = await fetchGraphQl(document, variables);
  return q ? data.searchComments : data.comments;
}

async function loadComments(page = state.page) {
  const q = searchEl.value.trim();
  const pageSize = Number(pageSizeEl.value || '25');
  state.page = Math.max(1, page);
  state.isSearchMode = Boolean(q);

  const useGraphQl = apiModeEl.value === 'graphql';
  const data = useGraphQl
    ? await fetchCommentsViaGraphQl(q, state.page, pageSize)
    : await fetchCommentsViaRest(q, state.page, pageSize);
  state.totalPages = Math.max(1, data.totalPages || 1);
  state.hasNextPage = data.page < data.totalPages;
  state.page = data.page;
  updatePaginationControls();

  syncVisibleThreadIds(data.items);

  commentsEl.innerHTML = renderRootCommentsTable(data.items);
}

function clearReplyContext(showStatus = true) {
  parentIdInput.value = '';
  replyContextEl.classList.add('hidden');
  replyContextTextEl.textContent = '';

  if (showStatus) {
    statusEl.className = 'status';
    statusEl.textContent = 'Режим відповіді скасовано.';
  }
}

function focusReply(commentId) {
  parentIdInput.value = commentId;
  replyContextEl.classList.remove('hidden');
  replyContextTextEl.textContent = `Ви відповідаєте на коментар ${commentId}`;
  parentIdInput.focus();
  parentIdInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  statusEl.className = 'status ok';
  statusEl.textContent = `Відповідь буде додана до коментаря ${commentId}`;
}

attachmentInput.addEventListener('change', (e) => {
  const file = e.target.files?.[0] ?? null;
  showAttachmentPreview(file);
});

commentsEl.addEventListener('click', (e) => {
  const lightboxTarget = e.target.closest('[data-lightbox-src]');
  if (lightboxTarget) {
    const src = lightboxTarget.getAttribute('data-lightbox-src');
    const alt = lightboxTarget.getAttribute('data-lightbox-alt') || 'Збільшене вкладення';
    if (src) {
      openAttachmentLightbox(src, alt);
    }

    return;
  }

  const toggleTarget = e.target.closest('[data-toggle-thread-id]');
  if (toggleTarget) {
    const commentId = toggleTarget.getAttribute('data-toggle-thread-id');
    if (!commentId) {
      return;
    }

    if (state.collapsedThreads.has(commentId)) {
      state.collapsedThreads.delete(commentId);
    } else {
      state.collapsedThreads.add(commentId);
    }

    loadComments(state.page).catch((error) => {
      commentsEl.innerHTML = `<p>Помилка завантаження: ${error.message}</p>`;
    });
    return;
  }

  const target = e.target.closest('[data-reply-id]');
  if (!target) {
    return;
  }

  const commentId = target.getAttribute('data-reply-id');
  if (commentId) {
    focusReply(commentId);
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.className = 'status';
  statusEl.textContent = 'Збереження...';
  setTextValidationErrors([]);

  try {
    const formData = new FormData(form);
    const file = formData.get('attachment');
    const attachmentFile = file && file.size > 0 ? file : null;

    if (attachmentFile && !showAttachmentPreview(attachmentFile)) {
      throw new Error('Виправте помилки у вкладенні.');
    }

    const attachment = attachmentFile ? await fileToAttachment(attachmentFile) : null;

    const payload = {
      userName: formData.get('userName')?.toString().trim(),
      email: formData.get('email')?.toString().trim(),
      homePage: formData.get('homePage')?.toString().trim() || null,
      text: formData.get('text')?.toString().trim(),
      parentId: formData.get('parentId')?.toString().trim() || null,
      captchaToken: buildCaptchaToken(formData),
      attachment
    };

    if (apiModeEl.value === 'graphql') {
      await fetchGraphQl(
        `mutation CreateComment($input: CreateCommentInput!) {
  createComment(input: $input) { id }
}`,
        { input: payload });
    } else {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
    }

    form.reset();
    state.page = 1;
    attachmentPreviewEl.innerHTML = '';
    clearReplyContext(false);
    statusEl.classList.add('ok');
    statusEl.textContent = 'Коментар створено.';
    await loadCaptcha();
    await loadComments(1);
  } catch (error) {
    const validationMessages = extractTextValidationMessages(error?.message || '');
    if (validationMessages.length) {
      setTextValidationErrors(validationMessages);
    }

    statusEl.classList.add('error');
    statusEl.textContent = `Помилка: ${error.message}`;
  }
});

reloadBtn.addEventListener('click', () => {
  state.page = 1;
  loadComments(1).catch((error) => {
    commentsEl.innerHTML = `<p>Помилка завантаження: ${error.message}</p>`;
  });
});

prevPageBtn.addEventListener('click', () => {
  if (state.page <= 1) {
    return;
  }

  loadComments(state.page - 1).catch((error) => {
    commentsEl.innerHTML = `<p>Помилка завантаження: ${error.message}</p>`;
  });
});

nextPageBtn.addEventListener('click', () => {
  if (!state.hasNextPage) {
    return;
  }

  loadComments(state.page + 1).catch((error) => {
    commentsEl.innerHTML = `<p>Помилка завантаження: ${error.message}</p>`;
  });
});

clearReplyContextBtn.addEventListener('click', () => {
  clearReplyContext();
});

expandAllBtn.addEventListener('click', () => {
  state.collapsedThreads.clear();
  loadComments(state.page).catch((error) => {
    commentsEl.innerHTML = `<p>Помилка завантаження: ${error.message}</p>`;
  });
});

collapseAllBtn.addEventListener('click', () => {
  state.collapsedThreads = new Set(state.visibleThreadIds);
  loadComments(state.page).catch((error) => {
    commentsEl.innerHTML = `<p>Помилка завантаження: ${error.message}</p>`;
  });
});

textInput.addEventListener('input', () => {
  renderTextPreview(textInput.value);
});

document.querySelectorAll('.quick-tag-btn').forEach((button) => {
  button.addEventListener('click', () => {
    const tag = button.getAttribute('data-tag');
    if (!tag) {
      return;
    }

    insertTag(tag);
  });
});

parentIdInput.addEventListener('input', () => {
  const manualValue = parentIdInput.value.trim();
  if (!manualValue) {
    replyContextEl.classList.add('hidden');
    replyContextTextEl.textContent = '';
    return;
  }

  replyContextEl.classList.remove('hidden');
  replyContextTextEl.textContent = `Встановлено parentId: ${manualValue}`;
});

apiModeEl.addEventListener('change', () => {
  setTextValidationErrors([]);
  reloadBtn.click();
  renderTextPreview(textInput.value);
});

reloadCaptchaBtn.addEventListener('click', () => {
  loadCaptcha().catch((error) => {
    statusEl.classList.add('error');
    statusEl.textContent = `Помилка captcha: ${error.message}`;
  });
});

lightboxCloseBtn?.addEventListener('click', () => {
  closeAttachmentLightbox();
});

lightboxEl?.addEventListener('click', (event) => {
  if (event.target === lightboxEl) {
    closeAttachmentLightbox();
  }
});

lightboxEl?.addEventListener('close', () => {
  closeAttachmentLightbox();
});
sortByEl.addEventListener('change', () => reloadBtn.click());
sortDirectionEl.addEventListener('change', () => reloadBtn.click());

loadCaptcha().catch((error) => {
  statusEl.classList.add('error');
  statusEl.textContent = `Помилка captcha: ${error.message}`;
});

loadComments(1).catch((error) => {
  commentsEl.innerHTML = `<p>Помилка завантаження: ${error.message}</p>`;
});
pageSizeEl.addEventListener('change', () => reloadBtn.click());

searchEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    reloadBtn.click();
  }
});

async function connectSignalR() {
  if (!window.signalR) {
    return;
  }

  const connection = new window.signalR.HubConnectionBuilder()
    .withUrl('/hubs/comments')
    .withAutomaticReconnect()
    .build();

  connection.on('commentCreated', async () => {
    await loadComments(state.page);
  });

  try {
    await connection.start();
  } catch (error) {
    // SignalR optional via config; ignore in UI when disabled.
  }
}

connectSignalR();
renderTextPreview(textInput.value);
