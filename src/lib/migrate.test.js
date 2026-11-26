import { describe, expect, it } from "vitest";
import { PREMIGRATE_PREFIX, SCHEMA_KEY, SCHEMA_VERSION } from "@/constants/backup";
import { migrateStorage, normalizeData, normalizeEvents, normalizePass, normalizePasses } from "@/lib/migrate";
import { store } from "@/lib/store";

const ev = (o) => ({ id: "e1", brand: "climb", place: "더클라임 강남", start: "2026-01-05T19:00", end: "2026-01-05T21:00", ...o });

describe("normalizeEvents", () => {
  it("필수 값이 없는 항목은 제외하고 개수를 센다", () => {
    const r = normalizeEvents([ev(), { brand: "climb" }, null, ev({ id: "e2", start: "엉망" })]);
    expect(r.list).toHaveLength(1);
    expect(r.dropped).toBe(3);
  });
  it("repeat/alerts 기본값을 채운다", () => {
    const [e] = normalizeEvents([ev()]).list;
    expect(e.repeat).toBe("none");
    expect(e.alerts).toEqual([]);
  });
  it("중복·누락 id에는 새 id를 준다 (첫 항목은 유지)", () => {
    const { list } = normalizeEvents([ev({ id: 1 }), ev({ id: 1 }), ev({ id: undefined })]);
    expect(list[0].id).toBe(1);
    expect(new Set(list.map((x) => x.id)).size).toBe(3);
  });
});

describe("normalizePasses", () => {
  it("종류가 잘못된 이용권은 제외", () => {
    expect(normalizePasses([{ id: "a", brand: "climb", kind: "foo" }]).list).toHaveLength(0);
  });
});

describe("normalizePass", () => {
  const period = (o) => ({ id: "p", brand: "climb", kind: "period", days: 30, start: "2026-01-01", ...o });
  it("정지 목록·추가 일수 기본값을 채우고 만료일을 계산한다", () => {
    const r = normalizePass(period());
    expect(r.pauses).toEqual([]);
    expect(r.bonusDays).toBe(0);
    expect(r.expires).toBe("2026-01-30");
  });
  it("횟수권은 정지 목록이 항상 비어 있다", () => {
    const r = normalizePass({ id: "c", brand: "climb", kind: "count", total: 10, remaining: 3, validDays: 180, start: "2026-01-01", pauses: [{ id: "x", from: "2026-01-05", to: "2026-01-06" }] });
    expect(r.pauses).toEqual([]);
    expect(r.expires).toBe("2026-06-29");
  });
  it("사용대기(시작일 없음)는 만료일 없이 그대로", () => {
    expect(normalizePass(period({ start: null })).expires).toBe(undefined);
  });
  it("여러 번 정리해도 같은 결과", () => {
    const once = normalizePass(period({ pauses: [{ id: "x", from: "2026-01-10", to: "2026-01-16" }], bonusDays: 2 }));
    expect(normalizePass(once)).toEqual(once);
  });
  it("잘못된 정지 항목은 버리고 만료일에는 정상 정지만 반영", () => {
    const r = normalizePass(period({ pauses: [{ id: "x", from: "2026-01-05", to: "2026-01-06" }, { from: "엉망", to: "2026-01-06" }] }));
    expect(r.pauses).toHaveLength(1);
    expect(r.expires).toBe("2026-02-01"); // 1/1 + 30일 - 1 + 정지 2일
  });
});

describe("normalizeData", () => {
  it("배열이 아닌 값은 빈 목록으로 본다", () => {
    const { data } = normalizeData({ events: "x", passes: null });
    expect(data).toEqual({ events: [], passes: [], favs: [] });
  });
  it("문자열 목록은 중복·빈 값 제거", () => {
    const { data, dropped } = normalizeData({ favs: ["b:climb", "b:climb", "", 3] });
    expect(data.favs).toEqual(["b:climb"]);
    expect(dropped).toBe(2);
  });
});

describe("migrateStorage", () => {
  it("저장된 데이터를 정리하고 원본을 따로 보관, 버전을 기록한다. 두 번째 실행은 아무것도 안 한다", () => {
    store.set(SCHEMA_KEY, 0);
    store.set("clacale:events:test", [ev({ id: 1 }), ev({ id: 1 }), { 잘못: true }]);
    migrateStorage();
    const list = store.get("clacale:events:test", []);
    expect(list).toHaveLength(2);
    expect(new Set(list.map((x) => x.id)).size).toBe(2);
    expect(store.get(PREMIGRATE_PREFIX + "clacale:events:test", [])).toHaveLength(3);
    expect(store.get(SCHEMA_KEY, 0)).toBe(SCHEMA_VERSION);
    store.set("clacale:events:test", [{ 잘못: true }]);
    migrateStorage();
    expect(store.get("clacale:events:test", [])).toHaveLength(1); // 이미 최신 버전 → 건드리지 않음
  });
  it("배열이 아닌 저장값은 건드리지 않는다", () => {
    store.set(SCHEMA_KEY, 0);
    store.set("clacale:events:odd", { a: 1 });
    migrateStorage();
    expect(store.get("clacale:events:odd", null)).toEqual({ a: 1 });
  });
});
