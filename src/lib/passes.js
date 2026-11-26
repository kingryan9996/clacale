import { PERIODS } from "@/constants/passes";
import { addDays, dayDiff, fmtDate, hm, todayKey } from "@/lib/dates";
import { occursOn } from "@/lib/events";
import { byCreated } from "@/lib/id";

export const passTitle = (p) => (p.kind === "period" ? `기간권 ${PERIODS.find((x) => x.days === p.days)?.label ?? `${p.days}일`}` : `횟수권 ${p.total}회`);

/* ---------- 정지 이력(pauses: [{ id, from, to }]) · 만료일 자동 계산 ----------
   기간권 만료일 = 시작일 + 기간 - 1 + 정지 일수 합계 + 추가 일수(bonusDays, 암장이 따로 늘려 준 날 등, 음수 가능)
   횟수권 만료일 = 시작일 + 유효기간 - 1 + 추가 일수. 이용권을 바꿀 때마다 withExpires 로 expires 를 다시 채운다 */
export const pauseDays = (z) => Math.max(0, dayDiff(z.from, z.to) + 1);

export const pauseTotal = (p) => (p.pauses ?? []).reduce((n, z) => n + pauseDays(z), 0);

export const computeExpires = (p) => {
  if (!p.start) return null;
  const bonus = p.bonusDays ?? 0;
  if (p.kind === "period") return p.days ? addDays(p.start, p.days - 1 + pauseTotal(p) + bonus) : null;
  return p.validDays ? addDays(p.start, p.validDays - 1 + bonus) : null;
};

export const withExpires = (p) => ({ ...p, expires: computeExpires(p) });

export const pauseAt = (p, k) => (p.pauses ?? []).find((z) => z.from <= k && k <= z.to);

export const inPause = (p, k) => !!pauseAt(p, k);

// none(정지 이력 없음) | active(오늘 정지 중) | scheduled(앞으로 정지 예정) | done(지난 정지만 있음)
export const pauseState = (p, today = todayKey) => {
  const zs = p.pauses ?? [];
  if (!zs.length) return "none";
  if (zs.some((z) => z.from <= today && today <= z.to)) return "active";
  return zs.some((z) => today < z.from) ? "scheduled" : "done";
};

// 카드에 보여줄 정지: 지금 정지 중이면 그것, 아니면 가장 가까운 예정
export const currentPause = (p, today = todayKey) =>
  pauseAt(p, today) ?? [...(p.pauses ?? [])].filter((z) => today < z.from).sort((a, b) => a.from.localeCompare(b.from))[0];

// date(일정 날짜)부터는 정지를 풀고 싶을 때: 그 날짜가 속한 정지를 전날까지로 줄인다(그 정지가 date 에 시작하면 삭제). 만료일은 자동으로 줄어든다
export const shortenPauseAt = (p, date) => {
  const z = pauseAt(p, date);
  if (!z) return p;
  const newTo = addDays(date, -1);
  const pauses = newTo < z.from ? p.pauses.filter((x) => x !== z) : p.pauses.map((x) => (x === z ? { ...x, to: newTo } : x));
  return withExpires({ ...p, pauses });
};

// 카드의 [정지 해제]: 정지 중이면 오늘부터 해제, 정지 예정이면 그 예정을 취소
export const endPause = (p, today = todayKey) => {
  if (pauseAt(p, today)) return shortenPauseAt(p, today);
  const next = currentPause(p, today);
  return next ? withExpires({ ...p, pauses: p.pauses.filter((x) => x !== next) }) : p;
};

// 서로 겹치는 정지 쌍(경고용). 시작이 끝보다 늦은 잘못된 항목은 invalidPauses 로 따로 찾는다
export const pauseOverlaps = (pauses) => {
  const out = [];
  pauses.forEach((a, i) => pauses.forEach((b, j) => { if (j > i && a.from <= b.to && b.from <= a.to) out.push([i, j]); }));
  return out;
};

export const invalidPauses = (pauses) => pauses.filter((z) => !z.from || !z.to || z.to < z.from);

export const pauseHistory = (p) => (p.pauses ?? []).length; // 기간권 정지 횟수

/* ---------- 횟수권 수정 ----------
   남은 횟수는 "수정한 그 순간의 실제 남은 횟수". 직접 바꾸면 그 시각(countedFrom) 이후에 시작하는 일정만 자동 차감한다.
   (이미 입력한 숫자에 포함된 운동이 일정으로도 있어 이중 차감되는 것을 막음) */
export const usedCount = (p) => p.total - p.remaining;

// prev: 수정 전 이용권(새로 만들 때는 null), next: 새 값. nowStr: "YYYY-MM-DDTHH:mm"
export const finishCountEdit = (prev, next, nowStr) => {
  const out = { ...next };
  const remainingChanged = prev ? prev.remaining !== next.remaining : next.remaining !== next.total;
  if (remainingChanged) out.countedFrom = nowStr;
  if (out.remaining <= 0) out.endedOn = prev && prev.remaining <= 0 && prev.endedOn ? prev.endedOn : nowStr.slice(0, 10);
  else delete out.endedOn;
  return withExpires(out);
};

// 지난 일정(오늘 이전)마다 해당 브랜드의 이용중 횟수권을 1회씩 자동 차감. 차감한 발생분은 usedKeys에 기록해 중복 차감 방지
export const settleCountPasses = (passes, events, today) => {
  const used = new Set(passes.flatMap((p) => p.usedKeys ?? []));
  const yesterday = addDays(today, -1);
  let changed = false;
  const next = [...passes].sort(byCreated).map((p) => {
    if (p.kind !== "count" || p.start == null || p.remaining <= 0) return p;
    const to = p.expires && p.expires < yesterday ? p.expires : yesterday;
    const hits = [];
    events.filter((e) => e.brand === p.brand).forEach((e) => {
      const d0 = e.start.slice(0, 10);
      for (let k = p.start > d0 ? p.start : d0; k <= to; k = addDays(k, 1)) {
        if (p.countedFrom && `${k}T${hm(e.start)}` < p.countedFrom) continue; // 직접 맞춘 횟수에 이미 포함된 일정은 차감하지 않음
        const key = `${e.id}|${k}`; if (!used.has(key) && occursOn(e, k)) hits.push({ key, k });
      }
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
