import { useEffect, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Container } from "@/components/ui";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { TABS } from "@/constants/nav";
import { MAX_CAPACITY, crowdLevel, gymIdOf, midSlot, sampleVisits } from "@/lib/crowd";
import { addDays, keyOf, parseKey, refreshTodayKey, today, todayKey } from "@/lib/dates";
import { occurrence, occursOn } from "@/lib/events";
import { settleCountPasses, shortenPause } from "@/lib/passes";
import { MOCK_PASSES, seed } from "@/lib/seed";
import { store } from "@/lib/store";
import Board from "@/pages/Board";
import Calendar from "@/pages/Calendar";
import Login from "@/pages/Login";
import MyPage from "@/pages/MyPage";
import "@/App.css";

/* ---------- 앱 루트: 전역 세션(AuthProvider) → 로그인 여부에 따라 Login / 계정 앱 ---------- */
export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

function AuthGate() {
  const { session, uid } = useAuth();
  if (!session) return <Login />;
  return <AccountApp key={uid} />; // 계정이 바뀌면 상태를 새로 불러오도록 재마운트
}

/* ---------- 전역 상태 허브: 일정 / 이용권 / 찜 / 커스텀 암장 + localStorage 동기화 + 라우팅 ---------- */
function AccountApp() {
  const { uid } = useAuth();
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [sel, setSel] = useState(todayKey);
  const [events, setEvents] = useState(() => store.get(`clacale:events:${uid}`, seed));
  const commit = (fn) => setEvents((p) => { const n = fn(p); store.set(`clacale:events:${uid}`, n); return n; });
  const [passes, setPasses] = useState(() => store.get(`clacale:passes:${uid}`, MOCK_PASSES));
  const [customGyms, setCustomGyms] = useState(() => store.get(`clacale:gyms:${uid}`, []));
  const savePasses = (fn) => setPasses((p) => { const n = fn(p); store.set(`clacale:passes:${uid}`, n); return n; });
  const saveGyms = (fn) => setCustomGyms((p) => { const n = fn(p); store.set(`clacale:gyms:${uid}`, n); return n; });
  // 일정이 정지 기간과 겹칠 때: 정지 종료일을 일정 전날로 단축
  const adjustPasses = (ids, date) => savePasses((l) => l.map((x) => (ids.includes(x.id) ? shortenPause(x, addDays(date, -1)) : x)));
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
    const res = settleCountPasses(passes, events, todayKey);
    if (res) savePasses(() => res);
  }, [passes, events, tick]);
  const [favs, setFavs] = useState(() => store.get(`clacale:favs:${uid}`, [])); // 즐겨찾기한 센터(브랜드) 키: "b:브랜드id"
  const toggleFav = (key) => setFavs((p) => { const n = p.includes(key) ? p.filter((k) => k !== key) : [...p, key]; store.set(`clacale:favs:${uid}`, n); return n; });
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

  // 일정(발생분) 하나의 혼잡도: 같은 날짜·암장·time_slot의 방문 예정 인원 = 집계값 + 내 일정
  const statOf = (o) => {
    const date = o.start.slice(0, 10), gym = gymIdOf(o), slot = midSlot(o.start, o.end);
    const own = events.filter((e) => occursOn(e, date)).map((e) => occurrence(e, date)).filter((x) => gymIdOf(x) === gym && midSlot(x.start, x.end) === slot).length;
    const visit = sampleVisits(date, gym, slot) + own;
    return { date, gym_id: gym, time_slot: slot, visit_count: visit, max_capacity: MAX_CAPACITY, pct: (visit / MAX_CAPACITY) * 100, level: crowdLevel(visit) };
  };
  const addEvent = (ev) => commit((p) => [...p, ev]);

  return (
    <BrowserRouter>
      <Container height="screen" className="app-shell">
        <main className="app-main">
          <Routes>
            <Route path="/" element={
              <Calendar ym={ym} setYm={setYm} sel={sel} setSel={setSel} events={events} addEvent={addEvent} deleteEvent={deleteEvent} statOf={statOf}
                favs={favs} toggleFav={toggleFav} passes={passes} customGyms={customGyms} adjustPasses={adjustPasses} />} />
            <Route path="/board" element={<Board />} />
            <Route path="/mypage" element={
              <MyPage passes={passes} favs={favs} customGyms={customGyms} savePasses={savePasses} saveGyms={saveGyms}
                onToggleFav={toggleFav} events={events} onDeleteRange={deleteBrandRange} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <TabBar />
      </Container>
    </BrowserRouter>
  );
}


/* ---------- 하단 네비게이션 바 ---------- */
function TabBar() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="하단 메뉴" className="tabbar">
      {TABS.map(({ to, label, icon: Icon }) => (
        <Link key={to} to={to} className="tabbar__item" aria-current={pathname === to ? "page" : undefined}>
          <Icon size={20} />{label}
        </Link>
      ))}
    </nav>
  );
}
