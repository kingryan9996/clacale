/* 새 데이터의 고유 id: 서버(Supabase, uuid)와 그대로 맞는 UUID. 옛 데이터의 숫자 id도 그대로 인식한다 */
export const newId = () => {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const b = c?.getRandomValues ? c.getRandomValues(new Uint8Array(16)) : Uint8Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

// id 비교(숫자 id와 UUID가 섞여 있어도 오류 없이): 둘 다 숫자면 숫자순, 아니면 문자순
export const cmpId = (a, b) => (typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "en", { numeric: true }));

// 등록 순서: createdAt(있으면) -> id
export const byCreated = (a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? "") || cmpId(a.id, b.id);
