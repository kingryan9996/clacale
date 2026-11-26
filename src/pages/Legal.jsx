import { ChevronLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Container } from "@/components/ui";
import { LEGAL_DOCS, LEGAL_META } from "@/constants/legal";
import { draftIssues, fillMeta } from "@/lib/legal";
import "@/pages/Legal.css";

/* ---------- 개인정보처리방침 / 이용약관 (로그인 없이 볼 수 있는 공개 페이지: /privacy, /terms) ---------- */
export default function Legal({ doc }) {
  const d = LEGAL_DOCS[doc];
  const nav = useNavigate();
  const { key } = useLocation();
  const back = () => (key !== "default" ? nav(-1) : nav("/")); // 주소로 바로 들어왔으면 앱 첫 화면으로
  const issues = draftIssues();
  return (
    <Container height="screen" className="legal">
      <header className="legal__header">
        <Button variant="ghost" size="icon" onClick={back} aria-label="뒤로"><ChevronLeft size={22} /></Button>
        <h1 className="legal__title">{d.title}</h1>
        <span className="legal__spacer" />
      </header>
      <article className="legal__body">
        {LEGAL_META.draft && (
          <p className="legal__draft" role="note">
            시행 전 초안입니다.{issues.length > 0 && <> 아직 비어 있는 항목: {issues.join(", ")}.</>}
          </p>
        )}
        <p className="legal__text">{fillMeta(d.intro)}</p>
        {d.sections.map((s) => (
          <section key={s.id} className="legal__section">
            <h2 className="legal__h2">{s.title}</h2>
            {s.body.map((b, i) => Array.isArray(b)
              ? <ul key={i} className="legal__list">{b.map((li, j) => <li key={j}>{fillMeta(li)}</li>)}</ul>
              : b.startsWith("## ")
                ? <h3 key={i} className="legal__h3">{b.slice(3)}</h3>
                : <p key={i} className="legal__text">{fillMeta(b)}</p>)}
          </section>
        ))}
        <p className="legal__meta">시행일: {fillMeta("{{effectiveDate}}")}</p>
      </article>
    </Container>
  );
}
