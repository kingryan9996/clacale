import { PREMIGRATE_PREFIX, SCHEMA_KEY, SCHEMA_VERSION } from "@/constants/backup";
import { newId } from "@/lib/id";
import { computeExpires } from "@/lib/passes";
import { store } from "@/lib/store";

/* ---------- 저장 데이터 정리/변환 (앱 시작 시 한 번, 백업 가져오기 때도 같은 규칙) ----------
   현재 형식(v1): 모든 항목에 고유 id 보장(없거나 중복이면 새 UUID), 일정 기본값(repeat/alerts), 이용권 정지 목록·추가 일수·만료일, 잘못된 항목 제외.
   저장 모양을 바꿀 때만 SCHEMA_VERSION 을 올리고 변환을 추가한다(출시 전에는 옛 형식을 따로 변환하지 않는다) */
const isStr = (v) => typeof v === "string" && v.length > 0;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

// 중복/누락 id 해결: 첫 항목은 유지, 나머지에 새 id (id가 바뀐 항목 수를 함께 돌려줌)
const fixIds = (list) => {
  const seen = new Set(); let fixed = 0;
  const out = list.map((x) => {
    if (x.id == null || x.id === "" || seen.has(x.id)) { fixed += 1; return { ...x, id: newId() }; }
    seen.add(x.id); return x;
  });
  return { out, fixed };
};

export const normalizeEvents = (list) => {
  const ok = list.filter((e) => e && typeof e === "object" && isStr(e.brand) && isStr(e.place) && ISO.test(e.start ?? "") && ISO.test(e.end ?? ""));
  const { out } = fixIds(ok.map((e) => ({ repeat: "none", alerts: [], ...e })));
  return { list: out, dropped: list.length - ok.length };
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const validPause = (z) => z && typeof z === "object" && DATE.test(z.from ?? "") && DATE.test(z.to ?? "");

// 이용권 하나를 현재 형식으로 정리: 정지 목록 정돈(기간권만), 추가 일수 기본값, 만료일 다시 계산
export const normalizePass = (p) => {
  const q = { createdAt: "", ...p };
  q.pauses = p.kind === "period" && Array.isArray(p.pauses) ? p.pauses.filter(validPause).map((z) => ({ id: isStr(z.id) ? z.id : newId(), from: z.from, to: z.to })) : [];
  if (typeof q.bonusDays !== "number" || Number.isNaN(q.bonusDays)) q.bonusDays = 0;
  const e = computeExpires(q);
  return e ? { ...q, expires: e } : q;
};

export const normalizePasses = (list) => {
  const ok = list.filter((p) => p && typeof p === "object" && isStr(p.brand) && (p.kind === "period" || p.kind === "count"));
  const { out } = fixIds(ok);
  return { list: out.map(normalizePass), dropped: list.length - ok.length };
};

export const normalizeStrings = (list) => ({ list: [...new Set(list.filter(isStr))], dropped: list.filter((v) => !isStr(v)).length });

// 백업/저장 데이터 전체 정리. 배열이 아닌 항목은 빈 배열로 본다.
export const normalizeData = (d) => {
  const arr = (v) => (Array.isArray(v) ? v : []);
  const e = normalizeEvents(arr(d?.events)), p = normalizePasses(arr(d?.passes)), f = normalizeStrings(arr(d?.favs));
  return { data: { events: e.list, passes: p.list, favs: f.list }, dropped: e.dropped + p.dropped + f.dropped };
};

const FIXERS = { events: normalizeEvents, passes: normalizePasses, favs: normalizeStrings };

/* 앱 시작 시 호출: 저장된 모든 계정의 데이터를 현재 형식으로 변환. 변환 전 원본은 한 번 따로 보관(실수 대비) */
export function migrateStorage() {
  if ((store.get(SCHEMA_KEY, 0) ?? 0) >= SCHEMA_VERSION) return;
  for (const key of store.keys()) {
    const m = /^clacale:(events|passes|favs):/.exec(key);
    if (!m) continue;
    const raw = store.get(key, null);
    if (!Array.isArray(raw)) continue; // 모르는 형태는 건드리지 않는다
    store.set(PREMIGRATE_PREFIX + key, raw);
    store.set(key, FIXERS[m[1]](raw).list);
  }
  store.set(SCHEMA_KEY, SCHEMA_VERSION);
}
