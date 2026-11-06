import { ALERTS, DOW } from "./constants";

/* ---------- 날짜 유틸 ---------- */
export const pad = (n) => String(n).padStart(2, "0");

export const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

export const keyOf = (dt) => ymd(dt.getFullYear(), dt.getMonth(), dt.getDate());

export const today = new Date();

export let todayKey = keyOf(today); // 앱을 켜 둔 채 자정이 지나면 갱신됨

export const dayKey = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return keyOf(d); };

export const hm = (s) => s.slice(11, 16);

// 시작 시각 오름차순 -> 같으면 종료 시각 -> 등록 순
export const byStart = (a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end) || a.id - b.id;

export const parseKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };

export const dayDiff = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);

export const toStr = (d) => `${keyOf(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const fmtDay = (k) => { const d = parseKey(k); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW[d.getDay()]})`; };

export const t12 = (s) => { const h = Number(s.slice(-5, -3)); return `${h < 12 ? "오전" : "오후"} ${pad(h % 12 || 12)}:${s.slice(-2)}`; }; // 24시 문자열 -> 오전/오후 표기

export const fmtShort = (s) => { const d = parseKey(s.slice(0, 10)); return `${d.getMonth() + 1}/${d.getDate()}(${DOW[d.getDay()]}) ${t12(s)}`; };

export const fmtRange = (s, e) => s.slice(0, 10) === e.slice(0, 10)
  ? `${fmtDay(s.slice(0, 10))} ${t12(s)} – ${t12(e)}`
  : `${fmtDay(s.slice(0, 10))} ${t12(s)} → ${fmtDay(e.slice(0, 10))} ${t12(e)}`;

export const alertLabel = (m) => ALERTS.find((a) => a.min === m)?.label ?? `${m}분 전`;

// 모달 기본 시작: 현재 시각 기준, 정각이 아니면 다음 정각으로 올림 (선택한 날짜가 오늘이 아니면 그 날짜의 같은 시각)
export const defaultStart = (date) => {
  const n = new Date();
  if (n.getMinutes() !== 0) n.setHours(n.getHours() + 1);
  n.setMinutes(0, 0, 0);
  return `${date === todayKey ? keyOf(n) : date}T${pad(n.getHours())}:00`;
};

export const plus3h = (s) => toStr(new Date(new Date(s).getTime() + 3 * 3600000)); // 기본 소요시간 3시간

/* ---------- 이용권 (브랜드 단위) / 기간 정지 ---------- */
export const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };

export const fmtDate = (k) => `${k.slice(0, 4)}/${k.slice(5, 7)}/${k.slice(8, 10)}`; // YYYY/MM/DD (키는 이미 0 채움)

export const H12 = Array.from({ length: 12 }, (_, i) => pad(i + 1)); // 01 ~ 12 (오전/오후는 별도 선택)

export const MIN5 = Array.from({ length: 12 }, (_, i) => pad(i * 5)); // 00, 05, ... 55

export const refreshTodayKey = (k) => { todayKey = k; }; // 자정이 지나면 오늘 날짜 갱신 (ESM의 export let 은 다른 모듈에서 대입할 수 없어 setter 제공)
