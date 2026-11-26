/* PWA: 서비스 워커 등록 + 새 버전 감지.
   흐름: 새 워커가 설치되어 "대기" → notify() → 배너 표시 → applyUpdate() → 워커 교체 → 화면 새로고침 */
import { SW_URL, UPDATE_CHECK_MS } from "@/constants/pwa";

let waiting = null;
let applying = false;
const listeners = new Set();

export const pwaState = {
  subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb); },
  getSnapshot() { return waiting ? (applying ? "applying" : "ready") : "none"; },
};
const notify = () => listeners.forEach((cb) => cb());

function watch(reg) {
  const found = (w) => { if (w && navigator.serviceWorker.controller) { waiting = w; notify(); } };
  found(reg.waiting); // 이미 대기 중인 워커(이전 방문에서 설치됨)
  reg.addEventListener("updatefound", () => {
    const w = reg.installing;
    if (!w) return;
    w.addEventListener("statechange", () => { if (w.state === "installed") found(w); });
  });
}

export function initPWA() {
  if (!("serviceWorker" in navigator)) return;
  const start = async () => {
    try {
      const reg = await navigator.serviceWorker.register(SW_URL);
      watch(reg);
      const check = () => reg.update().catch(() => {});
      setInterval(check, UPDATE_CHECK_MS);
      // 홈 화면 앱은 오래 켜져 있다가 다시 열리는 경우가 많아, 앱으로 돌아올 때마다 확인
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
    } catch (e) { /* 등록 실패해도 앱은 평소처럼 동작 */ }
  };
  if (document.readyState === "complete") start(); else window.addEventListener("load", start, { once: true });
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!applying || reloaded) return; // 처음 설치(claim) 때는 새로고침하지 않음
    reloaded = true;
    window.location.reload();
  });
}

export function applyUpdate() {
  if (!waiting || applying) return;
  applying = true;
  notify();
  waiting.postMessage({ type: "SKIP_WAITING" });
}
