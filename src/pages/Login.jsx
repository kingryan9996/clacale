import { useState } from "react";
import { Button, Container, Input } from "@/components/ui";
import { auth } from "@/lib/auth";
import "@/pages/Login.css";

/* ---------- 로그인 화면 (카카오 / Google / 이메일 / 비회원) ---------- */
export default function Login({ onSignIn }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("이메일 형식을 확인해 주세요.");
    if (pw.length < 6) return setErr("비밀번호는 6자 이상이어야 해요.");
    onSignIn(await auth.email(email));
  };
  return (
    <Container height="screen" padded center>
      <div className="login__brand">
        <div className="login__title">클라캘</div>
        <div className="login__subtitle">클라이머 전용 캘린더</div>
      </div>
      <Button variant="kakao" size="lg" fullWidth onClick={async () => onSignIn(await auth.oauth("kakao"))}>카카오로 계속하기</Button>
      <Button variant="outline" size="lg" fullWidth onClick={async () => onSignIn(await auth.oauth("google"))}>Google로 계속하기</Button>
      <div className="login__divider">또는 이메일로</div>
      <Input type="email" aria-label="이메일" placeholder="이메일" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} />
      <Input type="password" aria-label="비밀번호" placeholder="비밀번호 (6자 이상)" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} error={err || undefined} />
      <Button variant="primary" size="lg" fullWidth onClick={submit}>{mode === "login" ? "로그인" : "가입하기"}</Button>
      <Button variant="ghost" size="bare" className="login__switch" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
        {mode === "login" ? "계정이 없나요? 이메일로 가입" : "이미 계정이 있어요 · 로그인"}
      </Button>
      <Button variant="secondary" size="lg" fullWidth onClick={() => onSignIn({ type: "guest" })}>비회원(Guest)으로 이용하기</Button>
      <p className="login__notice">비회원은 이 기기에만 일정이 저장되고, 통계는 로그인 후 볼 수 있어요.<br />미리보기에서는 실제 인증 서버 대신 데모 계정으로 로그인돼요.</p>
    </Container>
  );
}
