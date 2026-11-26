import { describe, expect, it } from "vitest";
import { CONSENT_KEY, CONSENT_VERSION } from "@/constants/consent";
import { hasConsent, saveConsent } from "@/lib/consent";

const fake = () => { const m = {}; return { get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = v; } }; };

describe("가입 동의 기록", () => {
  it("기록이 없으면 동의하지 않은 상태", () => {
    expect(hasConsent(fake())).toBe(false);
  });
  it("저장하면 동의한 상태, 일시와 버전이 남는다", () => {
    const s = fake();
    saveConsent(s, new Date("2026-01-02T03:04:05Z"));
    expect(hasConsent(s)).toBe(true);
    expect(s.get(CONSENT_KEY)).toEqual({ version: CONSENT_VERSION, age: true, terms: true, at: "2026-01-02T03:04:05.000Z" });
  });
  it("문서 버전이 바뀌면 다시 동의를 받는다", () => {
    const s = fake();
    s.set(CONSENT_KEY, { version: CONSENT_VERSION - 1, age: true, terms: true });
    expect(hasConsent(s)).toBe(false);
  });
  it("일부만 동의한 기록은 인정하지 않는다", () => {
    const s = fake();
    s.set(CONSENT_KEY, { version: CONSENT_VERSION, age: true, terms: false });
    expect(hasConsent(s)).toBe(false);
  });
});
