// Minimal client for testing @lean-kit/auth flows
const CSRF_COOKIE_NAME = 'app.csrf'; // Adjust if you changed CSRF cookie name

const $ = (id) => document.getElementById(id);
const out = $('out');
const statusEl = $('status');

function setOut(obj) {
  try {
    out.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
  } catch {
    out.textContent = String(obj);
  }
}

function getCookie(name) {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(name + '='))?.split('=')[1];
}

async function fetchJSON(path, { method = 'GET', body, csrf = false } = {}) {
  const headers = {};
  if (body && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
  }
  // Include CSRF token only if cookie exists
  const token = getCookie(CSRF_COOKIE_NAME);
  if (csrf && token) headers['x-csrf-token'] = decodeURIComponent(token);

  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw { status: res.status, data };
  return data;
}

async function refresh() {
  try {
    const me = await fetchJSON('/auth/me');
    statusEl.textContent = me?.email ? `Signed in: ${me.email}` : 'Signed out';
  } catch (e) {
    statusEl.textContent = 'Signed out';
  }
}

async function listSessions() {
  try {
    const list = await fetchJSON('/sessions');
    const container = $('sessions');
    container.innerHTML = '';
    const ul = document.createElement('ul');
    (list || []).forEach((s) => {
      const li = document.createElement('li');
      const when = new Date(s.createdAt || s.created_at || s.at || Date.now()).toLocaleString();
      li.innerHTML = `<code>${s.id}</code> — ${when} — ${s.userAgent || s.ua || ''} `;
      const btn = document.createElement('button');
      btn.textContent = 'Revoke';
      btn.onclick = async () => {
        try {
          const res = await fetchJSON(`/sessions/${encodeURIComponent(s.id)}/revoke`, { method: 'POST', csrf: true });
          setOut(res);
          await listSessions();
          await refresh();
        } catch (err) {
          setOut(err);
        }
      };
      li.appendChild(btn);
      ul.appendChild(li);
    });
    container.appendChild(ul);
    setOut(list);
  } catch (err) {
    setOut(err);
  }
}

async function getDevToken(email, type) {
  try {
    const res = await fetch(`/dev/tokens?email=${encodeURIComponent(email)}`, { credentials: 'include' });
    const data = await res.json();
    const list = (data.tokens || []).filter(t => t.type === type);
    const latest = list[list.length - 1];
    if (!latest) throw new Error('No token captured yet');
    return latest.token;
  } catch (e) {
    throw e;
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  $('btn-refresh').onclick = () => { refresh(); };

  $('btn-register').onclick = async () => {
    try {
      const res = await fetchJSON('/auth/register', {
        method: 'POST',
        body: { email: $('reg-email').value, password: $('reg-password').value },
      });
      setOut(res); await refresh();
    } catch (err) { setOut(err); }
  };

  $('btn-login').onclick = async () => {
    try {
      const res = await fetchJSON('/auth/login', {
        method: 'POST',
        body: { email: $('reg-email').value, password: $('reg-password').value },
      });
      setOut(res); await refresh();
    } catch (err) { setOut(err); }
  };

  $('btn-logout').onclick = async () => {
    try {
      const res = await fetchJSON('/auth/logout', { method: 'POST', csrf: true });
      setOut(res); await refresh();
    } catch (err) { setOut(err); }
  };

  $('btn-me').onclick = async () => {
    try { const res = await fetchJSON('/auth/me'); setOut(res); } catch (err) { setOut(err); }
  };

  $('btn-request-verify').onclick = async () => {
    try {
      const res = await fetchJSON('/auth/request-verify', { method: 'POST', csrf: true, body: { email: $('verify-email').value } });
      setOut(res);
    } catch (err) { setOut(err); }
  };

  $('btn-verify').onclick = async () => {
    try {
      const res = await fetchJSON('/auth/verify', { method: 'POST', csrf: true, body: { token: $('verify-token').value } });
      setOut(res); await refresh();
    } catch (err) { setOut(err); }
  };

  $('btn-dev-latest-verify').onclick = async () => {
    try {
      const email = $('verify-email').value || $('reg-email').value;
      if (!email) throw new Error('Provide email');
      const token = await getDevToken(email, 'verify');
      $('verify-token').value = token;
      setOut({ token });
    } catch (err) { setOut(err); }
  };

  $('btn-request-reset').onclick = async () => {
    try {
      const res = await fetchJSON('/auth/request-reset', { method: 'POST', csrf: true, body: { email: $('reset-email').value } });
      setOut(res);
    } catch (err) { setOut(err); }
  };

  $('btn-reset').onclick = async () => {
    try {
      const res = await fetchJSON('/auth/reset-password', { method: 'POST', csrf: true, body: { token: $('reset-token').value, password: $('reset-password').value } });
      setOut(res);
    } catch (err) { setOut(err); }
  };

  $('btn-dev-latest-reset').onclick = async () => {
    try {
      const email = $('reset-email').value || $('reg-email').value;
      if (!email) throw new Error('Provide email');
      const token = await getDevToken(email, 'reset');
      $('reset-token').value = token;
      setOut({ token });
    } catch (err) { setOut(err); }
  };

  $('btn-sessions').onclick = () => listSessions();

  $('btn-admin-ping').onclick = async () => {
    try { const res = await fetchJSON('/admin/ping'); setOut(res); } catch (err) { setOut(err); }
  };

  $('btn-dev-promote-admin').onclick = async () => {
    try {
      const email = $('reg-email').value;
      if (!email) throw new Error('Provide email');
      const res = await fetch('/dev/promote-admin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }), credentials: 'include'
      });
      const data = await res.json();
      setOut(data);
    } catch (err) { setOut(err); }
  };

  // Initial load
  await refresh();
});
