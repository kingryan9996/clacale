import { gymIdOf } from "@/lib/crowd";
import { SYNC } from "@/constants/sync";
import { newId } from "@/lib/id";
import { normalizePass } from "@/lib/migrate";

/* ---------- 서버 동기화(순수 로직: 클라이언트 주입) ----------
   기기의 저장소가 화면의 기준이고, 서버(Supabase)는 같은 계정의 다른 기기와 맞추는 곳이다.
   마지막으로 맞춘 시점의 사본(snapshot: id → 내용 해시)을 기준으로 3-way 병합한다.
     · 이 기기에서 바꾼 항목(snapshot 과 다름) → 서버에 올림(양쪽에서 바뀌었으면 이 기기가 우선)
     · 바꾸지 않은 항목 → 서버 내용으로 갱신, 서버에서 사라졌으면(다른 기기에서 삭제·보관 기간 정리) 이 기기에서도 삭제
     · 이 기기에서 지운 항목 → 서버에서도 삭제, 서버에만 새로 생긴 항목 → 이 기기에 추가
   찜은 집합으로 병합한다(양쪽 중 한쪽이라도 지웠으면 삭제, 한쪽이라도 추가했으면 추가). */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REPEATS = ["none", "daily", "weekly", "monthly", "yearly"];
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const int = (v, d = 0) => (Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : d);
const str = (v) => (typeof v === "string" ? v : "");
const iso = (s) => (s ? new Date(s).toISOString() : undefined);
const local16 = (s) => (s ? String(s).slice(0, 16) : null);

// 작은 문자열 해시(cyrb53): 변경 감지용
export const hashOf = (v) => {
  const s = JSON.stringify(v);
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i += 1) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
};

/* ---------- 앱 데이터 ↔ 서버 행 변환 (서버의 check 제약을 넘지 않도록 범위를 맞춘다) ---------- */
export const eventRow = (e) => {
  const place = (str(e.place) || str(e.brand)).slice(0, 100);
  return {
    id: e.id,
    brand_id: str(e.brand).slice(0, 40),
    place,
    gym_id: gymIdOf({ ...e, place }).slice(0, 100),
    start_at: e.start,
    end_at: e.end < e.start ? e.start : e.end,
    travel_min: clamp(int(e.travel), 0, 600),
    memo: str(e.memo).slice(0, 2000),
    repeat_kind: REPEATS.includes(e.repeat) ? e.repeat : "none",
    alerts: (e.alerts ?? []).map((m) => int(m, NaN)).filter(Number.isFinite),
    until_on: e.until ?? null,
    except_on: [...(e.ex ?? [])].sort(),
  };
};

export const rowEvent = (r) => ({
  id: r.id, brand: r.brand_id, place: r.place, start: local16(r.start_at), end: local16(r.end_at), travel: r.travel_min ?? 0, memo: r.memo ?? "",
  repeat: r.repeat_kind ?? "none", alerts: r.alerts ?? [],
  ...(r.until_on ? { until: r.until_on } : null), ...(r.except_on?.length ? { ex: r.except_on } : null),
});

// 서버 제약에 맞지 않는 이용권(기간권인데 days 없음, 횟수권인데 total/remaining 없음 등)은 null → 올리지 않는다
export const passRow = (p) => {
  const period = p.kind === "period";
  if (period ? !(p.days >= 1) : !(p.total >= 1)) return null;
  if (!period && !Number.isFinite(Number(p.remaining))) return null;
  const total = period ? null : clamp(int(p.total), 1, 999);
  return {
    id: p.id,
    brand_id: str(p.brand).slice(0, 40),
    kind: p.kind,
    days: period ? clamp(int(p.days), 1, 3650) : null,
    total,
    remaining: period ? null : clamp(int(p.remaining), 0, total),
    valid_days: !period && p.validDays ? clamp(int(p.validDays), 1, 3650) : null,
    bonus_days: clamp(int(p.bonusDays), -3650, 3650),
    start_on: p.start ?? null,
    expires_on: p.expires ?? null,
    ended_on: p.endedOn ?? null,
    counted_from: p.countedFrom ? local16(p.countedFrom) : null,
    pauses: (p.pauses ?? []).map((z) => ({ id: z.id, from: z.from, to: z.to })),
    used_keys: [...(p.usedKeys ?? [])],
    ...(p.createdAt ? { created_at: iso(p.createdAt) } : null),
  };
};

