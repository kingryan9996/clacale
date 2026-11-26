import { describe, expect, it } from "vitest";
import { applyPick, quickPicks } from "@/lib/quickAdd";

const ev = (id, start, end, o = {}) => ({ id, brand: "stones", place: "스톤즈클라이밍", start, end, travel: 15, ...o });

describe("quickPicks", () => {
  it("많이 간 조합이 먼저", () => {
    const l = [
      ev(1, "2026-01-01T20:00", "2026-01-01T22:00"),
      ev(2, "2026-01-02T08:00", "2026-01-02T09:30"),
      ev(3, "2026-01-03T08:00", "2026-01-03T09:30"),
    ];
    const p = quickPicks(l);
    expect(p[0].startHm).toBe("08:00");
    expect(p[0].count).toBe(2);
    expect(p[0].durationMin).toBe(90);
  });
  it("횟수가 같으면 최근 것이 먼저", () => {
    const l = [ev(1, "2026-01-01T20:00", "2026-01-01T22:00"), ev(2, "2026-02-01T08:00", "2026-02-01T09:00")];
    expect(quickPicks(l)[0].startHm).toBe("08:00");
  });
  it("limit 개수까지만", () => {
    const l = Array.from({ length: 6 }, (_, i) => ev(i, `2026-01-0${i + 1}T1${i}:00`, `2026-01-0${i + 1}T2${i}:00`));
    expect(quickPicks(l, 3)).toHaveLength(3);
  });
  it("길이가 0 이하인 일정은 무시", () => {
    expect(quickPicks([ev(1, "2026-01-01T10:00", "2026-01-01T10:00")])).toEqual([]);
  });
  it("이동시간이 다르면 다른 조합", () => {
    const l = [ev(1, "2026-01-01T10:00", "2026-01-01T12:00"), ev(2, "2026-01-02T10:00", "2026-01-02T12:00", { travel: 30 })];
    expect(quickPicks(l)).toHaveLength(2);
  });
});

describe("applyPick", () => {
  it("선택한 날짜에 시작 시각과 소요시간을 적용", () => {
    const [p] = quickPicks([ev(1, "2026-01-01T20:00", "2026-01-01T22:00")]);
    expect(applyPick(p, "2026-03-10")).toEqual({ start: "2026-03-10T20:00", end: "2026-03-10T22:00" });
  });
  it("자정을 넘기면 종료일이 다음 날", () => {
    const [p] = quickPicks([ev(1, "2026-01-01T23:00", "2026-01-02T01:00")]);
    expect(applyPick(p, "2026-03-10").end).toBe("2026-03-11T01:00");
  });
});
