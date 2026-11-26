import { useCallback, useEffect, useRef, useState } from "react";
import { SYNC } from "@/constants/sync";
import { isDirty, runSync } from "@/lib/sync";
import { store } from "@/lib/store";

/* ---------- 서버 동기화 훅(회원 + 서버 설정이 있을 때만) ----------
   시작할 때 · 기기에서 바꾼 뒤(잠시 모아서) · 앱으로 돌아왔을 때 · 인터넷이 다시 연결됐을 때 맞춘다. 동시에 한 번만 실행하고, 실패하면 다음 기회에 다시 시도한다.
   data: { events, passes, favs }(현재 화면 데이터), apply(merged): 병합 결과를 화면·저장소에 반영 */
export function useSync({ client, enabled, uid, data, apply }) {
  const [status, setStatus] = useState({ state: enabled ? "syncing" : "off", at: null, skipped: 0 });
  const ref = useRef({ data, apply, busy: false, again: false, alive: true, timer: 0, last: 0 });
  ref.current.data = data; ref.current.apply = apply;

  const run = useCallback(async () => {
    const r = ref.current;
    if (!enabled || !client) return;
    if (r.busy) { r.again = true; return; }
    r.busy = true; setStatus((s) => ({ ...s, state: "syncing" }));
    const key = `clacale:sync:${uid}`;
    try {
      const res = await runSync({ client, uid, getLocal: () => r.data, apply: (m) => r.apply(m), snapshot: store.get(key, null) });
      if (r.alive) { store.set(key, res.snapshot); r.last = Date.now(); setStatus({ state: "ok", at: Date.now(), skipped: res.skipped }); }
    } catch (e) {
      if (r.alive) setStatus((s) => ({ ...s, state: "error" }));
    } finally {
      r.busy = false;
      if (r.again && r.alive) { r.again = false; r.timer = setTimeout(run, 300); }
    }
  }, [client, enabled, uid]);

  // 시작 + 앱으로 돌아왔을 때 / 인터넷이 다시 연결됐을 때
  useEffect(() => {
    const r = ref.current; r.alive = true;
    if (!enabled) return undefined;
    run();
    const onFocus = () => { if (document.visibilityState !== "hidden" && Date.now() - r.last > SYNC.focusMinMs) run(); };
    window.addEventListener("focus", onFocus); document.addEventListener("visibilitychange", onFocus); window.addEventListener("online", run);
    return () => { r.alive = false; clearTimeout(r.timer); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); window.removeEventListener("online", run); };
  }, [enabled, run]);

  // 기기에서 바꾼 내용이 있으면 잠시 뒤 서버에 올림(바뀐 게 없으면 서버를 건드리지 않음)
  useEffect(() => {
    if (!enabled) return undefined;
    if (!isDirty(data, store.get(`clacale:sync:${uid}`, null))) return undefined;
    const t = setTimeout(run, SYNC.debounceMs);
    return () => clearTimeout(t);
  }, [enabled, uid, data.events, data.passes, data.favs, run]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...status, retry: run };
}
