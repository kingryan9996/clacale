import { describe, expect, it } from "vitest";
import { addDays, todayKey } from "@/lib/dates";
import { computeExpires, currentPause, endPause, finishCountEdit, invalidPauses, pauseHistory, pauseOverlaps, pauseState, pauseTotal, settleCountPasses, shortenPauseAt, statusMap, withExpires } from "@/lib/passes";

const countPass = (o) => ({ id: "p1", brand: "stones", kind: "count", total: 5, remaining: 5, start: "2026-01-01", expires: null, pauses: [], bonusDays: 0, ...o });
const ev = (o) => ({ id: "e1", brand: "stones", place: "스톤즈클라이밍", start: "2026-01-05T10:00", end: "2026-01-05T12:00", repeat: "none", ...o });

describe("settleCountPasses (횟수권 자동 차감)", () => {
  it("지난 일정 1건 = 1회 차감", () => {
    const r = settleCountPasses([countPass()], [ev()], "2026-01-10");
    expect(r[0].remaining).toBe(4);
    expect(r[0].usedKeys).toEqual(["e1|2026-01-05"]);
  });
  it("같은 결과에 다시 돌려도 중복 차감하지 않는다(null)", () => {
    const r = settleCountPasses([countPass()], [ev()], "2026-01-10");
    expect(settleCountPasses(r, [ev()], "2026-01-10")).toBeNull();
  });
  it("오늘 일정은 아직 차감하지 않는다", () => {
    expect(settleCountPasses([countPass()], [ev({ start: "2026-01-10T10:00", end: "2026-01-10T12:00" })], "2026-01-10")).toBeNull();
  });
  it("반복 일정은 발생분마다 차감", () => {
    const r = settleCountPasses([countPass()], [ev({ repeat: "weekly" })], "2026-01-20");
    expect(r[0].remaining).toBe(2); // 1/5, 1/12, 1/19
  });
  it("남은 횟수보다 많이 가도 0 미만이 되지 않고 소진일을 기록", () => {
    const r = settleCountPasses([countPass({ total: 2, remaining: 2 })], [ev({ repeat: "weekly" })], "2026-01-20");
    expect(r[0].remaining).toBe(0);
    expect(r[0].endedOn).toBe("2026-01-13"); // 두 번째 사용(1/12) 다음 날
  });
  it("다른 브랜드 일정은 차감하지 않는다", () => {
    expect(settleCountPasses([countPass()], [ev({ brand: "climb" })], "2026-01-10")).toBeNull();
  });
  it("사용 시작일 이전 일정은 차감하지 않는다", () => {
    expect(settleCountPasses([countPass({ start: "2026-01-06" })], [ev()], "2026-01-10")).toBeNull();
  });
  it("사용대기(start 없음) 이용권은 건드리지 않는다", () => {
    expect(settleCountPasses([countPass({ start: null })], [ev()], "2026-01-10")).toBeNull();
  });
  it("만료일 이후 일정은 차감하지 않는다", () => {
    expect(settleCountPasses([countPass({ expires: "2026-01-04" })], [ev()], "2026-01-10")).toBeNull();
  });
});

describe("만료일 자동 계산", () => {
  const period = (o) => ({ id: "p2", brand: "climb", kind: "period", days: 30, start: "2026-01-01", pauses: [], bonusDays: 0, ...o });
  it("기간권: 시작일 + 기간 - 1", () => {
    expect(computeExpires(period())).toBe("2026-01-30");
  });
  it("정지 일수 합계만큼 뒤로 밀린다 (과거 정지 포함)", () => {
    const p = period({ pauses: [{ id: "a", from: "2026-01-05", to: "2026-01-11" }, { id: "b", from: "2026-01-20", to: "2026-01-22" }] }); // 7일 + 3일
    expect(pauseTotal(p)).toBe(10);
    expect(computeExpires(p)).toBe("2026-02-09");
  });
  it("추가 일수는 더하거나(양수) 뺀다(음수)", () => {
    expect(computeExpires(period({ bonusDays: 5 }))).toBe("2026-02-04");
    expect(computeExpires(period({ bonusDays: -2 }))).toBe("2026-01-28");
  });
  it("횟수권: 시작일 + 유효기간 - 1 + 추가 일수", () => {
    expect(computeExpires(countPass({ validDays: 180 }))).toBe("2026-06-29");
    expect(computeExpires(countPass({ validDays: 180, bonusDays: 10 }))).toBe("2026-07-09");
  });
  it("사용 시작일이 없으면(사용대기) 만료일도 없다", () => {
    expect(computeExpires(period({ start: null }))).toBeNull();
  });
  it("withExpires 는 expires 를 채워 돌려준다", () => {
    expect(withExpires(period()).expires).toBe("2026-01-30");
  });
});

