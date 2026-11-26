import { describe, expect, it } from "vitest";
import { byCreated, cmpId, newId } from "@/lib/id";

describe("newId", () => {
  it("UUID v4 형식이다", () => {
    expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  it("매번 다르다", () => {
    const s = new Set(Array.from({ length: 200 }, newId));
    expect(s.size).toBe(200);
  });
});

describe("cmpId", () => {
  it("숫자 id끼리는 숫자순", () => {
    expect([10, 9, 100].sort(cmpId)).toEqual([9, 10, 100]);
  });
  it("숫자와 UUID가 섞여도 오류 없이 비교한다", () => {
    expect(() => [1, "a-b", 2, "0-z"].sort(cmpId)).not.toThrow();
  });
});

describe("byCreated", () => {
  it("createdAt 순, 같으면 id 순", () => {
    const l = [{ id: "b", createdAt: "2026-01-02" }, { id: "a", createdAt: "2026-01-02" }, { id: "c", createdAt: "2026-01-01" }];
    expect(l.sort(byCreated).map((x) => x.id)).toEqual(["c", "a", "b"]);
  });
  it("createdAt이 없으면 맨 앞", () => {
    const l = [{ id: 2, createdAt: "2026-01-01" }, { id: 1 }];
    expect(l.sort(byCreated).map((x) => x.id)).toEqual([1, 2]);
  });
});
