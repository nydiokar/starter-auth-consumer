// Minimal client for testing @lean-kit/auth flows
const CSRF_COOKIE_NAME = 'app.csrf'; // Adjust if you changed CSRF cookie name

const $ = (id) => document.getElementById(id);
const out = $('out');
const statusEl = $('status');
const rlOut = $('rl-out');

const settings = {
  includeCredentials: true,
  sendCsrf: true, // when true, attach x-csrf-token if cookie exists
};

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
  if (csrf && settings.sendCsrf && token) headers['x-csrf-token'] = decodeURIComponent(token);

  const res = await fetch(path, {
    method,
    credentials: settings.includeCredentials ? 'include' : 'omit',
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
  // Settings toggles
  $('set-cred').onchange = (e) => { settings.includeCredentials = e.target.checked; };
  $('set-csrf').onchange = (e) => { settings.sendCsrf = e.target.checked; };
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

  // Dev tools
  $('btn-dev-whoami').onclick = async () => {
    try { const res = await fetchJSON('/dev/whoami'); setOut(res); } catch (err) { setOut(err); }
  };
  $('btn-dev-expire').onclick = async () => {
    try { const res = await fetchJSON('/dev/session/expire', { method: 'POST' }); setOut(res); await refresh(); } catch (err) { setOut(err); }
  };
  $('btn-dev-ttl5').onclick = async () => {
    try { const res = await fetchJSON('/dev/session/ttl', { method: 'POST', body: { seconds: 5 } }); setOut(res); } catch (err) { setOut(err); }
  };
  $('btn-dev-rl-clear').onclick = async () => {
    try { const res = await fetchJSON('/dev/ratelimit/clear', { method: 'POST' }); setOut(res); } catch (err) { setOut(err); }
  };
  $('btn-dev-config').onclick = async () => {
    try { const res = await fetchJSON('/dev/config'); setOut(res); } catch (err) { setOut(err); }
  };

  // Audit
  $('btn-dev-audit-list').onclick = async () => {
    try { const res = await fetchJSON('/dev/audit?limit=50'); $('audit').textContent = JSON.stringify(res, null, 2); setOut(res); } catch (err) { setOut(err); }
  };
  $('btn-dev-audit-clear').onclick = async () => {
    try { const res = await fetchJSON('/dev/audit/clear', { method: 'POST' }); setOut(res); $('audit').textContent = ''; } catch (err) { setOut(err); }
  };

  // Tokens list/clear
  $('btn-dev-tokens-list').onclick = async () => {
    try {
      const email = $('reg-email').value;
      const q = email ? `?email=${encodeURIComponent(email)}` : '';
      const res = await fetchJSON(`/dev/tokens${q}`);
      $('tokens').textContent = JSON.stringify(res, null, 2);
      setOut(res);
    } catch (err) { setOut(err); }
  };
  $('btn-dev-tokens-clear').onclick = async () => {
    try {
      const email = $('reg-email').value;
      const res = await fetchJSON('/dev/tokens/clear', { method: 'POST', body: email ? { email } : {} });
      setOut(res); $('tokens').textContent = '';
    } catch (err) { setOut(err); }
  };

  // Rate limit tester (wrong password)
  $('btn-rl-wrong').onclick = async () => {
    const attempts = Math.max(1, parseInt($('rl-attempts').value || '10', 10));
    const delay = Math.max(0, parseInt($('rl-delay').value || '100', 10));
    const email = $('reg-email').value || 'user@example.com';
    let ok = 0, err401 = 0, err429 = 0, other = 0;
    rlOut.textContent = 'Running...';
    for (let i = 0; i < attempts; i++) {
      try {
        await fetchJSON('/auth/login', { method: 'POST', body: { email, password: 'wrong-password' } });
        ok++;
      } catch (e) {
        if (e && e.status === 401) err401++; else if (e && e.status === 429) err429++; else other++;
      }
      if (delay) await new Promise(r => setTimeout(r, delay));
    }
    rlOut.textContent = `ok=${ok} 401=${err401} 429=${err429} other=${other}`;
    setOut({ ok, err401, err429, other });
  };

  // Initial load
  await refresh();
});
