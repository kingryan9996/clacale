import { describe, expect, it } from "vitest";
import { collectStats, collectYears, passUsage } from "@/lib/collection";

const period = (o) => ({ id: "p", brand: "climb", kind: "period", days: 30, start: "2026-01-01", expires: "2026-01-30", pauses: [], bonusDays: 0, ...o });
const count = (o) => ({ id: "c", brand: "park", kind: "count", total: 10, remaining: 4, start: "2026-02-01", expires: "2027-01-31", pauses: [], bonusDays: 0, ...o });

describe("passUsage", () => {
  it("끝난 기간권은 기간 전체", () => {
    expect(passUsage(period(), "2026-06-01")).toEqual({ days: 30, uses: 0 });
  });
  it("진행 중인 기간권은 오늘까지", () => {
    expect(passUsage(period(), "2026-01-10")).toEqual({ days: 10, uses: 0 });
  });
  it("정지한 날은 이용일수에서 뺀다 (만료일은 정지만큼 밀려 있음)", () => {
    const p = period({ pauses: [{ id: "z", from: "2026-01-05", to: "2026-01-11" }], expires: "2026-02-06" });
    expect(passUsage(p, "2026-06-01")).toEqual({ days: 30, uses: 0 });
    expect(passUsage(p, "2026-01-08")).toEqual({ days: 4, uses: 0 }); // 1/1~1/8 중 정지 4일(5~8)
  });
  it("아직 시작 전이거나 사용대기면 0", () => {
    expect(passUsage(period(), "2025-12-01")).toEqual({ days: 0, uses: 0 });
    expect(passUsage(period({ start: null }), "2026-06-01")).toEqual({ days: 0, uses: 0 });
  });
  it("횟수권은 쓴 횟수", () => {
    expect(passUsage(count(), "2026-06-01")).toEqual({ days: 0, uses: 6 });
  });
});

describe("collectStats", () => {
  const list = [period(), period({ id: "p2", brand: "park", start: "2025-03-01", expires: "2025-03-30", pauses: [{ id: "z", from: "2025-03-10", to: "2025-03-12" }] }), count(), count({ id: "w", start: null })];
  it("전체: 사용대기는 제외하고 합산", () => {
    const s = collectStats(list, "2026-06-01");
    expect(s.passCount).toBe(3);
    expect(s.periodCount).toBe(2);
    expect(s.countCount).toBe(1);
    expect(s.periodDays).toBe(30 + 30 - 3);
    expect(s.countUses).toBe(6);
    expect(s.pauseCount).toBe(1);
  });
  it("연도로 거른다", () => {
    const s = collectStats(list, "2026-06-01", "2025");
    expect(s.passCount).toBe(1);
    expect(s.brands[0].brand).toBe("park");
  });
  it("암장별은 이용권 많은 순", () => {
    const s = collectStats(list, "2026-06-01");
    expect(s.brands.map((b) => b.brand)).toEqual(["park", "climb"]);
    expect(s.brands[0]).toMatchObject({ passCount: 2 });
  });
  it("목록은 시작일 최신순", () => {
    expect(collectStats(list, "2026-06-01").list.map((p) => p.id)).toEqual(["c", "p", "p2"]);
  });
  it("연도 목록: 최근부터, 사용대기 제외", () => {
    expect(collectYears(list)).toEqual(["2026", "2025"]);
  });
  it("비어 있으면 모두 0", () => {
    expect(collectStats([], "2026-06-01")).toMatchObject({ passCount: 0, periodDays: 0, brands: [] });
  });
});
