import { dayDiff } from "@/lib/dates";

/* ---------- 이용권 모아보기 집계 (사용대기 = 시작일 없는 이용권은 제외) ---------- */

// 이용권 하나의 지금까지 사용량: 기간권 = 이용한 일수(정지 일수 제외), 횟수권 = 쓴 횟수
export const passUsage = (p, today) => {
  if (p.start == null) return { days: 0, uses: 0 };
  if (p.kind === "count") return { days: 0, uses: Math.max(0, p.total - p.remaining) };
  if (p.start > today) return { days: 0, uses: 0 };
  const end = p.expires && p.expires < today ? p.expires : today;
  let days = dayDiff(p.start, end) + 1;
  for (const z of p.pauses ?? []) {
    const a = z.from > p.start ? z.from : p.start, b = z.to < end ? z.to : end;
    if (b >= a) days -= dayDiff(a, b) + 1;
  }
  return { days: Math.max(0, days), uses: 0 };
};

// 모아보기에 나오는 연도 목록(시작일 기준, 최근 연도부터)
export const collectYears = (passes) => [...new Set(passes.filter((p) => p.start != null).map((p) => p.start.slice(0, 4)))].sort().reverse();

// year: "2026" 처럼 고르거나 null(전체)
export const collectStats = (passes, today, year = null) => {
  const list = passes.filter((p) => p.start != null && (year == null || p.start.slice(0, 4) === String(year))).sort((a, b) => b.start.localeCompare(a.start));
  const brands = new Map();
  let periodCount = 0, countCount = 0, periodDays = 0, countUses = 0, pauseCount = 0;
  list.forEach((p) => {
    const u = passUsage(p, today);
    if (p.kind === "period") { periodCount += 1; periodDays += u.days; pauseCount += (p.pauses ?? []).length; } else { countCount += 1; countUses += u.uses; }
    const b = brands.get(p.brand) ?? { brand: p.brand, passCount: 0, days: 0, uses: 0 };
    b.passCount += 1; b.days += u.days; b.uses += u.uses; brands.set(p.brand, b);
  });
  return {
    passCount: list.length, periodCount, countCount, periodDays, countUses, pauseCount, list,
    brands: [...brands.values()].sort((a, b) => b.passCount - a.passCount || b.days + b.uses - (a.days + a.uses) || a.brand.localeCompare(b.brand)),
  };
};
