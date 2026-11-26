import { describe, expect, it } from "vitest";
import { applyEdit, occurrence, occursOn } from "@/lib/events";

const ev = (o) => ({ id: "e", brand: "climb", place: "더클라임 강남", start: "2026-01-05T19:00", end: "2026-01-05T21:00", repeat: "none", ...o });

describe("occursOn", () => {
  it("반복 없음: 시작일에만", () => {
    expect(occursOn(ev(), "2026-01-05")).toBe(true);
    expect(occursOn(ev(), "2026-01-06")).toBe(false);
  });
  it("시작일 이전에는 발생하지 않는다", () => {
    expect(occursOn(ev({ repeat: "daily" }), "2026-01-04")).toBe(false);
  });
  it("daily", () => {
    expect(occursOn(ev({ repeat: "daily" }), "2026-03-01")).toBe(true);
  });
  it("weekly: 7일 간격", () => {
    const e = ev({ repeat: "weekly" });
    expect(occursOn(e, "2026-01-12")).toBe(true);
    expect(occursOn(e, "2026-01-13")).toBe(false);
  });
  it("monthly: 같은 일자", () => {
    const e = ev({ repeat: "monthly" });
    expect(occursOn(e, "2026-02-05")).toBe(true);
    expect(occursOn(e, "2026-02-06")).toBe(false);
  });
  it("yearly", () => {
    const e = ev({ repeat: "yearly" });
    expect(occursOn(e, "2027-01-05")).toBe(true);
    expect(occursOn(e, "2027-01-06")).toBe(false);
  });
  it("삭제한 날짜(ex)는 제외", () => {
    expect(occursOn(ev({ repeat: "weekly", ex: ["2026-01-12"] }), "2026-01-12")).toBe(false);
  });
  it("종료일(until) 이후는 제외, 당일은 포함", () => {
    const e = ev({ repeat: "weekly", until: "2026-01-12" });
    expect(occursOn(e, "2026-01-12")).toBe(true);
    expect(occursOn(e, "2026-01-19")).toBe(false);
  });
});

describe("occurrence", () => {
  it("날짜만 바꾸고 시각은 유지", () => {
    const o = occurrence(ev({ repeat: "weekly" }), "2026-01-12");
    expect(o.start).toBe("2026-01-12T19:00");
    expect(o.end).toBe("2026-01-12T21:00");
  });
  it("자정을 넘기는 일정은 종료일도 같이 이동", () => {
    const o = occurrence(ev({ repeat: "weekly", start: "2026-01-05T23:00", end: "2026-01-06T01:00" }), "2026-01-12");
    expect(o.start).toBe("2026-01-12T23:00");
    expect(o.end).toBe("2026-01-13T01:00");
  });
});

describe("applyEdit (일정 수정)", () => {
  const weekly = ev({ id: "w", repeat: "weekly", start: "2026-01-05T19:00", end: "2026-01-05T21:00" });
  const occ = (k) => occurrence(weekly, k);
  const next = (o) => ({ brand: "climb", place: "더클라임 강남", start: "2026-01-12T20:00", end: "2026-01-12T22:00", travel: 15, repeat: "weekly", alerts: [30], memo: "수정", ...o });
  let n = 0; const mk = () => `new${++n}`;

  it("반복 없는 일정은 그 자리에서 바뀐다 (id 유지)", () => {
    const one = ev({ id: "s" });
    const r = applyEdit([one], one, next({ start: "2026-01-07T10:00", end: "2026-01-07T12:00", repeat: "none" }), "all", mk);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ id: "s", start: "2026-01-07T10:00", memo: "수정", travel: 15 });
  });
  it("one: 그날만 빼고 따로 새 일정(반복 없음)", () => {
    const r = applyEdit([weekly], occ("2026-01-12"), next(), "one", mk);
    expect(r).toHaveLength(2);
    expect(r[0].ex).toEqual(["2026-01-12"]);
    expect(r[1]).toMatchObject({ repeat: "none", start: "2026-01-12T20:00", memo: "수정" });
    expect(occursOn(r[0], "2026-01-12")).toBe(false);
    expect(occursOn(r[0], "2026-01-19")).toBe(true);
  });
  it("after: 전날까지 끊고 그날부터 새 시리즈", () => {
    const r = applyEdit([weekly], occ("2026-01-12"), next(), "after", mk);
    expect(r[0].until).toBe("2026-01-11");
    expect(r[1]).toMatchObject({ repeat: "weekly", start: "2026-01-12T20:00" });
    expect(occursOn(r[1], "2026-01-19")).toBe(true);
    expect(occursOn(r[0], "2026-01-12")).toBe(false);
  });
  it("after 를 첫 발생분에서 하면 전체 수정과 같다", () => {
    const r = applyEdit([weekly], occ("2026-01-05"), next({ start: "2026-01-05T20:00", end: "2026-01-05T22:00" }), "after", mk);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ id: "w", start: "2026-01-05T20:00" });
  });
  it("all: 시간만 바꾸면 기준 일정의 시간만 바뀐다", () => {
    const r = applyEdit([weekly], occ("2026-01-12"), next(), "all", mk);
    expect(r).toHaveLength(1);
    expect(r[0].start).toBe("2026-01-05T20:00");
    expect(r[0].end).toBe("2026-01-05T22:00");
  });
  it("all: 날짜를 옮기면 시리즈 전체가 같이 이동하고 제외 날짜/종료일도 따라간다", () => {
    const e = { ...weekly, ex: ["2026-01-19"], until: "2026-03-01" };
    const r = applyEdit([e], occurrence(e, "2026-01-12"), next({ start: "2026-01-13T19:00", end: "2026-01-13T21:00" }), "all", mk);
    expect(r[0].start).toBe("2026-01-06T19:00");
    expect(r[0].ex).toEqual(["2026-01-20"]);
    expect(r[0].until).toBe("2026-03-02");
  });
  it("다른 일정은 건드리지 않는다", () => {
    const other = ev({ id: "x" });
    expect(applyEdit([other, weekly], occ("2026-01-12"), next(), "all", mk)[0]).toBe(other);
  });
});
