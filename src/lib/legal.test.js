import { describe, expect, it } from "vitest";
import { AGE_MIN } from "@/constants/consent";
import { CROWD_MIN_DISPLAY } from "@/constants/crowd";
import { LEGAL_DOCS, LEGAL_PATHS, RETENTION } from "@/constants/legal";
import { draftIssues, fillMeta } from "@/lib/legal";

const flat = (doc) => doc.sections.flatMap((s) => s.body.flat()).join("\n");

describe("fillMeta / draftIssues", () => {
  it("값이 있으면 바꾸고, 비어 있으면 '입력 필요'", () => {
    expect(fillMeta("운영자: {{operator}}", { operator: "홍길동" })).toBe("운영자: 홍길동");
    expect(fillMeta("메일: {{contactEmail}}", { contactEmail: "" })).toBe("메일: [문의 이메일 입력 필요]");
  });
  it("빈 항목을 모두 알려준다", () => {
    expect(draftIssues({ operator: "a", contactEmail: "", effectiveDate: "", supabaseRegion: "x" })).toEqual(["문의 이메일", "시행일"]);
    expect(draftIssues({ operator: "a", contactEmail: "b", effectiveDate: "c", supabaseRegion: "d" })).toEqual([]);
  });
});

describe("문서 데이터", () => {
  it("경로가 모두 실제 문서를 가리킨다", () => {
    Object.values(LEGAL_PATHS).forEach((k) => expect(LEGAL_DOCS[k]).toBeTruthy());
  });
  it("섹션 id 가 문서 안에서 겹치지 않는다", () => {
    Object.values(LEGAL_DOCS).forEach((d) => expect(new Set(d.sections.map((s) => s.id)).size).toBe(d.sections.length));
  });
  it("방침의 보관 기간·마스킹 숫자가 코드 상수와 같다", () => {
    const t = flat(LEGAL_DOCS.privacy);
    expect(t).toContain(`${RETENTION.pastScheduleMonths}개월`);
    expect(t).toContain(`${RETENTION.passDetailAfterEndYears}년`);
    expect(t).toContain(`${CROWD_MIN_DISPLAY}명 미만`);
  });
  it("방침·약관의 연령 기준이 가입 화면 상수와 같다", () => {
    expect(flat(LEGAL_DOCS.privacy)).toContain(`만 ${AGE_MIN}세 이상`);
    expect(flat(LEGAL_DOCS.terms)).toContain(`만 ${AGE_MIN}세 이상`);
  });
  it("방침에 '만료일이 없는 이용권' 같은 예외 문구가 남아 있지 않다", () => {
    expect(flat(LEGAL_DOCS.privacy)).not.toContain("만료일이 없는");
  });
  it("본문에서 쓰는 {{키}} 는 모두 채울 수 있는 키다", () => {
    const keys = new Set([...Object.values(LEGAL_DOCS).map(flat).join("\n").matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]));
    keys.forEach((k) => expect(["operator", "contactEmail", "supabaseRegion"]).toContain(k));
  });
});
