import { describe, expect, it } from "vitest";
import { CROWD_MIN_DISPLAY, CROWD_PENDING } from "@/constants/crowd";
import { aggregateSource, buildCrowd, crowdText, gymIdOf, slotLabel, slotOf } from "@/lib/crowd";

describe("slotOf (3시간 구간)", () => {
  it("일정 중간 시각이 속한 구간의 시작 시각", () => {
    expect(slotOf("2026-01-05T13:00", "2026-01-05T17:00")).toBe("15:00");
    expect(slotOf("2026-01-05T19:00", "2026-01-05T21:00")).toBe("18:00");
    expect(slotOf("2026-01-05T08:00", "2026-01-05T09:30")).toBe("06:00");
  });
  it("slotLabel", () => {
    expect(slotLabel("15:00")).toBe("15~18시");
  });
});

describe("crowdText (표시 규칙)", () => {
  it("집계 없음 / 20명 미만 / N명", () => {
    expect(crowdText(null)).toBe(CROWD_PENDING);
    expect(crowdText(0)).toBe(`${CROWD_MIN_DISPLAY}명 미만`);
    expect(crowdText(CROWD_MIN_DISPLAY - 1)).toBe(`${CROWD_MIN_DISPLAY}명 미만`);
    expect(crowdText(CROWD_MIN_DISPLAY)).toBe(`${CROWD_MIN_DISPLAY}명`);
    expect(crowdText(31)).toBe("31명");
  });
});

describe("gymIdOf", () => {
  it("브랜드 + 지점", () => {
    expect(gymIdOf({ brand: "climb", place: "더클라임 강남" })).toBe("climb:강남");
  });
  it("지점이 없는 브랜드는 브랜드 id만", () => {
    expect(gymIdOf({ brand: "stones", place: "스톤즈클라이밍" })).toBe("stones");
  });
});

describe("buildCrowd", () => {
  const o = { brand: "climb", place: "더클라임 강남", start: "2026-01-05T19:00", end: "2026-01-05T21:00" };
  it("서버 집계가 없으면 pending", () => {
    expect(aggregateSource.get("2026-01-05", "climb:강남")).toBeNull();
    const c = buildCrowd(o, null);
    expect(c.pending).toBe(true);
    expect(c.count).toBeNull();
    expect(c.slots.every((s) => s.count === null)).toBe(true);
  });
  it("집계가 있으면 내 구간과 하루 합계", () => {
    const c = buildCrowd(o, { "18:00": 31, "12:00": 8 });
    expect(c.pending).toBe(false);
    expect(c.time_slot).toBe("18:00");
    expect(c.count).toBe(31);
    expect(c.day).toBe(39);
    expect(c.slots.find((s) => s.mine).slot).toBe("18:00");
    expect(c.slots.find((s) => s.slot === "09:00").count).toBe(0);
  });
});
