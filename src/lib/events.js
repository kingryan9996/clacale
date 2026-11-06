import { dayDiff, hm, keyOf, parseKey } from "./dates";

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
