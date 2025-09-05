export type DevToken = {
  type: 'verify' | 'reset';
  email: string;
  token: string;
  at: string; // ISO
};

const store: DevToken[] = [];

export function addToken(t: DevToken) {
  store.push(t);
  if (store.length > 200) store.splice(0, store.length - 200);
}

export function listTokens(email?: string) {
  return store.filter(t => !email || t.email.toLowerCase() === email.toLowerCase());
}

export function clearTokens(email?: string) {
  if (!email) { store.length = 0; return; }
  let i = 0;
  while (i < store.length) {
    if (store[i].email.toLowerCase() === email.toLowerCase()) store.splice(i, 1);
    else i++;
  }
}

