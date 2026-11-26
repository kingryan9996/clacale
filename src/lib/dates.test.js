import { describe, expect, it } from "vitest";
import { addDays, byStart, dayDiff, fmtRange, fmtShort, keyOf, parseKey, plus3h, t12, ymd } from "@/lib/dates";

describe("날짜 키", () => {
  it("ymd는 월을 0부터 받아 0을 채운다", () => {
    expect(ymd(2026, 0, 5)).toBe("2026-01-05");
  });
  it("keyOf/parseKey 왕복", () => {
    expect(keyOf(parseKey("2026-03-09"))).toBe("2026-03-09");
  });
  it("addDays는 월·연·윤년 경계를 넘는다", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("dayDiff", () => {
    expect(dayDiff("2026-01-01", "2026-01-08")).toBe(7);
    expect(dayDiff("2026-01-08", "2026-01-01")).toBe(-7);
  });
});

describe("표기", () => {
  it("t12: 오전/오후 12시간제", () => {
    expect(t12("2026-01-01T00:00")).toBe("오전 12:00");
    expect(t12("2026-01-01T09:05")).toBe("오전 09:05");
    expect(t12("2026-01-01T12:00")).toBe("오후 12:00");
    expect(t12("2026-01-01T19:30")).toBe("오후 07:30");
  });
  it("fmtShort", () => {
    expect(fmtShort("2026-01-05T19:30")).toBe("1/5(월) 오후 07:30");
  });
  it("fmtRange: 같은 날 / 다른 날", () => {
    expect(fmtRange("2026-01-05T19:00", "2026-01-05T21:00")).toBe("1월 5일 (월) 오후 07:00 – 오후 09:00");
    expect(fmtRange("2026-01-05T23:00", "2026-01-06T01:00")).toContain("→");
  });
  it("plus3h는 자정을 넘겨도 날짜가 맞다", () => {
    expect(plus3h("2026-01-05T22:30")).toBe("2026-01-06T01:30");
  });
});

describe("byStart", () => {
  it("시작 → 종료 → id 순", () => {
    const l = [
      { id: "b", start: "2026-01-01T10:00", end: "2026-01-01T12:00" },
      { id: "a", start: "2026-01-01T10:00", end: "2026-01-01T11:00" },
      { id: "c", start: "2026-01-01T09:00", end: "2026-01-01T13:00" },
    ];
    expect(l.sort(byStart).map((x) => x.id)).toEqual(["c", "a", "b"]);
  });
});
