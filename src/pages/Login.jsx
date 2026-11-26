import { useState } from "react";
import ConsentChecks from "@/components/ConsentChecks";
import LegalLinks from "@/components/LegalLinks";
import { Button, ConfirmSheet, Container, Input } from "@/components/ui";
import { AUTH_TEXT, PASSWORD_MIN } from "@/constants/auth";
import { CONSENT_TEXT } from "@/constants/consent";
import { useAuth } from "@/context/AuthContext";
import { auth, authErrorText, supabaseEnabled } from "@/lib/auth";
import { hasConsent, saveConsent } from "@/lib/consent";
import "@/pages/Login.css";

/* ---------- 로그인 화면 (카카오 / Google / 이메일 / 비회원). 서버 설정이 없으면 데모 계정으로 로그인 ---------- */
export default function Login() {
  const { signIn: onSignIn } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState(""); // 인증 메일 / 재설정 메일 안내
  const [busy, setBusy] = useState(false);
  // 가입 동의: 연령(만 14세 이상) + 약관·방침. 이메일 가입은 폼에서, 카카오/Google 은 처음 한 번 시트로 받는다
  const [age, setAge] = useState(hasConsent);
  const [terms, setTerms] = useState(hasConsent);
  const [consentErr, setConsentErr] = useState("");
  const [askProvider, setAskProvider] = useState(null); // 동의 시트를 띄운 소셜 로그인 제공자
  const agreed = age && terms;
  const setAgeV = (v) => { setAge(v); setConsentErr(""); };
  const setTermsV = (v) => { setTerms(v); setConsentErr(""); };
  const validEmail = () => /^\S+@\S+\.\S+$/.test(email);
  // 서버 호출 공통 처리: 처리 중 잠금, 오류는 한국어 안내로. 데모 모드는 세션을 돌려주므로 바로 로그인
  const run = async (fn) => {
    setBusy(true); setErr(""); setInfo("");
    try { const r = await fn(); if (r?.session) onSignIn(r.session); return r; } catch (e) { setErr(authErrorText(e)); return null; } finally { setBusy(false); }
  };
  const submit = async () => {
    if (!validEmail()) return setErr(AUTH_TEXT.emailFormat);
    if (pw.length < PASSWORD_MIN) return setErr(AUTH_TEXT.passwordShort);
    if (mode === "signup") {
      if (!agreed) return setConsentErr(CONSENT_TEXT.error);
      saveConsent();
      const r = await run(() => auth.signUp(email, pw));
      if (r?.status === "confirm") { setInfo(AUTH_TEXT.confirmSent); setMode("login"); setPw(""); }
    } else await run(() => auth.signIn(email, pw));
  };
  const forgot = async () => {
    if (!validEmail()) return setErr(AUTH_TEXT.emailFormat);
    const r = await run(() => auth.resetPassword(email));
    if (r) setInfo(AUTH_TEXT.resetSent);
  };
  const social = (provider) => (hasConsent() ? run(() => auth.oauth(provider)) : setAskProvider(provider));
  const confirmSocial = () => { saveConsent(); const p = askProvider; setAskProvider(null); return run(() => auth.oauth(p)); };
  return (
    <Container height="screen" padded center>
      <div className="login__brand">
        <h1 className="login__title">클라캘</h1>
        <div className="login__subtitle">클라이머 전용 캘린더</div>
      </div>
      <Button variant="kakao" size="lg" fullWidth disabled={busy} onClick={() => social("kakao")}>카카오로 계속하기</Button>
      <Button variant="outline" size="lg" fullWidth disabled={busy} onClick={() => social("google")}>Google로 계속하기</Button>
      <div className="login__divider">또는 이메일로</div>
      <Input type="email" aria-label="이메일" placeholder="이메일" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} />
      <Input type="password" aria-label="비밀번호" placeholder={`비밀번호 (${PASSWORD_MIN}자 이상)`} value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} error={err || undefined} />
      {info && <p role="status" className="login__info">{info}</p>}
      {mode === "signup" && <ConsentChecks age={age} terms={terms} onAge={setAgeV} onTerms={setTermsV} error={consentErr} />}
      <Button variant="primary" size="lg" fullWidth disabled={busy} onClick={submit}>{mode === "login" ? "로그인" : "가입하기"}</Button>
      <Button variant="ghost" size="bare" className="login__switch" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
        {mode === "login" ? "계정이 없나요? 이메일로 가입" : "이미 계정이 있어요 · 로그인"}
      </Button>
      {mode === "login" && <Button variant="ghost" size="bare" className="login__switch" disabled={busy} onClick={forgot}>{AUTH_TEXT.forgot}</Button>}
      <Button variant="secondary" size="lg" fullWidth onClick={() => onSignIn({ type: "guest" })}>비회원(Guest)으로 이용하기</Button>
      <p className="login__notice">비회원은 이 기기에만 일정이 저장되고, 통계는 로그인 후 볼 수 있어요.{!supabaseEnabled && <><br />{AUTH_TEXT.demoNotice}</>}</p>
      <LegalLinks />
      {askProvider && (
        <ConfirmSheet label="가입 동의" title={CONSENT_TEXT.sheetTitle} onClose={() => setAskProvider(null)} actions={(c) => <>
          <Button variant="secondary" onClick={c}>취소</Button>
          <Button variant="primary" disabled={!agreed} onClick={confirmSocial}>{CONSENT_TEXT.sheetOk}</Button>
        </>}>
          <ConsentChecks age={age} terms={terms} onAge={setAgeV} onTerms={setTermsV} />
        </ConfirmSheet>
      )}
    </Container>
  );
}
