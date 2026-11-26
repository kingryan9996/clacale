import { addDays, dayDiff, hm, keyOf, parseKey } from "@/lib/dates";
import { newId } from "@/lib/id";

/* 반복 일정: 날짜 k에 e가 발생하는지, 그리고 그 날짜의 발생분(시작/종료) 만들기 */
export const occursOn = (e, k) => {
  const base = e.start.slice(0, 10);
  if (e.ex?.includes(k) || (e.until && k > e.until)) return false; // 삭제된 날짜 / 종료일 이후
  if (k < base) return false;
  if (k === base) return true;
  const d = parseKey(k), b = parseKey(base);
  if (e.repeat === "daily") return true;
  if (e.repeat === "weekly") return dayDiff(base, k) % 7 === 0;
  if (e.repeat === "monthly") return d.getDate() === b.getDate();
  if (e.repeat === "yearly") return d.getMonth() === b.getMonth() && d.getDate() === b.getDate();
  return false;
};

export const occurrence = (e, k) => {
  const end = parseKey(k); end.setDate(end.getDate() + dayDiff(e.start.slice(0, 10), e.end.slice(0, 10)));
  return { ...e, start: `${k}T${hm(e.start)}`, end: `${keyOf(end)}T${hm(e.end)}` };
};

/* ---------- 일정 수정 ----------
   occ: 수정하려는 발생분(날짜 k), next: 수정한 값(brand/place/start/end/travel/repeat/alerts/memo — start/end 는 그 발생분 기준).
   scope: one = 이 날짜만 따로 빼서 새 일정으로 · after = 이 날짜부터 새 시리즈로 · all = 시리즈 전체(날짜를 옮기면 시리즈 전체가 같이 이동) */
const shiftList = (l, n) => (l ?? []).map((x) => addDays(x, n));

export const applyEdit = (events, occ, next, scope, makeId = newId) => events.flatMap((e) => {
  if (e.id !== occ.id) return [e];
  const { brand, place, start, end, travel, repeat, alerts, memo } = next;
  const fields = { brand, place, travel, alerts, memo };
  const k = occ.start.slice(0, 10), base = e.start.slice(0, 10), nk = start.slice(0, 10), shift = dayDiff(k, nk);
  if (e.repeat === "none") return [{ ...e, ...fields, start, end, repeat }];
  if (scope === "one") return [{ ...e, ex: [...(e.ex ?? []), k] }, { id: makeId(), ...fields, start, end, repeat: "none" }];
  if (scope === "after" && k > base) {
    const ex = (e.ex ?? []).filter((x) => x >= k);
    return [
      { ...e, until: addDays(k, -1) },
      { id: makeId(), ...fields, start, end, repeat, ...(e.until ? { until: addDays(e.until, shift) } : null), ...(ex.length ? { ex: shiftList(ex, shift) } : null) },
    ];
  }
  // all (또는 첫 발생분에서 '이후 모두'): 시리즈의 기준 일정을 같은 만큼 옮긴다
  const delta = dayDiff(k, base);
  const { ex, until, ...rest } = e;
  return [{
    ...rest, ...fields, repeat,
    start: `${addDays(nk, delta)}T${hm(start)}`, end: `${addDays(end.slice(0, 10), delta)}T${hm(end)}`,
    ...(ex?.length ? { ex: shiftList(ex, shift) } : null), ...(until ? { until: addDays(until, shift) } : null),
  }];
});
