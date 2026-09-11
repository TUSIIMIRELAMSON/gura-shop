import assert from 'node:assert/strict';

export async function testClientSession(client, check) {
  const previous = {window: globalThis.window, document: globalThis.document, fetch: globalThis.fetch};
  const browser = new EventTarget();
  browser.location = {host: 'localhost:3000'};
  const signals = [];
  browser.localStorage = {setItem: (...args) => signals.push(args)};
  const document = new EventTarget();
  document.visibilityState = 'visible';
  globalThis.window = browser;
  globalThis.document = document;
  let calls = [], response = () => Response.json({ok: true}), refreshes = 0;
  globalThis.fetch = async (url, options) => { calls.push({url, ...options}); return response(); };
  const stop = client.watchSession(() => refreshes++);
  try {
    client.setSessionUser({id: 'owner'});
    await client.api('admin/products', 'POST', {name: 'Test draft'});
    check(calls.at(-1).headers['x-gura-user'] === 'owner' && calls.at(-1).credentials === 'same-origin', 'Owner save binds the displayed account to the cookie-authenticated request');

    const photos = new FormData();
    photos.set('file', new File(['test'], 'test.png', {type: 'image/png'}));
    await client.api('admin/products/test/photos', 'POST', photos);
    check(calls.at(-1).body === photos && !calls.at(-1).headers['Content-Type'], 'Photo uploads retain multipart boundaries and the account check');

    response = () => Response.json({error: 'Account changed', code: 'SESSION_CHANGED'}, {status: 409});
    await assert.rejects(client.api('admin/products', 'POST', {}), e => e.code === 'SESSION_CHANGED' && e.status === 409);
    check(refreshes === 1, 'A stale owner save triggers session reconciliation without retrying the write');

    const before = refreshes;
    response = () => Response.json({error: 'Bad password'}, {status: 401});
    await assert.rejects(client.api('auth/login', 'POST', {}));
    check(refreshes === before && signals.length === 0, 'Failed login does not announce a new session');

    response = () => Response.json({user: {id: 'customer'}});
    await client.api('auth/login', 'POST', {email: 'customer@example.test', password: 'test123'});
    await client.api('cart');
    check(signals.length === 1 && signals[0][0] === 'gura:session:localhost:3000' && calls.at(-1).headers['x-gura-user'] === 'customer', 'Successful login updates this tab and sends other tabs a signal containing no account details');

    const start = refreshes;
    browser.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    const storage = new Event('storage');
    Object.defineProperty(storage, 'key', {value: 'gura:session:localhost:3000'});
    browser.dispatchEvent(storage);
    document.visibilityState = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    check(refreshes === start + 3, 'Returning to the app and cross-tab login signals recheck the session');

    let finish;
    response = () => new Promise(resolve => { finish = resolve; });
    const pending = client.api('orders');
    client.setSessionUser({id: 'different-customer'});
    finish(Response.json([{id: 'previous-account-order'}]));
    await assert.rejects(pending, e => e.code === 'SESSION_CHANGED');
    check(true, 'A delayed response cannot populate the next account with the previous account’s data');

    stop();
    const stopped = refreshes;
    browser.dispatchEvent(new Event('focus'));
    browser.dispatchEvent(storage);
    check(refreshes === stopped, 'Session listeners are removed when the app unmounts');
  } finally {
    stop();
    client.setSessionUser(null);
    for (const key of Object.keys(previous)) {
      if (previous[key] === undefined) delete globalThis[key];
      else globalThis[key] = previous[key];
    }
  }
}
