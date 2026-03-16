const commentsEl = document.getElementById('comments');
const form = document.getElementById('comment-form');
const statusEl = document.getElementById('form-status');
const searchEl = document.getElementById('search');
const sortByEl = document.getElementById('sortBy');
const sortDirectionEl = document.getElementById('sortDirection');
const reloadBtn = document.getElementById('reload');

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

function renderComment(comment) {
  const attachment = comment.attachment
    ? `<div><a href="/${comment.attachment.storagePath}" target="_blank">📎 ${comment.attachment.fileName}</a></div>`
    : '';

  const homepage = comment.homePage
    ? ` · <a href="${comment.homePage}" target="_blank" rel="noreferrer">сайт</a>`
    : '';

  const replies = comment.replies?.length
    ? `<div class="replies">${comment.replies.map(renderComment).join('')}</div>`
    : '';

  return `
    <article class="comment">
      <div><strong>${comment.userName}</strong> (${comment.email})${homepage}</div>
      <div class="meta">${new Date(comment.createdAtUtc).toLocaleString()} · ID: ${comment.id}</div>
      <p>${comment.text}</p>
      ${attachment}
      ${replies}
    </article>
  `;
}

async function loadComments() {
  const q = searchEl.value.trim();
  const query = q
    ? `/api/comments/search?q=${encodeURIComponent(q)}&page=1&pageSize=100`
    : `/api/comments?page=1&pageSize=100&sortBy=${sortByEl.value}&sortDirection=${sortDirectionEl.value}`;

  const response = await fetch(query);
  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = await response.json();
  commentsEl.innerHTML = data.items.length
    ? data.items.map(renderComment).join('')
    : '<p>Коментарів ще немає.</p>';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.className = 'status';
  statusEl.textContent = 'Збереження...';

  try {
    const formData = new FormData(form);
    const file = formData.get('attachment');
    const attachment = file && file.size > 0 ? await fileToAttachment(file) : null;

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
    statusEl.classList.add('ok');
    statusEl.textContent = 'Коментар створено.';
    await loadComments();
  } catch (error) {
    statusEl.classList.add('error');
    statusEl.textContent = `Помилка: ${error.message}`;
  }
});

reloadBtn.addEventListener('click', () => {
  loadComments().catch((error) => {
    commentsEl.innerHTML = `<p>Помилка завантаження: ${error.message}</p>`;
  });
});

sortByEl.addEventListener('change', () => reloadBtn.click());
sortDirectionEl.addEventListener('change', () => reloadBtn.click());

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
    await loadComments();
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
