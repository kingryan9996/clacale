import { describe, expect, it } from "vitest";
import { eventRow, isDirty, mergeAll, passRow, rowEvent, rowPass, runSync, uuidize } from "@/lib/sync";

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ev = (n, o = {}) => ({ id: U(n), brand: "climb", place: "더클라임 강남", start: "2026-12-01T19:00", end: "2026-12-01T21:00", travel: 30, memo: "", repeat: "none", alerts: [], ...o });
const period = (n, o = {}) => ({ id: U(100 + n), createdAt: "2026-11-01T00:00:00.000Z", brand: "stones", kind: "period", days: 30, start: "2026-11-01", bonusDays: 0, pauses: [], expires: "2026-11-30", ...o });
const count = (n, o = {}) => ({ id: U(200 + n), createdAt: "2026-11-02T00:00:00.000Z", brand: "park", kind: "count", total: 10, remaining: 7, validDays: 90, start: "2026-11-01", bonusDays: 0, pauses: [], expires: "2027-01-29", usedKeys: [`${U(1)}|2026-11-05`], countedFrom: "2026-11-03T10:00", ...o });

// 메모리 서버: 행을 user_id 로 구분해 저장하는 가짜 Supabase 클라이언트
const server = (uid = "me") => {
  const db = { schedules: [], passes: [], favorite_centers: [] };
  const calls = [];
  const pk = (t) => (t === "favorite_centers" ? "brand_id" : "id");
  const client = {
    from: (t) => ({
      select: () => ({ order: () => ({ range: async (a, b) => ({ data: db[t].filter((r) => r.user_id === uid).slice(a, b + 1), error: null }) }) }),
      upsert: async (rows, o) => { calls.push(["upsert", t, rows.length]); rows.forEach((r) => { const i = db[t].findIndex((x) => o.onConflict.split(",").every((c) => x[c] === r[c])); if (i >= 0) { if (!o.ignoreDuplicates) db[t][i] = { ...db[t][i], ...r }; } else db[t].push({ ...r }); }); return { error: null }; },
      delete: () => ({ in: async (col, ids) => { calls.push(["delete", t, ids.length]); db[t] = db[t].filter((r) => !(r.user_id === uid && ids.includes(r[col]))); return { error: null }; } }),
    }),
  };
  return { db, calls, client, pk };
};

// 한 기기 시뮬레이션
const device = (srv, init = {}, snap = null) => {
  const d = { local: { events: [], passes: [], favs: [], ...init }, snap };
  d.sync = async () => { const r = await runSync({ client: srv.client, uid: "me", getLocal: () => d.local, apply: (m) => { d.local = m; }, snapshot: d.snap }); d.snap = r.snapshot; return r; };
  return d;
};

