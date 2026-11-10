import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, ChevronDown, Menu, Plus, X, Check,
  MapPin, Clock, Car, StickyNote, Repeat, Bell, Trash2, Heart, Users, BarChart3, User,
  Calendar,
} from "lucide-react";
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import CalendarPage from './pages/Calendar';
import BoardPage from './pages/Board';
import MyPage from './pages/MyPage';

// // 브랜드와 지점을 가나다순으로 정렬
// const ko = (a, b) => a.localeCompare(b, "ko");
// const BRANDS = BRAND_DATA.map((b) => ({ ...b, branches: [...b.branches].sort(ko) })).sort((a, b) => ko(a.name, b.name));
// const CUSTOM = { id: "custom", name: "내 암장", color: "#64748B", branches: [] }; // 마이페이지에서 등록한 커스텀 암장
// const brandOf = (id) => (id === "custom" ? CUSTOM : BRANDS.find((b) => b.id === id) ?? BRANDS[0]);
// const TRAVEL = [0, 15, 30, 45, 60, 90];
// const DOW = ["일", "월", "화", "수", "목", "금", "토"];
// const dowColor = (i) => (i === 0 ? "#F43F5E" : i === 6 ? "#3B82F6" : INK);

// /* ---------- 날짜 유틸 ---------- */
// const pad = (n) => String(n).padStart(2, "0");
// const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
// const keyOf = (dt) => ymd(dt.getFullYear(), dt.getMonth(), dt.getDate());
// const today = new Date();
// let todayKey = keyOf(today); // 앱을 켜 둔 채 자정이 지나면 갱신됨
// const dayKey = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return keyOf(d); };
// const hm = (s) => s.slice(11, 16);
// // 시작 시각 오름차순 -> 같으면 종료 시각 -> 등록 순
// const byStart = (a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end) || a.id - b.id;

// const parseKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
// const dayDiff = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);
// const toStr = (d) => `${keyOf(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
// const fmtDay = (k) => { const d = parseKey(k); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW[d.getDay()]})`; };
// const t12 = (s) => { const h = Number(s.slice(-5, -3)); return `${h < 12 ? "오전" : "오후"} ${pad(h % 12 || 12)}:${s.slice(-2)}`; }; // 24시 문자열 -> 오전/오후 표기
// const fmtShort = (s) => { const d = parseKey(s.slice(0, 10)); return `${d.getMonth() + 1}/${d.getDate()}(${DOW[d.getDay()]}) ${t12(s)}`; };
// const fmtRange = (s, e) => s.slice(0, 10) === e.slice(0, 10)
//   ? `${fmtDay(s.slice(0, 10))} ${t12(s)} – ${t12(e)}`
//   : `${fmtDay(s.slice(0, 10))} ${t12(s)} → ${fmtDay(e.slice(0, 10))} ${t12(e)}`;
// const alertLabel = (m) => ALERTS.find((a) => a.min === m)?.label ?? `${m}분 전`;
// // 모달 기본 시작: 현재 시각 기준, 정각이 아니면 다음 정각으로 올림 (선택한 날짜가 오늘이 아니면 그 날짜의 같은 시각)
// const defaultStart = (date) => {
//   const n = new Date();
//   if (n.getMinutes() !== 0) n.setHours(n.getHours() + 1);
//   n.setMinutes(0, 0, 0);
//   return `${date === todayKey ? keyOf(n) : date}T${pad(n.getHours())}:00`;
// };
// const plus3h = (s) => toStr(new Date(new Date(s).getTime() + 3 * 3600000)); // 기본 소요시간 3시간

// /* ---------- 저장소: localStorage가 막힌 환경(미리보기)에서는 오류 없이 메모리로 대체 ---------- */
// const mem = {};
// const store = {
//   get(k, d) { try { const v = window.localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : d; } },
//   set(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { mem[k] = v; } },
// };

