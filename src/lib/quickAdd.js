import { hm, toStr } from "@/lib/dates";

/* ---------- 빠른 추가: 내 일정 기록에서 자주/최근 간 '암장 + 시작 시각 + 소요시간 + 이동시간' 조합을 뽑는다 ---------- */
const minutes = (s, e) => Math.round((new Date(e) - new Date(s)) / 60000);

// 많이 간 순 -> 같으면 최근 순. 반복 일정은 한 번만 센다(등록된 기준 발생분)
export const quickPicks = (events, limit = 4) => {
  const map = new Map();
  for (const e of events) {
    const dur = minutes(e.start, e.end);
    if (!(dur > 0)) continue;
    const key = `${e.brand}|${e.place}|${hm(e.start)}|${dur}|${e.travel ?? 0}`;
    const cur = map.get(key);
    if (cur) { cur.count += 1; if (e.start > cur.last) cur.last = e.start; }
    else map.set(key, { key, brand: e.brand, place: e.place, startHm: hm(e.start), durationMin: dur, travel: e.travel ?? 0, count: 1, last: e.start });
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last)).slice(0, limit);
};

// 선택한 날짜(date, "YYYY-MM-DD")에 이 조합을 적용했을 때의 시작/종료
export const applyPick = (pick, date) => {
  const start = `${date}T${pick.startHm}`;
  return { start, end: toStr(new Date(new Date(start).getTime() + pick.durationMin * 60000)) };
};
