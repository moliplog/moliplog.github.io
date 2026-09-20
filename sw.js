/* Immersion Journal: service worker so the app opens offline.
   A new index.html is picked up by the app itself (it asks with ?fresh=1), so this file rarely needs changing. */
const VERSION = 'journal-v6';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  const mine = u.origin === self.location.origin;
  const fresh = mine && u.searchParams.has('fresh');            /* the app asking: is a newer version up? */
  const key = mine ? u.origin + u.pathname : e.request.url;     /* our own files are stored without the ?query */
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(key);
    const net = fetch(e.request).then(async r => {
      if (r && (r.ok || r.type === 'opaque')) { const saved = c.put(key, r.clone()).catch(() => {}); if (fresh) await saved; }
      return r;
    }).catch(() => hit || Response.error());
    if (hit && !fresh) { e.waitUntil(net); return hit; }   /* show the saved copy first, fetch the new one in the background */
    return net;                                            /* asked for fresh (or nothing saved yet): network first, saved copy if offline */
  }));
});