// /* ---------- 혼잡도 (gym_daily_stats: date, gym_id, time_slot, visit_count, max_capacity) ---------- */
// const MAX_CAPACITY = 100; // 암장 기본 최대 권장 인원
// const gymIdOf = (e) => { const br = e.brand === "custom" ? CUSTOM : BRANDS.find((b) => b.id === e.brand); const branch = e.place.replace(br?.name ?? "", "").trim(); return branch ? `${e.brand}:${branch}` : e.brand; };
// // 시작/종료의 중간값 시각을 정시로 내린 time_slot (예: 13:00~17:00 -> 15:00)
// const midSlot = (s, e) => { const m = new Date((new Date(s).getTime() + new Date(e).getTime()) / 2); return `${pad(m.getHours())}:00`; };
// // 예시 집계값: 실제 서비스에서는 모든 사용자의 일정으로 집계한 visit_count (여기에 내 일정이 더해짐)
// const sampleVisits = (date, gym, slot) => { let h = 0; for (const c of `${date}|${gym}|${slot}`) h = (h * 31 + c.charCodeAt(0)) % 9973; return 10 + (h % 80); };
// const crowdLevel = (v, max = MAX_CAPACITY) => {
//   const pct = (v / max) * 100;
//   if (pct < 50) return { label: "여유", color: "#10B981", cls: "bg-emerald-500" };
//   if (pct < 80) return { label: "보통", color: "#F59E0B", cls: "bg-amber-500" };
//   return { label: "혼잡", color: "#F43F5E", cls: "bg-rose-500" };
// };

// /* ---------- 이용권 (브랜드 단위) / 기간 정지 ---------- */
// const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
// const fmtDate = (k) => `${k.slice(0, 4)}/${k.slice(5, 7)}/${k.slice(8, 10)}`; // YYYY/MM/DD (키는 이미 0 채움)
// const PERIODS = [{ days: 30, label: "1개월" }, { days: 90, label: "3개월" }, { days: 180, label: "6개월" }, { days: 365, label: "1년" }];
// const COUNTS = [5, 10, 30];
// const passTitle = (p) => (p.kind === "period" ? `기간권 ${PERIODS.find((x) => x.days === p.days)?.label ?? `${p.days}일`}` : `횟수권 ${p.total}회`);
// const pauseState = (p) => (!p.pause ? "none" : todayKey < p.pause.from ? "scheduled" : todayKey <= p.pause.to ? "active" : "done");
// const inPause = (p, k) => !!p.pause && p.pause.from <= k && k <= p.pause.to;
// const pauseLen = (p) => dayDiff(p.pause.from, p.pause.to) + 1;
// // 정지 종료일을 newTo로 줄이면 줄어든 일수만큼 만료일도 되돌림 (newTo가 시작 전이면 정지 자체를 취소)
// const shortenPause = (p, newTo) => {
//   const cut = Math.min(dayDiff(newTo, p.pause.to), pauseLen(p));
//   const cancelled = newTo < p.pause.from; // 시작 전에 취소된 정지는 이력(횟수)에서 제외
//   return { ...p, expires: p.expires ? addDays(p.expires, -cut) : p.expires, pauseCount: cancelled ? Math.max(0, pauseHistory(p) - 1) : pauseHistory(p), pause: cancelled ? null : { ...p.pause, to: newTo } };
// };
// const pauseHistory = (p) => p.pauseCount ?? (p.pause ? 1 : 0); // 기간권 정지 횟수
// const startPause = (p, from, days) => ({ ...p, expires: p.expires ? addDays(p.expires, days) : p.expires, pauseCount: pauseHistory(p) + 1, pause: { from, to: addDays(from, days - 1) } }); // 정지 일수만큼 만료일 연장
// // 지난 일정(오늘 이전)마다 해당 브랜드의 이용중 횟수권을 1회씩 자동 차감. 차감한 발생분은 usedKeys에 기록해 중복 차감 방지
// const settleCountPasses = (passes, events, today) => {
//   const used = new Set(passes.flatMap((p) => p.usedKeys ?? []));
//   const yesterday = addDays(today, -1);
//   let changed = false;
//   const next = [...passes].sort((a, b) => a.id - b.id).map((p) => {
//     if (p.kind !== "count" || p.start == null || p.remaining <= 0) return p;
//     const to = p.expires && p.expires < yesterday ? p.expires : yesterday;
//     const hits = [];
//     events.filter((e) => e.brand === p.brand).forEach((e) => {
//       const d0 = e.start.slice(0, 10);
//       for (let k = p.start > d0 ? p.start : d0; k <= to; k = addDays(k, 1)) { const key = `${e.id}|${k}`; if (!used.has(key) && occursOn(e, k)) hits.push({ key, k }); }
//     });
//     hits.sort((a, b) => a.k.localeCompare(b.k) || a.key.localeCompare(b.key));
//     const take = hits.slice(0, p.remaining);
//     if (!take.length) return p;
//     changed = true; take.forEach((h) => used.add(h.key));
//     const remaining = p.remaining - take.length;
//     return { ...p, remaining, usedKeys: [...(p.usedKeys ?? []), ...take.map((h) => h.key)], ...(remaining <= 0 ? { endedOn: addDays(take[take.length - 1].k, 1) } : null) };
//   });
//   return changed ? next : null;
// };

