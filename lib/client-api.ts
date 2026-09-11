// The cookie authenticates requests. This tab's account ID only detects a
// changed browser session; the server still decides every permission.
let sessionUser: string | null = null;
const refreshEvent = 'gura:refresh-session';
const sessionKey = () => 'gura:session:' + window.location.host;

export function setSessionUser(user: {id: string} | null) {
  sessionUser = user?.id ?? null;
}

export class ClientApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

export function watchSession(refresh: () => void) {
  const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
  const onStorage = (event: StorageEvent) => {
    if (event.key === sessionKey() || event.key === null) refresh();
  };
  window.addEventListener('focus', refresh);
  window.addEventListener(refreshEvent, refresh);
  window.addEventListener('storage', onStorage);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    window.removeEventListener('focus', refresh);
    window.removeEventListener(refreshEvent, refresh);
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', onVisible);
  };
}

export async function api(path: string, method = 'GET', data?: any): Promise<any> {
  const accountRequest = path !== 'bootstrap' && (!path.startsWith('auth/') || path === 'auth/logout');
  const expectedUser = sessionUser;
  const isForm = data instanceof FormData;
  const res = await fetch('/api/' + path, {
    method, credentials: 'same-origin', cache: 'no-store',
    headers: {
      ...(method === 'GET' ? {} : {'x-gura-action': '1'}),
      ...(accountRequest && expectedUser ? {'x-gura-user': expectedUser} : {}),
      ...(data && !isForm ? {'Content-Type': 'application/json'} : {})
    },
    body: data ? (isForm ? data : JSON.stringify(data)) : undefined
  });
  const json: any = await res.json().catch(() => ({error: 'The server returned an unreadable response.'}));
  if (!res.ok) {
    if (['SESSION_EXPIRED', 'SESSION_CHANGED', 'OWNER_REQUIRED'].includes(json.code)) {
      window.dispatchEvent(new Event(refreshEvent));
    }
    throw new ClientApiError(json.error || 'Something went wrong. Please try again.', res.status, json.code);
  }
  if (accountRequest && expectedUser !== sessionUser) {
    throw new ClientApiError('The signed-in account changed. Please try again from your current account.', 409, 'SESSION_CHANGED');
  }
  if (method !== 'GET' && (path.startsWith('auth/') || path === 'profile/delete' || path === 'profile/password')) {
    if (json.user) setSessionUser(json.user);
    if (path === 'auth/logout' || path === 'profile/delete') setSessionUser(null);
    // Only a change signal is stored, never passwords, tokens, or account data.
    try { window.localStorage.setItem(sessionKey(), crypto.randomUUID()); } catch { /* Focus checks still work. */ }
  }
  return json;
}
