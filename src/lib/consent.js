import { CONSENT_KEY, CONSENT_VERSION } from "@/constants/consent";
import { store } from "@/lib/store";

/* 가입 동의 기록(이 기기). 동의 일시와 문서 버전을 남기고, 버전이 바뀌면 다시 받는다 */
export const hasConsent = (s = store) => {
  const c = s.get(CONSENT_KEY, null);
  return !!c && c.version === CONSENT_VERSION && c.age === true && c.terms === true;
};

export const saveConsent = (s = store, now = new Date()) =>
  s.set(CONSENT_KEY, { version: CONSENT_VERSION, age: true, terms: true, at: now.toISOString() });