// // 사용대기 = start(사용 시작일)가 없는 이용권. 시작일을 지정하면 이용중, 기간/횟수를 다 쓰면 만료됨
// const endDate = (x) => (x.kind === "period" ? x.expires : x.remaining <= 0 ? x.endedOn ?? x.expires ?? x.start : x.expires); // 만료/소진된 날짜
// const passState = (x) => (x.start == null ? "waiting" : x.kind === "period" ? (x.expires < todayKey ? "expired" : "active") : (x.remaining <= 0 || (x.expires != null && x.expires < todayKey) ? "expired" : "active"));
// const VALIDS = [{ days: 180, label: "6개월" }, { days: 365, label: "1년" }]; // 횟수권 유효기간
// const passLine = (x, sk) => {
//   if (sk === "waiting") return `사용대기 중${x.kind === "count" ? ` · 총 ${x.total}회` : ""}`;
//   const range = x.expires ? `${fmtDate(x.start)} ~ ${fmtDate(x.expires)}` : fmtDate(x.start);
//   if (sk === "expired") return x.kind === "period" ? `${range} · 만료` : `${x.expires ? `${range} · ` : ""}남은\u00A0횟수\u00A0${x.remaining}/${x.total} · ${x.remaining <= 0 ? "소진" : "기간 만료"} ${fmtDate(endDate(x))}`;
//   return x.kind === "period" ? range : `${x.expires ? `${range} · ` : ""}남은\u00A0횟수\u00A0${x.remaining}/${x.total}`;
// };
// const statusMap = (list) => Object.fromEntries(list.map((x) => [x.id, passState(x)]));
// // 초기 목업: 이미 만료된 이용권 5개 (브랜드·종류 혼합). Supabase용은 supabase/mock_passes.sql
// const mockPeriod = (id, brand, days, ago) => ({ id, brand, kind: "period", days, start: addDays(todayKey, -ago), expires: addDays(todayKey, -ago + days - 1), pause: null });
// const mockCount = (id, brand, total, ago) => {
//   const valid = total === 5 ? 180 : 365, start = addDays(todayKey, -ago);
//   return { id, brand, kind: "count", total, remaining: 0, validDays: valid, start, expires: addDays(start, valid - 1), endedOn: addDays(start, Math.max(1, Math.floor(Math.min(ago - 1, valid - 1) / 2))), pause: null };
// };
// const MOCK_PASSES = [
//   mockPeriod(1001, "stones", 180, 297),
//   mockCount(1002, "park", 30, 196),
//   mockPeriod(1003, "son", 180, 236),
//   mockPeriod(1004, "ficus", 90, 191),
//   mockCount(1005, "climb", 5, 151),
// ];
// // 기간(from~to) 안에 발생하는 해당 브랜드 일정(반복 포함)
// const brandOccurrences = (events, brand, from, to) => {
//   const out = [];
//   events.filter((e) => e.brand === brand).forEach((e) => { for (let k = from; k <= to; k = addDays(k, 1)) if (occursOn(e, k)) out.push({ date: k, place: e.place }); });
//   return out.sort((a, b) => a.date.localeCompare(b.date));
// };

// /* ---------- 인증 스텁: 미리보기에서는 실제 서버에 연결되지 않고 데모 계정으로 로그인됩니다 ---------- */
// const auth = {
//   // Supabase 연동 시: supabase.auth.signInWithOAuth({ provider: "kakao" | "google" })
//   async oauth(provider) { return { type: "user", id: `${provider}-demo`, provider, name: provider === "kakao" ? "카카오 데모 계정" : "Google 데모 계정" }; },
//   // Supabase 연동 시: supabase.auth.signInWithPassword / signUp
//   async email(email) { return { type: "user", id: `email-${email}`, provider: "email", name: email }; },
// };

// /* 반복 일정: 날짜 k에 e가 발생하는지, 그리고 그 날짜의 발생분(시작/종료) 만들기 */
// const occursOn = (e, k) => {
//   const base = e.start.slice(0, 10);
//   if (e.ex?.includes(k) || (e.until && k > e.until)) return false; // 삭제된 날짜 / 종료일 이후
//   if (k < base) return false;
//   if (k === base) return true;
//   const d = parseKey(k), b = parseKey(base);
//   if (e.repeat === "daily") return true;
//   if (e.repeat === "weekly") return dayDiff(base, k) % 7 === 0;
//   if (e.repeat === "monthly") return d.getDate() === b.getDate();
//   if (e.repeat === "yearly") return d.getMonth() === b.getMonth() && d.getDate() === b.getDate();
//   return false;
// };
// const occurrence = (e, k) => {
//   const end = parseKey(k); end.setDate(end.getDate() + dayDiff(e.start.slice(0, 10), e.end.slice(0, 10)));
//   return { ...e, start: `${k}T${hm(e.start)}`, end: `${keyOf(end)}T${hm(e.end)}` };
// };

