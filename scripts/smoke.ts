/*
  Simple smoke test against a running auth-consumer instance.
  Usage:
    # Ensure Redis + app are running at BASE_URL (default http://localhost:4000)
    npm run smoke

  Env:
    BASE_URL (default http://localhost:4000)
    CSRF_COOKIE_NAME (default app.csrf)
*/

const BASE = process.env.BASE_URL || 'http://localhost:4000';
const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || 'app.csrf';

type Json = Record<string, any> | null;

type Jar = Map<string, string>;
const jar: Jar = new Map();

function setCookieFromSetCookieHeader(values: string[] | string | null) {
  if (!values) return;
  const list = Array.isArray(values) ? values : [values];
  for (const v of list) {
    const [pair] = v.split(';');
    const eq = pair.indexOf('=');
    if (eq > 0) {
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      jar.set(name, value);
    }
  }
}

function cookieHeaderValue() {
  if (jar.size === 0) return undefined;
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function req(path: string, init: RequestInit & { csrf?: boolean } = {}): Promise<{ status: number; data: Json; raw: Response; }> {
  const headers = new Headers(init.headers || {});
  const cookies = cookieHeaderValue();
  if (cookies) headers.set('cookie', cookies);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (init.csrf) {
    const token = jar.get(CSRF_COOKIE_NAME);
    if (token) headers.set('x-csrf-token', decodeURIComponent(token));
  }
  const res = await fetch(BASE + path, { ...init, headers });
  setCookieFromSetCookieHeader(res.headers.getSetCookie?.() ?? res.headers.get('set-cookie'));
  const text = await res.text();
  let data: Json = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text ? { text } as any : null; }
  return { status: res.status, data, raw: res };
}

async function assert(ok: any, message: string) {
  if (!ok) throw new Error('Assertion failed: ' + message);
}

function randomEmail() {
  const n = Math.random().toString(36).slice(2);
  return `user_${Date.now()}_${n}@example.com`;
}

async function waitForServer(timeoutMs = 10000) {
  const start = Date.now();
  // hit root to get CSRF cookie
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await req('/');
      if (r.status === 200) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('Server not responding at ' + BASE);
}

async function getLatestToken(email: string, type: 'verify' | 'reset') {
  const r = await req(`/dev/tokens?email=${encodeURIComponent(email)}`);
  const list = (r.data?.tokens || []).filter((t: any) => t.type === type);
  return list[list.length - 1]?.token || null;
}

async function run() {
  console.log('Smoke against', BASE);
  await waitForServer();

  const email = randomEmail();
  const pass1 = 'Str0ngP@ssw0rd!';
  const pass2 = 'NewStr0ngP@ss!';

  // Prime CSRF cookie
  await req('/');

  // Register
  let r = await req('/auth/register', { method: 'POST', csrf: true, body: JSON.stringify({ email, password: pass1 }) });
  await assert(r.status === 201, 'register should 201');

  // Request verify (requires session)
  r = await req('/auth/request-verify', { method: 'POST', csrf: true });
  await assert(r.status === 204, 'request-verify should 204');
  const vtoken = await getLatestToken(email, 'verify');
  await assert(!!vtoken, 'verify token captured');

  // Verify
  r = await req('/auth/verify', { method: 'POST', csrf: true, body: JSON.stringify({ token: vtoken }) });
  await assert(r.status === 201 || r.status === 200 || r.status === 204, 'verify should succeed');

  // Logout
  r = await req('/auth/logout', { method: 'POST', csrf: true });
  await assert(r.status === 204, 'logout should 204');

  // Login
  r = await req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: pass1 }) });
  await assert(r.status === 200, 'login should 200');
  r = await req('/auth/me');
  await assert(r.status === 200 && r.data?.email === email, 'me should return email');

  // Request reset
  r = await req('/auth/request-reset', { method: 'POST', csrf: true, body: JSON.stringify({ email }) });
  await assert(r.status === 204, 'request-reset should 204');
  const rtoken = await getLatestToken(email, 'reset');
  await assert(!!rtoken, 'reset token captured');

  // Reset password
  r = await req('/auth/reset-password', { method: 'POST', csrf: true, body: JSON.stringify({ token: rtoken, password: pass2 }) });
  await assert(r.status === 204, 'reset-password should 204');

  // Login with new password
  r = await req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: pass2 }) });
  await assert(r.status === 200, 'login with new password should 200');

  // Promote admin and ping
  r = await req('/dev/promote-admin', { method: 'POST', body: JSON.stringify({ email }) });
  await assert(r.status === 200 && r.data?.ok, 'promote-admin ok');
  r = await req('/admin/ping');
  await assert(r.status === 200 && r.data?.ok, 'admin ping ok');

  // Rate limit: wrong password attempts
  let got429 = false;
  for (let i = 0; i < 12; i++) {
    const rr = await req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'wrong' }) });
    if (rr.status === 429) got429 = true;
  }
  await assert(got429, 'rate limit should trigger 429');

  console.log('\n✅ Smoke passed');
}

run().catch((e) => { console.error('\n❌ Smoke failed:', e.message); process.exit(1); });

