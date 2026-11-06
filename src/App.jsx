import { useEffect, useState } from "react";
import { Calendar as CalendarIcon, MessageSquare, User as UserIcon } from "lucide-react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { BUTTON_CSS } from "./components/Button";
import { INK, font } from "./lib/constants";
import { MAX_CAPACITY, crowdLevel, gymIdOf, midSlot, sampleVisits } from "./lib/crowd";
import { addDays, keyOf, parseKey, refreshTodayKey, today, todayKey } from "./lib/dates";
import { occurrence, occursOn } from "./lib/events";
import { settleCountPasses, shortenPause } from "./lib/passes";
import { MOCK_PASSES, seed } from "./lib/seed";
import { store } from "./lib/store";
import Board from "./pages/Board";
import Calendar from "./pages/Calendar";
import Login from "./pages/Login";
import MyPage from "./pages/MyPage";

/* ---------- 전역 상태 허브: 세션 / 일정 / 이용권 / 찜 / 커스텀 암장 + localStorage 동기화 + 라우팅 ---------- */
export default function App() {
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [sel, setSel] = useState(todayKey);
  const [session, setSession] = useState(() => store.get("clacale:session", null)); // null | {type:"guest"} | {type:"user", ...}
  const uid = session?.type === "user" ? session.id : "guest";
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
    if (!session) return;
    const res = settleCountPasses(passes, events, todayKey);
    if (res) savePasses(() => res);
  }, [session, passes, events, tick]);
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
  // 로그인/게스트 진입: 계정별 일정·즐겨찾기를 불러오고, 첫 로그인 때는 게스트 일정을 이어받음
  const signIn = (sess) => {
    const k = sess.type === "user" ? sess.id : "guest";
    let evs = store.get(`clacale:events:${k}`, null);
    if (evs === null) { evs = sess.type === "user" ? store.get("clacale:events:guest", seed) : seed; store.set(`clacale:events:${k}`, evs); }
    store.set("clacale:session", sess);
    const mig = (name, d) => { let v = store.get(`clacale:${name}:${k}`, null); if (v === null) { v = sess.type === "user" ? store.get(`clacale:${name}:guest`, d) : d; store.set(`clacale:${name}:${k}`, v); } return v; };
    setEvents(evs); setFavs(store.get(`clacale:favs:${k}`, [])); setPasses(mig("passes", MOCK_PASSES)); setCustomGyms(mig("gyms", [])); setSession(sess);
  };
  const signOut = () => { store.set("clacale:session", null); setSession(null); };
  const addEvent = (ev) => commit((p) => [...p, ev]);

  // 세션이 없으면 로그인 페이지
  if (!session) return <Login onSignIn={signIn} />;

  return (
    <BrowserRouter>
      <div style={{ position: "relative", margin: "0 auto", maxWidth: 448, height: "100dvh", display: "flex", flexDirection: "column", background: "#F3F4F2", color: INK, fontFamily: font }}>
        <style>{BUTTON_CSS}</style>
        <main style={{ position: "relative", flex: 1, minHeight: 0 }}>
          <Routes>
            <Route path="/" element={
              <Calendar session={session} ym={ym} setYm={setYm} sel={sel} setSel={setSel} events={events} addEvent={addEvent} deleteEvent={deleteEvent} statOf={statOf}
                favs={favs} toggleFav={toggleFav} passes={passes} customGyms={customGyms} adjustPasses={adjustPasses} signOut={signOut} />} />
            <Route path="/board" element={<Board session={session} />} />
            <Route path="/mypage" element={
              <MyPageRoute session={session} passes={passes} favs={favs} customGyms={customGyms} savePasses={savePasses} saveGyms={saveGyms}
                onToggleFav={toggleFav} events={events} onDeleteRange={deleteBrandRange} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <TabBar />
      </div>
    </BrowserRouter>
  );
}


/* ---------- 마이페이지 라우트: 시트를 닫으면 캘린더로 돌아감 ---------- */
function MyPageRoute(props) {
  const navigate = useNavigate();
  return <MyPage {...props} onClose={() => navigate("/")} />;
}

/* ---------- 하단 네비게이션 바 ---------- */
const TABS = [
  { to: "/", label: "캘린더", icon: CalendarIcon },
  { to: "/board", label: "자유게시판", icon: MessageSquare },
  { to: "/mypage", label: "마이페이지", icon: UserIcon },
];
function TabBar() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="하단 메뉴" style={{ display: "flex", flexShrink: 0, background: "#fff", borderTop: "1px solid rgba(0,0,0,.08)" }}>
      {TABS.map(({ to, label, icon: Icon }) => {
        const on = pathname === to;
        return (
          <Link key={to} to={to} aria-current={on ? "page" : undefined}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 0", fontSize: 11, fontWeight: on ? 700 : 500, color: on ? "#C2410C" : "rgba(0,0,0,.5)", textDecoration: "none" }}>
            <Icon size={20} />{label}
          </Link>
        );
      })}
    </nav>
  );
}
