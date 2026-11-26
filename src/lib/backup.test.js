import { describe, expect, it } from "vitest";
import { BACKUP_ERRORS, SCHEMA_VERSION } from "@/constants/backup";
import { backupFileName, buildBackup, parseBackup } from "@/lib/backup";

const data = {
  events: [{ id: "e1", brand: "climb", place: "더클라임 강남", start: "2026-01-05T19:00", end: "2026-01-05T21:00", repeat: "none", alerts: [] }],
  passes: [{ id: "p1", brand: "climb", kind: "period", days: 30, createdAt: "2026-01-01T00:00:00.000Z", pauses: [], bonusDays: 0 }],
  favs: ["b:climb"],
};

describe("백업 파일", () => {
  it("내보낸 파일을 그대로 다시 읽으면 같은 데이터", () => {
    const r = parseBackup(buildBackup(data, new Date("2026-01-10T00:00:00Z")));
    expect(r.ok).toBe(true);
    expect(r.data).toEqual(data);
    expect(r.counts).toEqual({ events: 1, passes: 1, favs: 1 });
    expect(r.dropped).toBe(0);
  });
  it("파일 이름", () => {
    expect(backupFileName("2026-01-10")).toBe("clacale-backup-2026-01-10.json");
  });
  it("JSON이 아니면 읽기 오류", () => {
    expect(parseBackup("not json")).toEqual({ ok: false, error: BACKUP_ERRORS.parse });
  });
  it("다른 앱 파일은 거절", () => {
    expect(parseBackup(JSON.stringify({ app: "other", version: 1, data: {} })).error).toBe(BACKUP_ERRORS.app);
  });
  it("더 새로운 버전의 백업은 거절", () => {
    const j = JSON.stringify({ app: "clacale", version: SCHEMA_VERSION + 1, data });
    expect(parseBackup(j).error).toBe(BACKUP_ERRORS.newer);
  });
  it("내용이 모두 비면 거절", () => {
    const j = JSON.stringify({ app: "clacale", version: SCHEMA_VERSION, data: { events: [], passes: [], favs: [] } });
    expect(parseBackup(j).error).toBe(BACKUP_ERRORS.empty);
  });
  it("잘못된 항목은 빼고 개수를 알려준다", () => {
    const j = JSON.stringify({ app: "clacale", version: SCHEMA_VERSION, data: { ...data, events: [...data.events, { brand: "x" }] } });
    const r = parseBackup(j);
    expect(r.ok).toBe(true);
    expect(r.dropped).toBe(1);
    expect(r.data.events).toHaveLength(1);
  });
});