describe("행 변환", () => {
  it("일정: 앱 형식 → 행 → 앱 형식이 그대로 돌아온다", () => {
    const e = ev(1, { repeat: "weekly", alerts: [60, 1440], memo: "메모", until: "2026-12-29", ex: ["2026-12-15", "2026-12-08"] });
    const r = eventRow(e);
    expect(r).toMatchObject({ id: U(1), brand_id: "climb", place: "더클라임 강남", gym_id: "climb:강남", start_at: "2026-12-01T19:00", repeat_kind: "weekly", until_on: "2026-12-29" });
    expect(r.except_on).toEqual(["2026-12-08", "2026-12-15"]);
    expect(eventRow(rowEvent({ ...r, start_at: "2026-12-01T19:00:00", end_at: "2026-12-01T21:00:00" }))).toEqual(r);
  });
  it("일정: 서버 제약을 넘지 않게 맞춘다", () => {
    const r = eventRow(ev(1, { place: "", travel: 9999, memo: "가".repeat(3000), end: "2026-12-01T10:00", repeat: "??" }));
    expect(r.place).toBe("climb");
    expect(r.travel_min).toBe(600);
    expect(r.memo).toHaveLength(2000);
    expect(r.end_at).toBe("2026-12-01T19:00");
    expect(r.repeat_kind).toBe("none");
  });
  it("기간권/횟수권 왕복", () => {
    const p = period(1, { pauses: [{ id: "x", from: "2026-11-10", to: "2026-11-12" }], bonusDays: 2, expires: "2026-12-05" });
    const r = passRow(p);
    expect(r).toMatchObject({ kind: "period", days: 30, total: null, remaining: null, bonus_days: 2, start_on: "2026-11-01" });
    expect(passRow(rowPass({ ...r, created_at: "2026-11-01T00:00:00+00:00" }))).toEqual(r);
    const c = count(1);
    const cr = passRow(c);
    expect(cr).toMatchObject({ kind: "count", total: 10, remaining: 7, valid_days: 90, counted_from: "2026-11-03T10:00", used_keys: [`${U(1)}|2026-11-05`] });
    expect(passRow(rowPass({ ...cr, created_at: "2026-11-02T00:00:00.000+00:00", counted_from: "2026-11-03T10:00:00" }))).toEqual(cr);
  });
  it("사용대기 이용권(start 없음)도 올린다", () => {
    expect(passRow(period(1, { start: null, expires: null }))).toMatchObject({ start_on: null, expires_on: null });
  });
  it("서버 형식에 맞지 않는 이용권은 올리지 않는다", () => {
    expect(passRow({ id: U(1), brand: "x", kind: "period" })).toBeNull();
    expect(passRow({ id: U(1), brand: "x", kind: "count", total: 5 })).toBeNull();
  });
  it("횟수 범위를 서버 제약 안으로", () => {
    expect(passRow(count(1, { remaining: 99, total: 10 })).remaining).toBe(10);
    expect(passRow(count(1, { remaining: -2 })).remaining).toBe(0);
  });
});

describe("uuidize", () => {
  it("UUID 가 아닌 id 를 바꾸고 차감 내역도 따라 바꾼다", () => {
    const r = uuidize({ events: [ev(1), { ...ev(2), id: 7 }], passes: [count(1, { usedKeys: ["7|2026-11-05", `${U(1)}|2026-11-06`] }), { ...period(2), id: 1001 }] });
    expect(r.changed).toBe(true);
    expect(r.events[0].id).toBe(U(1));
    expect(r.events[1].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.passes[0].usedKeys).toEqual([`${r.events[1].id}|2026-11-05`, `${U(1)}|2026-11-06`]);
    expect(r.passes[1].id).toMatch(/^[0-9a-f-]{36}$/);
  });
  it("모두 UUID 면 그대로", () => {
    expect(uuidize({ events: [ev(1)], passes: [period(1)] }).changed).toBe(false);
  });
});

describe("첫 동기화", () => {
  it("기기 데이터가 서버로 올라간다", async () => {
    const s = server(); const d = device(s, { events: [ev(1), ev(2)], passes: [period(1), count(1)], favs: ["b:climb"] });
    await d.sync();
    expect(s.db.schedules).toHaveLength(2); expect(s.db.passes).toHaveLength(2);
    expect(s.db.schedules[0].user_id).toBe("me");
    expect(s.db.favorite_centers).toEqual([{ user_id: "me", brand_id: "climb" }]);
  });
  it("서버에만 있는 데이터는 기기로 내려오고, 양쪽 것은 합쳐진다", async () => {
    const s = server(); await device(s, { events: [ev(1)], favs: ["b:alle"] }).sync();
    const d2 = device(s, { events: [ev(2)], favs: ["b:climb"] }); await d2.sync();
    expect(d2.local.events.map((e) => e.id).sort()).toEqual([U(1), U(2)]);
    expect(d2.local.favs.sort()).toEqual(["b:alle", "b:climb"]);
    expect(s.db.schedules).toHaveLength(2);
  });
  it("두 번째 동기화는 아무것도 올리지 않는다", async () => {
    const s = server(); const d = device(s, { events: [ev(1)], passes: [period(1)] }); await d.sync();
    s.calls.length = 0; await d.sync(); expect(s.calls).toEqual([]);
  });
});