// const REPEATS = [{ id: "none", label: "없음" }, { id: "daily", label: "매일" }, { id: "weekly", label: "매주" }, { id: "monthly", label: "매월" }, { id: "yearly", label: "매년" }];
// const ALERTS = [
//   { min: null, label: "없음" }, { min: 5, label: "5분 전" }, { min: 10, label: "10분 전" }, { min: 15, label: "15분 전" }, { min: 30, label: "30분 전" },
//   { min: 60, label: "1시간 전" }, { min: 120, label: "2시간 전" }, { min: 180, label: "3시간 전" },
//   { min: 1440, label: "1일 전" }, { min: 2880, label: "2일 전" }, { min: 10080, label: "1주 전" },
// ];
// const H12 = Array.from({ length: 12 }, (_, i) => pad(i + 1)); // 01 ~ 12 (오전/오후는 별도 선택)
// const MIN5 = Array.from({ length: 12 }, (_, i) => pad(i * 5)); // 00, 05, ... 55

// const SEED = [
//   { id: 1, brand: "climb", place: "더클라임 강남", start: `${dayKey(0)}T19:00`, end: `${dayKey(0)}T21:30`, travel: 30, memo: "새 루트 세팅 확인", repeat: "weekly", alerts: [60] },
//   { id: 2, brand: "forest", place: "서울숲 클라이밍 잠실", start: `${dayKey(2)}T10:00`, end: `${dayKey(2)}T12:00`, travel: 20, memo: "" },
//   { id: 3, brand: "alle", place: "알레클라임 혜화", start: `${dayKey(2)}T18:30`, end: `${dayKey(2)}T20:30`, travel: 45, memo: "친구랑 같이" },
//   { id: 4, brand: "stones", place: "스톤즈클라이밍", start: `${dayKey(2)}T08:00`, end: `${dayKey(2)}T09:30`, travel: 15, memo: "아침 워밍업" },
//   { id: 5, brand: "stones", place: "스톤즈클라이밍", start: `${dayKey(5)}T20:00`, end: `${dayKey(5)}T22:00`, travel: 15, memo: "볼더링 위주" },
// ];
// const seed = SEED.map((e) => ({ repeat: "none", alerts: [], ...e }));

// const font = '"Pretendard", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", "Segoe UI", sans-serif';

/* ---------- 메인 ---------- */

function AppRoutes() {
  const { session } = useAuth(); // 전역에서 세션 바로 가져오기!

  // if (!session) {
  //   return <Login />;
  // }

  return (
    <BrowserRouter>
      {/* 간단한 네비게이션 바 */}
      <nav style={{ display: 'flex', gap: '20px', padding: '15px', background: '#f5f5f5' }}>
        <Link to="/">캘린더</Link>
        <Link to="/board">자유게시판</Link>
        <Link to="/mypage">마이페이지</Link>
      </nav>

      {/* 경로에 따라 보여줄 컴포넌트 매핑 */}
      <main style={{ padding: '20px' }}>
        <Routes>
          <Route path="/" element={<CalendarPage />} />
          <Route path="/board" element={<BoardPage />} />
          <Route path="/mypage" element={<MyPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}


export default function App() {
  // const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() });
  // const [sel, setSel] = useState(todayKey);
  // const [session, setSession] = useState(() => store.get("clacale:session", null)); // null | {type:"guest"} | {type:"user", ...}
  // const uid = session?.type === "user" ? session.id : "guest";
  // const [events, setEvents] = useState(() => store.get(`clacale:events:${uid}`, seed));
  // const commit = (fn) => setEvents((p) => { const n = fn(p); store.set(`clacale:events:${uid}`, n); return n; });
  // const [menuOpen, setMenuOpen] = useState(false);
  // const [statsOpen, setStatsOpen] = useState(false);
  // const [loginPrompt, setLoginPrompt] = useState(false);
  // const [myOpen, setMyOpen] = useState(false);
  // const [passes, setPasses] = useState(() => store.get(`clacale:passes:${uid}`, MOCK_PASSES));
  // const [customGyms, setCustomGyms] = useState(() => store.get(`clacale:gyms:${uid}`, []));

  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}