export const rowPass = (r) => normalizePass({
  id: r.id, createdAt: iso(r.created_at) ?? "", brand: r.brand_id, kind: r.kind,
  ...(r.days != null ? { days: r.days } : null), ...(r.total != null ? { total: r.total, remaining: r.remaining } : null), ...(r.valid_days != null ? { validDays: r.valid_days } : null),
  bonusDays: r.bonus_days ?? 0, start: r.start_on ?? null, expires: r.expires_on ?? null,
  ...(r.ended_on ? { endedOn: r.ended_on } : null), ...(r.counted_from ? { countedFrom: local16(r.counted_from) } : null),
  pauses: r.pauses ?? [], ...(r.used_keys?.length ? { usedKeys: r.used_keys } : null),
});

const favId = (k) => (typeof k === "string" && k.startsWith("b:") ? k.slice(2) : null);

/* ---------- 모든 id 를 UUID 로: UUID 가 아닌 id(옛 형식)는 새 UUID 로 바꾸고, 이용권의 차감 내역("일정id|날짜")도 따라 바꾼다 ---------- */
export const uuidize = ({ events, passes }) => {
  const map = new Map(); let changed = false;
  const ev = events.map((e) => { if (UUID.test(e.id)) return e; changed = true; const id = newId(); map.set(String(e.id), id); return { ...e, id }; });
  const ps = passes.map((p) => {
    let q = p;
    if (!UUID.test(p.id)) { changed = true; q = { ...q, id: newId() }; }
    if (map.size && q.usedKeys?.length) q = { ...q, usedKeys: q.usedKeys.map((k) => { const [id, d] = k.split("|"); return map.has(id) ? `${map.get(id)}|${d}` : k; }) };
    return q;
  });
  return { events: ev, passes: ps, changed };
};

/* ---------- 병합 ---------- */
// L: 이 기기 목록, R: 서버 목록(앱 형식), B: 지난 동기화 시점의 { id: 해시 }, toRow: 행 변환(null 이면 올리지 않음)
const mergeList = (L, R, B, toRow) => {
  const hashes = (list) => { const m = new Map(), skipped = []; list.forEach((x) => { const r = toRow(x); if (r) m.set(x.id, { x, h: hashOf(r), r }); else skipped.push(x.id); }); return { m, skipped }; };
  const lh = hashes(L), rh = hashes(R);
  const out = [], skippedLocal = new Set(lh.skipped);
  const seen = new Set();
  L.forEach((x) => {
    seen.add(x.id);
    if (skippedLocal.has(x.id)) { out.push(x); return; } // 서버 형식에 맞지 않는 항목은 기기에만 둔다
    const l = lh.m.get(x.id), r = rh.m.get(x.id), b = B[x.id];
    const dirty = l.h !== b;
    if (r) out.push(!dirty && r.h !== l.h ? r.x : x); // 바꾼 게 없으면 서버 내용으로, 바꿨으면 이 기기 우선
    else if (b === undefined || dirty) out.push(x); // 새로 만든 항목 / 바꿨는데 서버에서 사라진 항목 → 다시 올림
    // 그 외(서버에서 사라졌고 바꾼 적 없음) → 삭제
  });
  R.forEach((x) => {
    if (seen.has(x.id)) return;
    if (B[x.id] === undefined) out.push(x); // 다른 기기에서 새로 생긴 항목
    // 이 기기에서 지운 항목은 추가하지 않음(서버에서도 삭제)
  });
  const outH = hashes(out).m;
  const upserts = [...outH.values()].filter((v) => rh.m.get(v.x.id)?.h !== v.h).map((v) => v.r);
  const deletes = R.filter((x) => !outH.has(x.id)).map((x) => x.id);
  const snap = Object.fromEntries([...outH].map(([id, v]) => [id, v.h]));
  return { out, upserts, deletes, snap, skipped: lh.skipped.length };
};

const mergeFavs = (L, R, B) => {
  const l = new Set(L.map(favId).filter(Boolean)), r = new Set(R), b = new Set(B);
  const keep = new Set([...l].filter((x) => r.has(x) || !b.has(x)));
  [...r].forEach((x) => { if (!b.has(x)) keep.add(x); });
  const out = [...keep].sort();
  return { out, upserts: out.filter((x) => !r.has(x)), deletes: [...r].filter((x) => !keep.has(x)), snap: out };
};

