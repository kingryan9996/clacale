import { Checkbox } from "@/components/ui";
import { CONSENT_TEXT as T } from "@/constants/consent";
import "./ConsentChecks.css";

/* 가입 동의 체크박스 2개: 연령 확인 + 이용약관·개인정보처리방침 동의. 문서는 새 탭으로 열어 입력 중인 화면을 유지한다 */
export default function ConsentChecks({ age, terms, onAge, onTerms, error }) {
  const link = (href, text) => <a href={href} target="_blank" rel="noopener noreferrer">{text}</a>;
  return (
    <div className="consent">
      <Checkbox checked={age} onChange={(e) => onAge(e.target.checked)}>{T.age} {T.required}</Checkbox>
      <Checkbox checked={terms} onChange={(e) => onTerms(e.target.checked)}>
        {link("/terms", "이용약관")}{T.termsAnd}{link("/privacy", "개인정보처리방침")}{T.termsPost} {T.required}
      </Checkbox>
      {error && <p role="alert" className="consent__error">{error}</p>}
    </div>
  );
}
