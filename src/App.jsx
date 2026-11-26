import { useEffect, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Container } from "@/components/ui";
import ErrorBoundary from "@/components/ErrorBoundary";
import UpdateBanner from "@/components/UpdateBanner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { BACKUP_META_PREFIX } from "@/constants/backup";
import { AUTH_TEXT } from "@/constants/auth";
import { LEGAL_PATHS } from "@/constants/legal";
import { TABS } from "@/constants/nav";
import { aggregateSource, buildCrowd, gymIdOf } from "@/lib/crowd";
import { backupDue, backupRemindText, loadBackupRecord, markBackedUp, snoozeBackup } from "@/lib/backupReminder";
import { addDays, keyOf, parseKey, refreshTodayKey, today, todayKey } from "@/lib/dates";
import { applyEdit, occursOn } from "@/lib/events";
import { settleCountPasses, shortenPauseAt } from "@/lib/passes";
import { store } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useSync } from "@/lib/useSync";
import Board from "@/pages/Board";
import Calendar from "@/pages/Calendar";
import Legal from "@/pages/Legal";
import Login from "@/pages/Login";
import MyPage from "@/pages/MyPage";
import ResetPassword from "@/pages/ResetPassword";
import "@/App.css";

/* ---------- 앱 루트: 라우터 → 전역 세션(AuthProvider) → 공개 문서 또는 로그인 여부에 따라 Login / 계정 앱 ---------- */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PublicGate />
      </AuthProvider>
    </BrowserRouter>
  );
}

// 개인정보처리방침/이용약관(/privacy, /terms)은 로그인 없이 누구나 볼 수 있다(광고·로그인 심사에 공개 주소 필요)
function PublicGate() {
  const { pathname } = useLocation();
  const doc = LEGAL_PATHS[pathname.replace(/\/+$/, "")];
  return doc ? <Legal doc={doc} /> : <AuthGate />;
}

function AuthGate() {
  const { session, uid, ready, recovery } = useAuth();
  if (!ready) return <Container height="screen" center><p className="app-loading" role="status">{AUTH_TEXT.loading}</p></Container>; // 저장된 로그인을 확인하는 동안
  if (recovery) return <ResetPassword />; // 비밀번호 재설정 메일의 링크로 들어온 경우
  if (!session) return <Login />;
  return <AccountApp key={uid} />; // 계정이 바뀌면 상태를 새로 불러오도록 재마운트
}

