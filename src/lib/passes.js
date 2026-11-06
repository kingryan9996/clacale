import { addDays, dayDiff, fmtDate, todayKey } from "./dates";
import { occursOn } from "./events";

export const PERIODS = [{ days: 30, label: "1개월" }, { days: 90, label: "3개월" }, { days: 180, label: "6개월" }, { days: 365, label: "1년" }];

export const COUNTS = [5, 10, 30];

export const passTitle = (p) => (p.kind === "period" ? `기간권 ${PERIODS.find((x) => x.days === p.days)?.label ?? `${p.days}일`}` : `횟수권 ${p.total}회`);

export const pauseState = (p) => (!p.pause ? "none" : todayKey < p.pause.from ? "scheduled" : todayKey <= p.pause.to ? "active" : "done");

export const inPause = (p, k) => !!p.pause && p.pause.from <= k && k <= p.pause.to;

const pauseLen = (p) => dayDiff(p.pause.from, p.pause.to) + 1;

// 정지 종료일을 newTo로 줄이면 줄어든 일수만큼 만료일도 되돌림 (newTo가 시작 전이면 정지 자체를 취소)
export const shortenPause = (p, newTo) => {
  const cut = Math.min(dayDiff(newTo, p.pause.to), pauseLen(p));
  const cancelled = newTo < p.pause.from; // 시작 전에 취소된 정지는 이력(횟수)에서 제외
  return { ...p, expires: p.expires ? addDays(p.expires, -cut) : p.expires, pauseCount: cancelled ? Math.max(0, pauseHistory(p) - 1) : pauseHistory(p), pause: cancelled ? null : { ...p.pause, to: newTo } };
};

export const pauseHistory = (p) => p.pauseCount ?? (p.pause ? 1 : 0); // 기간권 정지 횟수

export const startPause = (p, from, days) => ({ ...p, expires: p.expires ? addDays(p.expires, days) : p.expires, pauseCount: pauseHistory(p) + 1, pause: { from, to: addDays(from, days - 1) } }); // 정지 일수만큼 만료일 연장

// 지난 일정(오늘 이전)마다 해당 브랜드의 이용중 횟수권을 1회씩 자동 차감. 차감한 발생분은 usedKeys에 기록해 중복 차감 방지
export const settleCountPasses = (passes, events, today) => {
  const used = new Set(passes.flatMap((p) => p.usedKeys ?? []));
  const yesterday = addDays(today, -1);
  let changed = false;
  const next = [...passes].sort((a, b) => a.id - b.id).map((p) => {
    if (p.kind !== "count" || p.start == null || p.remaining <= 0) return p;
    const to = p.expires && p.expires < yesterday ? p.expires : yesterday;
    const hits = [];
    events.filter((e) => e.brand === p.brand).forEach((e) => {
      const d0 = e.start.slice(0, 10);
      for (let k = p.start > d0 ? p.start : d0; k <= to; k = addDays(k, 1)) { const key = `${e.id}|${k}`; if (!used.has(key) && occursOn(e, k)) hits.push({ key, k }); }
    });
    hits.sort((a, b) => a.k.localeCompare(b.k) || a.key.localeCompare(b.key));
    const take = hits.slice(0, p.remaining);
    if (!take.length) return p;
    changed = true; take.forEach((h) => used.add(h.key));
    const remaining = p.remaining - take.length;
    return { ...p, remaining, usedKeys: [...(p.usedKeys ?? []), ...take.map((h) => h.key)], ...(remaining <= 0 ? { endedOn: addDays(take[take.length - 1].k, 1) } : null) };
  });
  return changed ? next : null;
};

// 사용대기 = start(사용 시작일)가 없는 이용권. 시작일을 지정하면 이용중, 기간/횟수를 다 쓰면 만료됨
export const endDate = (x) => (x.kind === "period" ? x.expires : x.remaining <= 0 ? x.endedOn ?? x.expires ?? x.start : x.expires); // 만료/소진된 날짜

const passState = (x) => (x.start == null ? "waiting" : x.kind === "period" ? (x.expires < todayKey ? "expired" : "active") : (x.remaining <= 0 || (x.expires != null && x.expires < todayKey) ? "expired" : "active"));

export const VALIDS = [{ days: 180, label: "6개월" }, { days: 365, label: "1년" }]; // 횟수권 유효기간

export const passLine = (x, sk) => {
  if (sk === "waiting") return `사용대기 중${x.kind === "count" ? ` · 총 ${x.total}회` : ""}`;
  const range = x.expires ? `${fmtDate(x.start)} ~ ${fmtDate(x.expires)}` : fmtDate(x.start);
  if (sk === "expired") return x.kind === "period" ? `${range} · 만료` : `${x.expires ? `${range} · ` : ""}남은\u00A0횟수\u00A0${x.remaining}/${x.total} · ${x.remaining <= 0 ? "소진" : "기간 만료"} ${fmtDate(endDate(x))}`;
  return x.kind === "period" ? range : `${x.expires ? `${range} · ` : ""}남은\u00A0횟수\u00A0${x.remaining}/${x.total}`;
};

export const statusMap = (list) => Object.fromEntries(list.map((x) => [x.id, passState(x)]));

// 기간(from~to) 안에 발생하는 해당 브랜드 일정(반복 포함)
export const brandOccurrences = (events, brand, from, to) => {
  const out = [];
  events.filter((e) => e.brand === brand).forEach((e) => { for (let k = from; k <= to; k = addDays(k, 1)) if (occursOn(e, k)) out.push({ date: k, place: e.place }); });
  return out.sort((a, b) => a.date.localeCompare(b.date));
};
