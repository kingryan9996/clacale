// 가입(회원) 동의: 문서(방침/약관)를 바꿔 다시 동의받아야 하면 CONSENT_VERSION 을 올린다
export const AGE_MIN = 14; // 서비스 이용 최소 연령(만). 개인정보처리방침·이용약관 문구도 이 값을 따른다
export const CONSENT_KEY = "clacale:consent";
export const CONSENT_VERSION = 1;

export const CONSENT_TEXT = {
  age: `만 ${AGE_MIN}세 이상입니다`,
  required: "(필수)",
  termsAnd: " 및 ",
  termsPost: "에 동의합니다",
  error: "필수 항목에 모두 동의해 주세요.",
  sheetTitle: "가입 전에 확인해 주세요",
  sheetOk: "동의하고 계속",
};
