import { useState } from "react";
import { Button, Container, Input } from "@/components/ui";
import { AUTH_TEXT, PASSWORD_MIN } from "@/constants/auth";
import { useAuth } from "@/context/AuthContext";
import { auth, authErrorText } from "@/lib/auth";
import "@/pages/Login.css";

/* ---------- 비밀번호 재설정: 메일의 링크로 들어오면 새 비밀번호를 정한다 ---------- */
export default function ResetPassword() {
  const { finishRecovery } = useAuth();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (pw.length < PASSWORD_MIN) return setErr(AUTH_TEXT.passwordShort);
    if (pw !== pw2) return setErr(AUTH_TEXT.resetMismatch);
    setBusy(true);
    try { await auth.updatePassword(pw); finishRecovery(); } catch (e) { setErr(authErrorText(e)); } finally { setBusy(false); }
  };
  return (
    <Container height="screen" padded center>
      <div className="login__brand">
        <h1 className="login__title">{AUTH_TEXT.resetTitle}</h1>
        <div className="login__subtitle">{AUTH_TEXT.resetHint}</div>
      </div>
      <Input type="password" aria-label="새 비밀번호" placeholder={AUTH_TEXT.resetPlaceholder} value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} />
      <Input type="password" aria-label={AUTH_TEXT.resetConfirm} placeholder={AUTH_TEXT.resetConfirm} value={pw2} onChange={(e) => { setPw2(e.target.value); setErr(""); }} error={err || undefined} />
      <Button variant="primary" size="lg" fullWidth disabled={busy} onClick={submit}>{AUTH_TEXT.resetOk}</Button>
    </Container>
  );
}