describe("수정과 삭제", () => {
  it("기기에서 고친 항목만 올린다", async () => {
    const s = server(); const d = device(s, { events: [ev(1), ev(2)] }); await d.sync(); s.calls.length = 0;
    d.local = { ...d.local, events: [{ ...d.local.events[0], memo: "고침" }, d.local.events[1]] }; await d.sync();
    expect(s.calls).toEqual([["upsert", "schedules", 1]]);
    expect(s.db.schedules.find((r) => r.id === U(1)).memo).toBe("고침");
  });
  it("기기에서 지운 항목은 서버에서도 지운다", async () => {
    const s = server(); const d = device(s, { events: [ev(1), ev(2)], passes: [period(1)], favs: ["b:climb"] }); await d.sync();
    d.local = { events: [ev(1)], passes: [], favs: [] }; await d.sync();
    expect(s.db.schedules.map((r) => r.id)).toEqual([U(1)]); expect(s.db.passes).toEqual([]); expect(s.db.favorite_centers).toEqual([]);
  });
  it("다른 기기의 수정·삭제가 이 기기에 반영된다", async () => {
    const s = server(); const a = device(s, { events: [ev(1), ev(2)], favs: ["b:climb"] }); await a.sync();
    const b = device(s); await b.sync();
    b.local = { ...b.local, events: [{ ...b.local.events.find((e) => e.id === U(1)), memo: "B 수정" }], favs: [] }; await b.sync(); // 1 수정, 2 삭제, 찜 해제
    await a.sync();
    expect(a.local.events).toHaveLength(1); expect(a.local.events[0].memo).toBe("B 수정"); expect(a.local.favs).toEqual([]);
  });
  it("양쪽에서 같은 항목을 고치면 이 기기(나중에 올리는 쪽)가 우선", async () => {
    const s = server(); const a = device(s, { events: [ev(1)] }); await a.sync(); const b = device(s); await b.sync();
    b.local = { ...b.local, events: [{ ...b.local.events[0], memo: "B" }] }; await b.sync();
    a.local = { ...a.local, events: [{ ...a.local.events[0], memo: "A" }] }; await a.sync();
    expect(s.db.schedules[0].memo).toBe("A"); expect(a.local.events[0].memo).toBe("A");
  });
  it("이 기기에서 고쳤는데 다른 기기가 지웠으면 다시 올린다", async () => {
    const s = server(); const a = device(s, { events: [ev(1)] }); await a.sync(); const b = device(s); await b.sync();
    b.local = { ...b.local, events: [] }; await b.sync();
    a.local = { ...a.local, events: [{ ...a.local.events[0], memo: "살림" }] }; await a.sync();
    expect(s.db.schedules).toHaveLength(1); expect(a.local.events[0].memo).toBe("살림");
  });
  it("서버에서 보관 기간이 지나 정리된 항목은(고치지 않았다면) 기기에서도 지운다", async () => {
    const s = server(); const d = device(s, { events: [ev(1), ev(2)] }); await d.sync();
    s.db.schedules = s.db.schedules.filter((r) => r.id !== U(1)); await d.sync();
    expect(d.local.events.map((e) => e.id)).toEqual([U(2)]);
  });
  it("이용권 변경(정지·차감)도 올라간다", async () => {
    const s = server(); const d = device(s, { passes: [count(1)] }); await d.sync();
    d.local = { ...d.local, passes: [{ ...d.local.passes[0], remaining: 6, usedKeys: [...d.local.passes[0].usedKeys, `${U(2)}|2026-11-09`] }] }; await d.sync();
    expect(s.db.passes[0]).toMatchObject({ remaining: 6, used_keys: [`${U(1)}|2026-11-05`, `${U(2)}|2026-11-09`] });
  });
});

