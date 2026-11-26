import { describe, expect, it } from "vitest";
import { backupDue, backupRemindText, daysSinceBackup, loadBackupRecord, markBackedUp, snoozeBackup } from "@/lib/backupReminder";

const D = (s) => new Date(`${s}T12:00:00Z`);

describe("백업 알림", () => {
  it("기록이 없거나 깨졌으면 지금부터 센다", () => {
    const r = loadBackupRecord(null, D("2026-01-01"));
    expect(r).toEqual({ last: null, base: D("2026-01-01").toISOString(), snooze: null });
    expect(loadBackupRecord({ last: "엉망", base: 5 }, D("2026-01-01")).last).toBe(null);
  });
  it("29일까지는 조용하고 30일째부터 권한다", () => {
    const r = loadBackupRecord({ base: D("2026-01-01").toISOString() }, D("2026-01-01"));
    expect(backupDue(r, D("2026-01-30"), true)).toBe(false);
    expect(backupDue(r, D("2026-01-31"), true)).toBe(true);
  });
  it("데이터가 없으면 권하지 않는다", () => {
    const r = loadBackupRecord({ base: D("2026-01-01").toISOString() }, D("2026-01-01"));
    expect(backupDue(r, D("2026-06-01"), false)).toBe(false);
  });
  it("백업하면 마지막 백업 기준으로 다시 센다", () => {
    let r = loadBackupRecord({ base: D("2026-01-01").toISOString() }, D("2026-01-01"));
    r = markBackedUp(r, D("2026-03-01"));
    expect(daysSinceBackup(r, D("2026-03-10"))).toBe(9);
    expect(backupDue(r, D("2026-03-10"), true)).toBe(false);
    expect(backupDue(r, D("2026-03-31"), true)).toBe(true);
  });
  it("나중에 누르면 7일 동안 조용하고 그 뒤 다시 권한다", () => {
    let r = loadBackupRecord({ base: D("2026-01-01").toISOString() }, D("2026-01-01"));
    r = snoozeBackup(r, D("2026-02-01"));
    expect(backupDue(r, D("2026-02-07"), true)).toBe(false);
    expect(backupDue(r, D("2026-02-08"), true)).toBe(true);
  });
  it("안내 문구", () => {
    const never = loadBackupRecord({ base: D("2026-01-01").toISOString() }, D("2026-01-01"));
    expect(backupRemindText(never, D("2026-02-05"))).toContain("아직 백업한 적이 없어요");
    expect(backupRemindText(markBackedUp(never, D("2026-01-10")), D("2026-02-20"))).toContain("41일 전");
  });
});
