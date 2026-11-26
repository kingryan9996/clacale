import { Link } from "react-router-dom";
import { LEGAL_LINKS } from "@/constants/legal";
import "./LegalLinks.css";

/* 개인정보처리방침 · 이용약관 링크 줄 (로그인 화면, 마이페이지 하단) */
export default function LegalLinks({ className = "" }) {
  return (
    <nav aria-label="약관 및 정책" className={`legal-links ${className}`.trim()}>
      {LEGAL_LINKS.map((l, i) => (
        <span key={l.to} className="legal-links__item">
          {i > 0 && <span className="legal-links__dot" aria-hidden="true">·</span>}
          <Link to={l.to} className="legal-links__link">{l.label}</Link>
        </span>
      ))}
    </nav>
  );
}
