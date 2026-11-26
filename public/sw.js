/* 클라캘 서비스 워커 — 오프라인 실행 + 새 버전 알림
   - BUILD 값은 빌드할 때 vite.sw-plugin.js 가 자동으로 바꿔 넣습니다(직접 수정 금지).
   - 빌드마다 값이 달라지므로 앱이 바뀌면 새 워커가 "대기" 상태가 되고, 화면에 "새 버전" 배너가 뜹니다.
   - 사용자가 [업데이트]를 눌러야(SKIP_WAITING 메시지) 새 버전으로 바뀝니다 → 입력 중인 내용이 갑자기 사라지지 않습니다. */
const BUILD = "__BUILD_ID__";
const CACHE = `clacale-${BUILD}`;
const SHELL = "/index.html";
const EXTRA = ["/manifest.json", "/favicon.svg", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png"];
const NAV_TIMEOUT_MS = 3000; // 암장 지하처럼 신호가 약한 곳: 3초 안에 못 받으면 저장된 화면으로

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const res = await fetch(SHELL, { cache: "reload" });
    if (!res.ok) throw new Error("shell fetch failed"); // 실패하면 설치 취소 → 이전 버전 계속 사용
    const html = await res.clone().text();
    await cache.put(SHELL, res);
    const urls = new Set(EXTRA);
    for (const m of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
      const u = new URL(m[1], self.location.origin + "/");
      if (u.origin === self.location.origin && u.pathname !== "/" && u.pathname !== SHELL) urls.add(u.pathname + u.search);
    }
    // 부가 파일(아이콘 등)이 없어도 설치는 성공해야 하므로 개별 처리, 화면 구성 파일(js/css)은 필수
    await Promise.all([...urls].map(async (u) => {
      try {
        const r = await fetch(u, { cache: "reload" });
        if (r.ok) await cache.put(u, r);
        else if (/\.(js|css)$/.test(u)) throw new Error("asset failed " + u);
      } catch (e) { if (/\.(js|css)$/.test(u)) throw e; }
    }));
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("clacale-") && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 외부(광고·서버 등)는 건드리지 않음
  if (url.pathname === "/sw.js") return;

  if (req.mode === "navigate") { event.respondWith(navigate(req)); return; }
  event.respondWith(assetFirst(req));
});

// 화면(HTML): 네트워크 우선(최신 확인) → 느리거나 오프라인이면 저장된 화면
async function navigate(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), NAV_TIMEOUT_MS)),
    ]);
    if (res && res.ok) return res;
  } catch (e) { /* 저장본 사용 */ }
  return (await cache.match(SHELL)) || fetch(req);
}

// 파일(JS/CSS/이미지): 저장본 우선. 이름에 해시가 붙어 내용이 바뀌면 이름도 바뀌므로 안전
async function assetFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok && res.type === "basic") cache.put(req, res.clone());
  return res;
}
