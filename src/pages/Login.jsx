import { useState } from "react";
import { fieldStyle } from "../components/AddSheet";
import Button, { BUTTON_CSS } from "../components/Button";
import { auth } from "../lib/auth";
import { INK, font } from "../lib/constants";

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
  const wide = { width: "100%" };
  return (
    <div style={{ margin: "0 auto", maxWidth: 448, height: "100dvh", overflowY: "auto", boxSizing: "border-box", padding: 24, background: "#F3F4F2", color: INK, fontFamily: font, display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
      <style>{BUTTON_CSS}</style>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 30, fontWeight: 800 }}>클라캘</div>
        <div style={{ marginTop: 4, fontSize: 15, color: "rgba(0,0,0,.55)" }}>클라이머 전용 캘린더</div>
      </div>
      <Button variant="ghost" size="lg" style={{ ...wide, background: "#FEE500", color: "#191919" }} onClick={async () => onSignIn(await auth.oauth("kakao"))}>카카오로 계속하기</Button>
      <Button variant="outline" size="lg" style={{ ...wide, background: "#fff" }} onClick={async () => onSignIn(await auth.oauth("google"))}>Google로 계속하기</Button>
      <div style={{ textAlign: "center", fontSize: 12, color: "rgba(0,0,0,.4)", margin: "4px 0" }}>또는 이메일로</div>
      <input type="email" aria-label="이메일" placeholder="이메일" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} style={fieldStyle} />
      <input type="password" aria-label="비밀번호" placeholder="비밀번호 (6자 이상)" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} style={fieldStyle} />
      {err && <div role="alert" style={{ fontSize: 13, color: "#B91C1C" }}>{err}</div>}
      <Button variant="primary" size="lg" style={wide} onClick={submit}>{mode === "login" ? "로그인" : "가입하기"}</Button>
      <Button variant="ghost" size="none" style={{ alignSelf: "center", padding: 4, fontSize: 13, color: "rgba(0,0,0,.55)" }} onClick={() => setMode(mode === "login" ? "signup" : "login")}>
        {mode === "login" ? "계정이 없나요? 이메일로 가입" : "이미 계정이 있어요 · 로그인"}
      </Button>
      <Button variant="secondary" size="lg" style={wide} onClick={() => onSignIn({ type: "guest" })}>비회원(Guest)으로 이용하기</Button>
      <p style={{ margin: 0, textAlign: "center", fontSize: 12, color: "rgba(0,0,0,.45)" }}>비회원은 이 기기에만 일정이 저장되고, 통계는 로그인 후 볼 수 있어요.<br />미리보기에서는 실제 인증 서버 대신 데모 계정으로 로그인돼요.</p>
    </div>
  );
}