/* ---------- 전역 상태 허브: 일정 / 이용권 / 찜 + localStorage 동기화 + 라우팅 ---------- */
function AccountApp() {
  const { uid, isGuest } = useAuth();
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [sel, setSel] = useState(todayKey);
  const [events, setEvents] = useState(() => store.get(`clacale:events:${uid}`, []));
  const commit = (fn) => setEvents((p) => { const n = fn(p); store.set(`clacale:events:${uid}`, n); return n; });
  const [passes, setPasses] = useState(() => store.get(`clacale:passes:${uid}`, []));
  const savePasses = (fn) => setPasses((p) => { const n = fn(p); store.set(`clacale:passes:${uid}`, n); return n; });
  // 일정이 정지 기간과 겹칠 때: 정지 종료일을 일정 전날로 단축
  const adjustPasses = (ids, date) => savePasses((l) => l.map((x) => (ids.includes(x.id) ? shortenPauseAt(x, date) : x)));
  // 정지 기간(from~to)과 겹치는 해당 브랜드 일정 삭제: 단일 일정은 삭제, 반복 일정은 그 기간의 발생분만 제외
  const deleteBrandRange = (brand, from, to) => commit((p) => p.flatMap((e) => {
    if (e.brand !== brand) return [e];
    const hits = []; for (let k = from; k <= to; k = addDays(k, 1)) if (occursOn(e, k)) hits.push(k);
    if (!hits.length) return [e];
    return e.repeat === "none" ? [] : [{ ...e, ex: [...(e.ex ?? []), ...hits] }];
  }));
  // 자정이 지나면 오늘 날짜 갱신 -> 지난 일정 감지해 횟수권 자동 차감
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => { const k = keyOf(new Date()); if (k !== todayKey) { refreshTodayKey(k); setTick((n) => n + 1); } }, 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const res = settleCountPasses(passes, events, todayKey); // 지난 일정만큼 횟수 차감
    if (res) savePasses(() => res);
  }, [passes, events, tick]);
  // 백업 알림: 계정별 기록(마지막 백업·사용 시작·미루기)을 보관. 자정이 지나면 tick 으로 다시 계산
  const [backupRec, setBackupRec] = useState(() => { const r = loadBackupRecord(store.get(`${BACKUP_META_PREFIX}${uid}`, null), new Date()); store.set(`${BACKUP_META_PREFIX}${uid}`, r); return r; });
  const saveBackupRec = (fn) => setBackupRec((r) => { const n = fn(r); store.set(`${BACKUP_META_PREFIX}${uid}`, n); return n; });
  const nowDate = new Date();
  const backup = {
    due: isGuest && backupDue(backupRec, nowDate, events.length + passes.length > 0), // 비회원만: 회원 데이터는 서버에 저장되는 구조(P2)라 알리지 않는다
    text: backupRemindText(backupRec, nowDate),
    onBackedUp: () => saveBackupRec((r) => markBackedUp(r, new Date())),
    onSnooze: () => saveBackupRec((r) => snoozeBackup(r, new Date())),
  };
  const [favs, setFavs] = useState(() => store.get(`clacale:favs:${uid}`, [])); // 즐겨찾기한 센터(브랜드) 키: "b:브랜드id"
  const toggleFav = (key) => setFavs((p) => { const n = p.includes(key) ? p.filter((k) => k !== key) : [...p, key]; store.set(`clacale:favs:${uid}`, n); return n; });
  // 회원은 일정·이용권·찜을 서버와 맞춘다(서버 설정이 없는 미리보기에서는 꺼짐). 병합 결과는 같은 저장 경로로 반영
  const sync = useSync({
    client: supabase, enabled: !isGuest && Boolean(supabase), uid, data: { events, passes, favs },
    apply: (m) => {
      const put = (name, cur, next, set) => { if (JSON.stringify(cur) !== JSON.stringify(next)) set(() => { store.set(`clacale:${name}:${uid}`, next); return next; }); };
      put("events", events, m.events, setEvents); put("passes", passes, m.passes, setPasses); put("favs", favs, m.favs, setFavs);
    },
  });
  // 삭제 범위: one = 이 일정만(예외 날짜 기록), after = 이 날짜 이후 모두(종료일 기록, 과거 유지), all = 시리즈 전체
  const deleteEvent = (ev, scope) => commit((p) => p.flatMap((e) => {
    if (e.id !== ev.id) return [e];
    const k = ev.start.slice(0, 10);
    if (scope === "all") return [];
    if (scope === "after") {
      if (k <= e.start.slice(0, 10)) return [];
      const prev = parseKey(k); prev.setDate(prev.getDate() - 1);
      return [{ ...e, until: keyOf(prev) }];
    }
    return [{ ...e, ex: [...(e.ex ?? []), k] }];
  }));

  // 일정(발생분) 하나의 혼잡도: 모든 클라캘 유저의 일정으로 집계한 값(서버, P2 전까지는 "집계 준비 중")
  const statOf = (o) => buildCrowd(o, aggregateSource.get(o.start.slice(0, 10), gymIdOf(o)));
  const addEvent = (ev) => commit((p) => [...p, ev]);
  const editEvent = (occ, next, scope) => commit((p) => applyEdit(p, occ, next, scope));
  // 백업 가져오기: 일정/이용권/찜을 백업 내용으로 교체
  const restoreData = (d) => {
    commit(() => d.events); savePasses(() => d.passes);
    setFavs(() => { store.set(`clacale:favs:${uid}`, d.favs); return d.favs; });
  };

  return (
    <Container height="screen" className="app-shell">
      <main className="app-main">
        <PageBoundary>
        <Routes>
          <Route path="/" element={
            <Calendar ym={ym} setYm={setYm} sel={sel} setSel={setSel} events={events} addEvent={addEvent} editEvent={editEvent} deleteEvent={deleteEvent} statOf={statOf}
              favs={favs} toggleFav={toggleFav} passes={passes} adjustPasses={adjustPasses} />} />
          <Route path="/board" element={<Board />} />
          <Route path="/mypage" element={
            <MyPage passes={passes} favs={favs} savePasses={savePasses}
              onToggleFav={toggleFav} events={events} onDeleteRange={deleteBrandRange} onRestore={restoreData} backup={backup} sync={sync} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </PageBoundary>
      </main>
      <UpdateBanner />
      <TabBar badge={backup.due ? "/mypage" : null} />
    </Container>
  );
}


/* 페이지 하나가 오류로 멈춰도 탭바는 살아 있고, 다른 탭으로 이동하면 자동 복구 */
function PageBoundary({ children }) {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
}

/* ---------- 하단 네비게이션 바 ---------- */
function TabBar({ badge }) {
  const { pathname } = useLocation();
  return (
    <nav aria-label="하단 메뉴" className="tabbar">
      {TABS.map(({ to, label, icon: Icon }) => (
        <Link key={to} to={to} className="tabbar__item" aria-current={pathname === to ? "page" : undefined}>
          <Icon size={20} />{label}
          {badge === to && <span className="tabbar__dot" role="img" aria-label="백업 필요" />}
        </Link>
      ))}
    </nav>
  );
}
