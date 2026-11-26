import { BACKUP_APP, BACKUP_ERRORS, BACKUP_FILE_PREFIX, SCHEMA_VERSION } from "@/constants/backup";
import { normalizeData } from "@/lib/migrate";

/* ---------- 백업 파일(JSON) 만들기 / 읽기 / 저장 ---------- */
export const buildBackup = ({ events, passes, favs }, now = new Date()) =>
  JSON.stringify({ app: BACKUP_APP, version: SCHEMA_VERSION, exportedAt: now.toISOString(), data: { events, passes, favs } }, null, 2);

export const backupFileName = (todayKey) => `${BACKUP_FILE_PREFIX}-${todayKey}.json`;

// 결과: { ok:true, data, dropped, counts } | { ok:false, error }
export function parseBackup(text) {
  let j;
  try { j = JSON.parse(text); } catch (e) { return { ok: false, error: BACKUP_ERRORS.parse }; }
  if (!j || typeof j !== "object" || j.app !== BACKUP_APP || typeof j.data !== "object" || j.data === null) return { ok: false, error: BACKUP_ERRORS.app };
  if (typeof j.version !== "number" || j.version > SCHEMA_VERSION) return { ok: false, error: BACKUP_ERRORS.newer };
  const { data, dropped } = normalizeData(j.data);
  const counts = { events: data.events.length, passes: data.passes.length, favs: data.favs.length };
  if (Object.values(counts).every((n) => n === 0)) return { ok: false, error: BACKUP_ERRORS.empty };
  return { ok: true, data, dropped, counts };
}

export function downloadText(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