describe("안정성", () => {
  it("서버 통신 중에 기기에서 바꾼 내용은 덮어쓰지 않는다", async () => {
    const s = server(); const d = device(s, { events: [ev(1)] }); await d.sync();
    const slow = { from: (t) => { const f = s.client.from(t); return { ...f, select: () => ({ order: () => ({ range: async (a, b) => { d.local = { ...d.local, events: [{ ...d.local.events[0], memo: "통신 중 수정" }] }; return f.select().order().range(a, b); } }) }) }; } };
    const r = await runSync({ client: slow, uid: "me", getLocal: () => d.local, apply: (m) => { d.local = m; }, snapshot: d.snap });
    expect(d.local.events[0].memo).toBe("통신 중 수정"); expect(s.db.schedules[0].memo).toBe("통신 중 수정"); expect(r.snapshot.events[U(1)]).toBeTruthy();
  });
  it("올리기에 실패하면 오류를 던지고, 다음에 다시 시도하면 올라간다", async () => {
    const s = server(); const d = device(s, { events: [ev(1)] });
    const bad = { from: (t) => ({ ...s.client.from(t), upsert: async () => ({ error: { message: "offline" } }) }) };
    await expect(runSync({ client: bad, uid: "me", getLocal: () => d.local, apply: (m) => { d.local = m; }, snapshot: null })).rejects.toMatchObject({ message: "offline" });
    await d.sync(); expect(s.db.schedules).toHaveLength(1);
  });
  it("500개가 넘어도 모두 가져오고 올린다", async () => {
    const s = server(); const list = Array.from({ length: 1234 }, (_, i) => ev(i + 1)); await device(s, { events: list }).sync();
    expect(s.db.schedules).toHaveLength(1234);
    const d2 = device(s); await d2.sync(); expect(d2.local.events).toHaveLength(1234);
    expect(s.calls.filter((c) => c[0] === "upsert").map((c) => c[2])).toEqual([200, 200, 200, 200, 200, 200, 34]);
  });
  it("옛 숫자 id 는 UUID 로 바꿔 올린다", async () => {
    const s = server(); const d = device(s, { events: [{ ...ev(1), id: 5 }], passes: [count(1, { usedKeys: ["5|2026-11-05"] })] }); await d.sync();
    expect(d.local.events[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(s.db.schedules[0].id).toBe(d.local.events[0].id);
    expect(s.db.passes[0].used_keys).toEqual([`${d.local.events[0].id}|2026-11-05`]);
  });
  it("서버에 올릴 수 없는 이용권은 기기에 남기고 개수를 알린다", async () => {
    const s = server(); const d = device(s, { passes: [period(1), { id: U(9), brand: "x", kind: "count", total: 5 }] }); const r = await d.sync();
    expect(r.skipped).toBe(1); expect(d.local.passes).toHaveLength(2); expect(s.db.passes).toHaveLength(1);
  });
  it("다른 계정의 행은 보이지 않는다", async () => {
    const s = server("me"); s.db.schedules.push({ ...eventRow(ev(1)), user_id: "other" });
    const d = device(s); await d.sync(); expect(d.local.events).toEqual([]);
  });
});

describe("isDirty / mergeAll", () => {
  it("올린 직후는 변경 없음, 고치면 변경 있음", async () => {
    const s = server(); const d = device(s, { events: [ev(1)], passes: [period(1)], favs: ["b:climb"] });
    expect(isDirty(d.local, null)).toBe(true);
    await d.sync(); expect(isDirty(d.local, d.snap)).toBe(false);
    expect(isDirty({ ...d.local, favs: [] }, d.snap)).toBe(true);
    expect(isDirty({ ...d.local, events: [{ ...d.local.events[0], memo: "x" }] }, d.snap)).toBe(true);
  });
  it("찜: 양쪽 변경 병합", () => {
    const m = mergeAll({ events: [], passes: [], favs: ["b:a", "b:c"] }, { events: [], passes: [], favs: ["a", "b"] }, { events: {}, passes: {}, favs: ["a", "b"] });
    // a: 양쪽 유지, b: 이 기기에서 지움, c: 이 기기에서 추가
    expect(m.merged.favs.sort()).toEqual(["b:a", "b:c"]);
    expect(m.ops.favs.deletes).toEqual(["b"]); expect(m.ops.favs.upserts).toEqual(["c"]);
  });
});
