const commentsEl = document.getElementById('comments');
const form = document.getElementById('comment-form');
const statusEl = document.getElementById('form-status');
const searchEl = document.getElementById('search');
const sortByEl = document.getElementById('sortBy');
const sortDirectionEl = document.getElementById('sortDirection');
const pageSizeEl = document.getElementById('pageSize');
const pageInfoEl = document.getElementById('page-info');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const reloadBtn = document.getElementById('reload');
const attachmentInput = document.getElementById('attachment');
const attachmentPreviewEl = document.getElementById('attachment-preview');
const parentIdInput = form.elements.namedItem('parentId');
const replyContextEl = document.getElementById('reply-context');
const replyContextTextEl = document.getElementById('reply-context-text');
const clearReplyContextBtn = document.getElementById('clear-reply-context');

const MAX_ATTACHMENT_SIZE = 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set(['text/plain', 'image/png', 'image/jpeg', 'image/gif']);

const state = {
  page: 1,
  totalPages: 1,
  hasNextPage: false,
  isSearchMode: false
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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

function renderAttachment(attachment) {
  if (!attachment) {
    return '';
  }

  const fileName = escapeHtml(attachment.fileName);
  const storagePath = `/${attachment.storagePath}`;

  if (attachment.contentType?.startsWith('image/')) {
    return `
      <figure class="attachment-preview-inline">
        <img src="${storagePath}" alt="${fileName}" loading="lazy" />
        <figcaption>📎 <a href="${storagePath}" target="_blank">${fileName}</a></figcaption>
      </figure>
    `;
  }

  return `<div>📎 <a href="${storagePath}" target="_blank">${fileName}</a></div>`;
}

function buildReplyButton(commentId) {
  return `<button class="reply-btn" type="button" data-reply-id="${escapeHtml(commentId)}">↪ Відповісти</button>`;
}

function renderComment(comment) {
  const attachment = renderAttachment(comment.attachment);

  const homepage = comment.homePage
    ? ` · <a href="${escapeHtml(comment.homePage)}" target="_blank" rel="noreferrer">сайт</a>`
    : '';

  const replies = comment.replies?.length
    ? `<div class="replies">${comment.replies.map(renderComment).join('')}</div>`
    : '';

  return `
    <article class="comment">
      <div><strong>${escapeHtml(comment.userName)}</strong> (${escapeHtml(comment.email)})${homepage}</div>
      <div class="meta">${new Date(comment.createdAtUtc).toLocaleString()} · ID: ${escapeHtml(comment.id)}</div>
      <p>${escapeHtml(comment.text)}</p>
      <div class="comment-actions">${buildReplyButton(comment.id)}</div>
      ${attachment}
      ${replies}
    </article>
  `;
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

async function loadComments(page = state.page) {
  const q = searchEl.value.trim();
  const pageSize = Number(pageSizeEl.value || '25');
  state.page = Math.max(1, page);
  state.isSearchMode = Boolean(q);

  const query = q
    ? `/api/comments/search?q=${encodeURIComponent(q)}&page=${state.page}&pageSize=${pageSize}`
    : `/api/comments?page=${state.page}&pageSize=${pageSize}&sortBy=${sortByEl.value}&sortDirection=${sortDirectionEl.value}`;

  const response = await fetch(query);
  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = await response.json();
  state.totalPages = Math.max(1, data.totalPages || 1);
  state.hasNextPage = data.page < data.totalPages;
  state.page = data.page;
  updatePaginationControls();

  commentsEl.innerHTML = data.items.length
    ? data.items.map(renderComment).join('')
    : '<p>Коментарів ще немає.</p>';
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
      captchaToken: formData.get('captchaToken')?.toString().trim() || null,
      attachment
    };

    const response = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    form.reset();
    state.page = 1;
    attachmentPreviewEl.innerHTML = '';
    clearReplyContext(false);
    statusEl.classList.add('ok');
    statusEl.textContent = 'Коментар створено.';
    await loadComments(1);
  } catch (error) {
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

sortByEl.addEventListener('change', () => reloadBtn.click());
sortDirectionEl.addEventListener('change', () => reloadBtn.click());
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
  } catch {
    // SignalR optional via config; ignore in UI when disabled.
  }
}

loadComments().catch((error) => {
  commentsEl.innerHTML = `<p>Помилка завантаження: ${error.message}</p>`;
});
connectSignalR();