describe("정지 이력", () => {
  const base = { id: "p2", brand: "climb", kind: "period", days: 30, start: "2026-01-01", bonusDays: 0 };
  const withPauses = (pauses) => withExpires({ ...base, pauses });
  it("정지 횟수 / 상태", () => {
    const p = withPauses([{ id: "a", from: "2026-01-05", to: "2026-01-11" }]);
    expect(pauseHistory(p)).toBe(1);
    expect(pauseState(p, "2026-01-08")).toBe("active");
    expect(pauseState(p, "2026-01-01")).toBe("scheduled");
    expect(pauseState(p, "2026-02-01")).toBe("done");
    expect(pauseState(withPauses([]), "2026-01-08")).toBe("none");
  });
  it("currentPause: 정지 중이면 그것, 아니면 가장 가까운 예정", () => {
    const p = withPauses([{ id: "b", from: "2026-03-01", to: "2026-03-03" }, { id: "a", from: "2026-02-01", to: "2026-02-03" }]);
    expect(currentPause(p, "2026-01-01").id).toBe("a");
    expect(currentPause(p, "2026-03-02").id).toBe("b");
    expect(currentPause(p, "2026-04-01")).toBe(undefined);
  });
  it("일정 때문에 정지를 줄이면 만료일도 줄어든다", () => {
    const p = withPauses([{ id: "a", from: "2026-01-10", to: "2026-01-16" }]); // 7일 → 만료 2/6
    expect(p.expires).toBe("2026-02-06");
    const r = shortenPauseAt(p, "2026-01-13"); // 1/10~1/12 (3일)
    expect(r.pauses[0].to).toBe("2026-01-12");
    expect(r.expires).toBe("2026-02-02");
  });
  it("정지 시작일에 일정을 넣으면 그 정지는 없어진다", () => {
    const p = withPauses([{ id: "a", from: "2026-01-10", to: "2026-01-16" }]);
    const r = shortenPauseAt(p, "2026-01-10");
    expect(r.pauses).toEqual([]);
    expect(r.expires).toBe("2026-01-30");
  });
  it("정지 기간에 속하지 않는 날짜면 그대로", () => {
    const p = withPauses([{ id: "a", from: "2026-01-10", to: "2026-01-16" }]);
    expect(shortenPauseAt(p, "2026-02-01")).toBe(p);
  });
  it("endPause: 정지 중이면 오늘부터 해제, 예정이면 취소", () => {
    const p = withPauses([{ id: "a", from: "2026-01-10", to: "2026-01-16" }]);
    expect(endPause(p, "2026-01-12").pauses[0].to).toBe("2026-01-11");
    expect(endPause(p, "2026-01-01").pauses).toEqual([]);
  });
  it("겹치는 정지와 잘못된 정지를 찾아낸다", () => {
    expect(pauseOverlaps([{ from: "2026-01-01", to: "2026-01-05" }, { from: "2026-01-05", to: "2026-01-08" }, { from: "2026-02-01", to: "2026-02-02" }])).toEqual([[0, 1]]);
    expect(invalidPauses([{ from: "2026-01-05", to: "2026-01-01" }, { from: "2026-01-01", to: "2026-01-02" }])).toHaveLength(1);
  });
});

describe("횟수권 수정과 자동 차감", () => {
  const NOW = "2026-01-10T13:00";
  it("남은 횟수를 직접 바꾸면 그 시각을 차감 기준으로 기록한다", () => {
    const prev = countPass({ total: 10, remaining: 10 });
    const r = finishCountEdit(prev, { ...prev, remaining: 8 }, NOW);
    expect(r.remaining).toBe(8);
    expect(r.countedFrom).toBe(NOW);
  });
  it("남은 횟수를 안 바꾸면 기준 시각을 건드리지 않는다", () => {
    const prev = countPass({ total: 10, remaining: 8, countedFrom: "2026-01-02T09:00" });
    expect(finishCountEdit(prev, { ...prev, bonusDays: 3 }, NOW).countedFrom).toBe("2026-01-02T09:00");
  });
  it("새로 만들 때 이미 쓴 횟수가 있으면 기준 시각을 기록, 없으면(전부 남음) 과거 일정부터 자동 차감", () => {
    expect(finishCountEdit(null, countPass({ total: 10, remaining: 7 }), NOW).countedFrom).toBe(NOW);
    expect(finishCountEdit(null, countPass({ total: 10, remaining: 10 }), NOW).countedFrom).toBe(undefined);
  });
  it("0회가 되면 소진일(endedOn) 기록, 다시 늘리면 지운다", () => {
    const prev = countPass({ total: 5, remaining: 2 });
    const done = finishCountEdit(prev, { ...prev, remaining: 0 }, NOW);
    expect(done.endedOn).toBe("2026-01-10");
    const again = finishCountEdit(done, { ...done, remaining: 3 }, NOW);
    expect(again.endedOn).toBe(undefined);
  });
  it("기준 시각 이전에 시작한 일정은 차감하지 않고, 이후 일정은 다음날 차감한다 (오늘 일정 등록 → 횟수 조정 → 다음날)", () => {
    const ev1 = { id: "e1", brand: "stones", place: "스톤즈", start: "2026-01-10T10:00", end: "2026-01-10T12:00", repeat: "none" }; // 조정 전에 이미 시작
    const ev2 = { id: "e2", brand: "stones", place: "스톤즈", start: "2026-01-10T19:00", end: "2026-01-10T21:00", repeat: "none" }; // 조정 뒤에 시작
    const p = finishCountEdit(null, countPass({ total: 10, remaining: 8 }), NOW);
    expect(settleCountPasses([p], [ev1, ev2], "2026-01-10")).toBeNull(); // 당일에는 차감 없음
    const r = settleCountPasses([p], [ev1, ev2], "2026-01-11");
    expect(r[0].remaining).toBe(7); // ev2 만
    expect(r[0].usedKeys).toEqual(["e2|2026-01-10"]);
  });
});

describe("statusMap", () => {
  it("사용대기 / 이용중 / 만료", () => {
    const list = [
      { id: "w", kind: "period", brand: "x", start: null },
      { id: "a", kind: "period", brand: "x", start: addDays(todayKey, -1), expires: addDays(todayKey, 10) },
      { id: "e", kind: "period", brand: "x", start: addDays(todayKey, -40), expires: addDays(todayKey, -1) },
      { id: "c0", kind: "count", brand: "x", start: addDays(todayKey, -5), remaining: 0, total: 5 },
    ];
    expect(statusMap(list)).toEqual({ w: "waiting", a: "active", e: "expired", c0: "expired" });
  });
});
