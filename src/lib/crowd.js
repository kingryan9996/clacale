import { CROWD_DISPLAY_SLOTS, CROWD_MIN_DISPLAY, CROWD_PENDING, CROWD_SLOT_HOURS } from "@/constants/crowd";
import { BRANDS } from "@/constants/brands";
import { pad } from "@/lib/dates";

/* ---------- 혼잡도 (gym_daily_stats: date, gym_id, time_slot, visit_count) ---------- */

export const gymIdOf = (e) => { const br = BRANDS.find((b) => b.id === e.brand); const branch = e.place.replace(br?.name ?? "", "").trim(); return branch ? `${e.brand}:${branch}` : e.brand; };

// 일정 시작/종료의 중간 시각이 속한 3시간 구간의 시작 시각 (예: 13:00~17:00 -> 중간 15:00 -> "15:00")
export const slotOf = (s, e) => { const m = new Date((new Date(s).getTime() + new Date(e).getTime()) / 2); return `${pad(Math.floor(m.getHours() / CROWD_SLOT_HOURS) * CROWD_SLOT_HOURS)}:00`; };

export const slotLabel = (slot) => { const h = parseInt(slot, 10); return `${h}~${h + CROWD_SLOT_HOURS}시`; };

// 표시 문구: 집계 없음 / 20명 미만 / N명
export const crowdText = (count) => (count == null ? CROWD_PENDING : count < CROWD_MIN_DISPLAY ? `${CROWD_MIN_DISPLAY}명 미만` : `${count}명`);

// 다른 사용자의 방문 예정 집계 조회: 서버 집계(P2, gym_daily_stats)가 연결되기 전까지는 null → 화면은 "집계 준비 중".
// 연결되면 get(date, gym) 이 { "12:00": 31, "15:00": 8 } 처럼 구간별 인원을 돌려주면 된다.
export const aggregateSource = { get: (/* date, gymId */) => null };

// 일정(발생분) 하나에 대한 혼잡도 표시용 데이터
export const buildCrowd = (o, agg) => {
  const date = o.start.slice(0, 10), gym_id = gymIdOf(o), time_slot = slotOf(o.start, o.end);
  const pending = agg == null;
  const ids = [...new Set([...CROWD_DISPLAY_SLOTS.map((h) => `${pad(h)}:00`), time_slot])].sort();
  const slots = ids.map((slot) => ({ slot, label: slotLabel(slot), count: pending ? null : agg[slot] ?? 0, mine: slot === time_slot }));
  return {
    date, gym_id, time_slot, pending, slots,
    count: pending ? null : agg[time_slot] ?? 0, // 내 일정이 속한 구간
    day: pending ? null : Object.values(agg).reduce((a, b) => a + b, 0), // 하루 전체
  };
};