const EMPTY = { events: {}, passes: {}, favs: [] };

/* local: { events, passes, favs }(앱 형식) / remote: { events, passes, favs }(앱 형식, favs 는 브랜드 id 목록) / snapshot: 저장된 사본 또는 null */
export const mergeAll = (local, remote, snapshot) => {
  const B = { ...EMPTY, ...snapshot };
  const u = uuidize(local);
  const e = mergeList(u.events, remote.events, B.events, eventRow);
  const p = mergeList(u.passes, remote.passes, B.passes, passRow);
  const f = mergeFavs(local.favs, remote.favs, B.favs);
  // 찜: 이 기기 목록의 "b:" 가 아닌 키는 그대로 둔다
  const merged = { events: e.out, passes: p.out, favs: [...local.favs.filter((k) => !favId(k) && k), ...f.out.map((x) => `b:${x}`)] };
  return {
    merged,
    ops: { events: e, passes: p, favs: f },
    snapshot: { events: e.snap, passes: p.snap, favs: f.snap, at: Date.now() },
    skipped: e.skipped + p.skipped,
  };
};

// 이 기기에서 아직 서버에 올리지 않은 변경이 있는지(해시 비교만 하는 가벼운 검사)
export const isDirty = (local, snapshot) => {
  if (!snapshot) return true;
  const B = { ...EMPTY, ...snapshot };
  const diff = (list, toRow, b) => {
    if (list.some((x) => !UUID.test(x.id))) return true;
    const rows = list.map(toRow).filter(Boolean);
    return rows.length !== Object.keys(b).length || rows.some((r) => hashOf(r) !== b[r.id]);
  };
  const favs = local.favs.map(favId).filter(Boolean).sort();
  return diff(local.events, eventRow, B.events) || diff(local.passes, passRow, B.passes) || JSON.stringify(favs) !== JSON.stringify([...B.favs].sort());
};

/* ---------- 서버 입출력 ---------- */
const fail = (r) => { if (r?.error) throw r.error; return r.data; };

const fetchAll = async (client, table, order) => {
  const rows = [];
  for (let from = 0; ; from += SYNC.pageSize) {
    const page = fail(await client.from(table).select("*").order(order).range(from, from + SYNC.pageSize - 1)) ?? [];
    rows.push(...page);
    if (page.length < SYNC.pageSize) return rows;
  }
};

export const pull = async (client) => {
  const [ev, ps, fv] = await Promise.all([fetchAll(client, "schedules", "id"), fetchAll(client, "passes", "id"), fetchAll(client, "favorite_centers", "brand_id")]);
  return { events: ev.map(rowEvent), passes: ps.map(rowPass), favs: fv.map((r) => r.brand_id) };
};

const chunks = (list) => { const out = []; for (let i = 0; i < list.length; i += SYNC.chunk) out.push(list.slice(i, i + SYNC.chunk)); return out; };

export const push = async (client, uid, ops) => {
  for (const [table, o] of [["schedules", ops.events], ["passes", ops.passes]]) {
    for (const c of chunks(o.upserts)) fail(await client.from(table).upsert(c.map((r) => ({ ...r, user_id: uid })), { onConflict: "id" }));
    for (const c of chunks(o.deletes)) fail(await client.from(table).delete().in("id", c));
  }
  for (const c of chunks(ops.favs.upserts)) fail(await client.from("favorite_centers").upsert(c.map((b) => ({ user_id: uid, brand_id: b })), { onConflict: "user_id,brand_id", ignoreDuplicates: true }));
  for (const c of chunks(ops.favs.deletes)) fail(await client.from("favorite_centers").delete().in("brand_id", c));
};

/* 한 번 맞추기: 서버 내용을 가져오고 → 그 시점의 이 기기 데이터와 병합해 apply 로 반영 → 서버에 올림.
   서버 통신 중에 바뀐 기기 데이터를 덮어쓰지 않도록 getLocal 은 가져온 뒤에 읽는다. 새 snapshot 과 올리지 못한 항목 수를 돌려준다 */
export async function runSync({ client, uid, getLocal, apply, snapshot }) {
  const remote = await pull(client);
  const m = mergeAll(getLocal(), remote, snapshot);
  apply(m.merged);
  await push(client, uid, m.ops);
  return { snapshot: m.snapshot, skipped: m.skipped };
}
