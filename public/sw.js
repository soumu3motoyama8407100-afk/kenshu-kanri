/* 研修管理システム Service Worker
   - 画面遷移(index.html)はネットワーク優先＝常に最新を表示。オフライン時のみキャッシュにフォールバック
   - ハッシュ付きの静的ファイル(JS/CSS/画像)はキャッシュ優先＝高速。ファイル名にハッシュが付くため古いままにならない
   これにより「開き直すだけで最新版」になり、通信不良時も最低限動く。 */
const CACHE = "kenshu-cache-v5";

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    try { const cache = await caches.open(CACHE); await cache.add("/index.html"); } catch (_) {}
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 外部(API/動画等)は素通し

  // 画面遷移：ネットワーク優先（最新のindexを取得。失敗時のみキャッシュ）
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put("/index.html", net.clone());
        return net;
      } catch (_) {
        const cache = await caches.open(CACHE);
        return (await cache.match("/index.html")) || Response.error();
      }
    })());
    return;
  }

  // 静的ファイル：キャッシュ優先（ハッシュ付きなので安全）
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const net = await fetch(req);
      if (net && net.status === 200 && net.type === "basic") cache.put(req, net.clone());
      return net;
    } catch (_) {
      return cached || Response.error();
    }
  })());
});
