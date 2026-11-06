import { BRANDS, CUSTOM } from "./constants";
import { pad } from "./dates";

/* ---------- 혼잡도 (gym_daily_stats: date, gym_id, time_slot, visit_count, max_capacity) ---------- */
export const MAX_CAPACITY = 100; // 암장 기본 최대 권장 인원

export const gymIdOf = (e) => { const br = e.brand === "custom" ? CUSTOM : BRANDS.find((b) => b.id === e.brand); const branch = e.place.replace(br?.name ?? "", "").trim(); return branch ? `${e.brand}:${branch}` : e.brand; };

// 시작/종료의 중간값 시각을 정시로 내린 time_slot (예: 13:00~17:00 -> 15:00)
export const midSlot = (s, e) => { const m = new Date((new Date(s).getTime() + new Date(e).getTime()) / 2); return `${pad(m.getHours())}:00`; };

// 예시 집계값: 실제 서비스에서는 모든 사용자의 일정으로 집계한 visit_count (여기에 내 일정이 더해짐)
export const sampleVisits = (date, gym, slot) => { let h = 0; for (const c of `${date}|${gym}|${slot}`) h = (h * 31 + c.charCodeAt(0)) % 9973; return 10 + (h % 80); };

export const crowdLevel = (v, max = MAX_CAPACITY) => {
  const pct = (v / max) * 100;
  if (pct < 50) return { label: "여유", color: "#10B981", cls: "bg-emerald-500" };
  if (pct < 80) return { label: "보통", color: "#F59E0B", cls: "bg-amber-500" };
  return { label: "혼잡", color: "#F43F5E", cls: "bg-rose-500" };
};
