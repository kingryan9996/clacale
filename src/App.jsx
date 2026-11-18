import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MAX_CAPACITY, crowdLevel, gymIdOf, midSlot, sampleVisits } from "./lib/crowd";
import { addDays, keyOf, parseKey, refreshTodayKey, today, todayKey } from "./lib/dates";
import { occurrence, occursOn } from "./lib/events";
import { settleCountPasses, shortenPause } from "./lib/passes";
import { MOCK_PASSES, seed } from "./lib/seed";
import { store } from "./lib/store";
import Calendar from './pages/Calendar';
import Board from './pages/Board';
import MyPage from './pages/MyPage';

const TABS = [
  { to: '/', label: '캘린더' },
  { to: '/board', label: '자유게시판' },
  { to: '/mypage', label: '마이페이지' },
];

/* ---------- 앱 데이터 상태 허브: 일정 / 이용권 / 찜 / 커스텀 암장 (세션은 AuthContext에서) ---------- */
function AppRoutes() {
  const { session, signOut } = useAuth(); // 전역에서 세션 바로 가져오기!

  // if (!session) {
  //   return <Login />;
  // }

  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [sel, setSel] = useState(todayKey);
  const uid = session?.type === "user" ? session.id : "guest";
  const [events, setEvents] = useState(() => store.get(`clacale:events:${uid}`, seed));
  const commit = (fn) => setEvents((p) => { const n = fn(p); store.set(`clacale:events:${uid}`, n); return n; });
  const [passes, setPasses] = useState(() => store.get(`clacale:passes:${uid}`, MOCK_PASSES));
  const [customGyms, setCustomGyms] = useState(() => store.get(`clacale:gyms:${uid}`, []));
  const [favs, setFavs] = useState(() => store.get(`clacale:favs:${uid}`, [])); // 즐겨찾기한 센터(브랜드) 키: "b:브랜드id"
  const savePasses = (fn) => setPasses((p) => { const n = fn(p); store.set(`clacale:passes:${uid}`, n); return n; });
  const saveGyms = (fn) => setCustomGyms((p) => { const n = fn(p); store.set(`clacale:gyms:${uid}`, n); return n; });
  const toggleFav = (key) => setFavs((p) => { const n = p.includes(key) ? p.filter((k) => k !== key) : [...p, key]; store.set(`clacale:favs:${uid}`, n); return n; });

  // 세션(계정)이 바뀌면 해당 계정의 데이터를 다시 불러옴
  useEffect(() => {
    setEvents(store.get(`clacale:events:${uid}`, seed));
    setPasses(store.get(`clacale:passes:${uid}`, MOCK_PASSES));
    setCustomGyms(store.get(`clacale:gyms:${uid}`, []));
    setFavs(store.get(`clacale:favs:${uid}`, []));
  }, [uid]);

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
    if (!session) return;
    const res = settleCountPasses(passes, events, todayKey);
    if (res) savePasses(() => res);
  }, [session, passes, events, tick]);

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
  const addEvent = (ev) => commit((p) => [...p, ev]);

  // 일정(발생분) 하나의 혼잡도: 같은 날짜·암장·time_slot의 방문 예정 인원 = 집계값 + 내 일정
  const statOf = (o) => {
    const date = o.start.slice(0, 10), gym = gymIdOf(o), slot = midSlot(o.start, o.end);
    const own = events.filter((e) => occursOn(e, date)).map((e) => occurrence(e, date)).filter((x) => gymIdOf(x) === gym && midSlot(x.start, x.end) === slot).length;
    const visit = sampleVisits(date, gym, slot) + own;
    return { date, gym_id: gym, time_slot: slot, visit_count: visit, max_capacity: MAX_CAPACITY, pct: (visit / MAX_CAPACITY) * 100, level: crowdLevel(visit) };
  };

  return (
    <BrowserRouter>
      {/* 전역 페이지 레이아웃: 모든 라우트의 바깥 여백은 여기서만 지정 (px-4 / pt-4 / pb-20 + safe-area).
          페이지 컴포넌트는 바깥 패딩 없이 height: 100%로 이 영역을 채움.
          모달·전체화면 뷰는 components/Overlay(포털)로 렌더 → 이 패딩의 영향을 받지 않음 */}
      <main className="h-full overflow-y-auto px-4 pt-4" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        <Routes>
          <Route path="/" element={
            <Calendar ym={ym} setYm={setYm} sel={sel} setSel={setSel} events={events} addEvent={addEvent} deleteEvent={deleteEvent} statOf={statOf}
              favs={favs} toggleFav={toggleFav} passes={passes} customGyms={customGyms} adjustPasses={adjustPasses} signOut={signOut} />} />
          <Route path="/board" element={<Board />} />
          <Route path="/mypage" element={
            <MyPage passes={passes} favs={favs} customGyms={customGyms} savePasses={savePasses} saveGyms={saveGyms}
              onToggleFav={toggleFav} events={events} onDeleteRange={deleteBrandRange} />} />
        </Routes>
      </main>

      {/* 모바일 하단 탭바 */}
      <nav aria-label="주요 메뉴" className="fixed bottom-0 inset-x-0 z-40 grid grid-cols-3 border-t border-black/10 bg-white"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {TABS.map(({ to, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => `min-w-0 flex items-center justify-center h-14 text-sm text-center whitespace-nowrap ${isActive ? 'font-bold text-black' : 'font-medium text-black/45'}`}>
            {label}
          </NavLink>
        ))}
      </nav>
    </BrowserRouter>
  );
}

// 최상단 메인 App 컴포넌트
export default function App() {
  return (
    <AuthProvider>
        <AppRoutes />
    </AuthProvider>
  );
}
