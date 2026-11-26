import { BACKUP_REMIND_DAYS, BACKUP_SNOOZE_DAYS } from "@/constants/backup";

/* ---------- 백업 알림: 마지막 백업(없으면 사용 시작)으로부터 30일이 지나면 권한다 ---------- */
const DAY = 86400000;
const validIso = (s) => typeof s === "string" && !Number.isNaN(new Date(s).getTime());

// 저장된 기록이 없거나 깨졌으면 지금부터 센다
export const loadBackupRecord = (raw, now) => ({
  last: validIso(raw?.last) ? raw.last : null,
  base: validIso(raw?.base) ? raw.base : now.toISOString(),
  snooze: validIso(raw?.snooze) ? raw.snooze : null,
});

export const daysSinceBackup = (rec, now) => Math.max(0, Math.floor((now - new Date(rec.last ?? rec.base)) / DAY));

export const backupDue = (rec, now, hasData) =>
  hasData && daysSinceBackup(rec, now) >= BACKUP_REMIND_DAYS && !(rec.snooze && now < new Date(rec.snooze));

export const markBackedUp = (rec, now) => ({ ...rec, last: now.toISOString(), snooze: null });

export const snoozeBackup = (rec, now) => ({ ...rec, snooze: new Date(now.getTime() + BACKUP_SNOOZE_DAYS * DAY).toISOString() });

export const backupRemindText = (rec, now) => {
  const n = daysSinceBackup(rec, now);
  return rec.last ? `마지막 백업이 ${n}일 전이에요. 일정과 이용권을 파일로 한 번 저장해 두세요.` : `아직 백업한 적이 없어요(사용한 지 ${n}일째). 일정과 이용권을 파일로 한 번 저장해 두세요.`;
};
