import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { clearAccountData, prepareAccount, uidOf } from "@/lib/account";
import { auth, sessionOf, supabaseEnabled } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { CONSENT_KEY } from "@/constants/consent";
import { store } from "@/lib/store";

const AuthContext = createContext(null);
const SESSION_KEY = "clacale:session";

/* 전역 세션: null | { type: "guest" } | { type: "user", id, provider, name, email }
   - 서버 설정이 있으면 회원 세션은 Supabase 가 보관·갱신하고(onAuthStateChange), 비회원 세션만 이 기기에 저장한다.
   - 서버 설정이 없으면(미리보기) 데모 계정 세션도 이 기기에 저장한다.
   ready: 서버에서 저장된 로그인을 확인하기 전에는 false(로그인 화면이 잠깐 번쩍이지 않게). recovery: 비밀번호 재설정 링크로 들어온 상태.
   페이지/컴포넌트는 session·signIn·signOut 을 prop 으로 받지 않고 useAuth() 로 직접 참조한다. */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => { const s = store.get(SESSION_KEY, null); return supabaseEnabled && s?.type !== "guest" ? null : s; });
  const [ready, setReady] = useState(!supabaseEnabled);
  const [recovery, setRecovery] = useState(false);
  const ref = useRef(session);
  ref.current = session;

  // 로그인된 회원 세션을 앱에 반영: 계정 저장소 준비 + (동의 기록이 이 기기에 있으면) 서버에 가입 동의 기록
  const applyUser = useCallback((sess) => {
    prepareAccount(sess);
    store.set(SESSION_KEY, supabaseEnabled ? null : sess);
    setSession((prev) => (prev?.type === "user" && prev.id === sess.id && prev.name === sess.name ? prev : sess));
    const consent = store.get(CONSENT_KEY, null);
    if (supabaseEnabled && consent?.at) auth.recordConsent(sess.id, consent).catch(() => {});
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive && data?.session?.user) applyUser(sessionOf(data.session.user)); }).catch(() => {}).finally(() => { if (alive) setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") { if (ref.current?.type === "user") setSession(null); }
      else if (s?.user) applyUser(sessionOf(s.user));
    });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, [applyUser]);

  const signIn = useCallback((sess) => { if (sess.type === "user") applyUser(sess); else { prepareAccount(sess); store.set(SESSION_KEY, sess); setSession(sess); } }, [applyUser]);
  const signOut = useCallback(async () => {
    if (ref.current?.type === "user") await auth.signOut().catch(() => {});
    store.set(SESSION_KEY, null); setSession(null);
  }, []);
  // 회원 탈퇴: 서버의 계정·데이터 삭제 → 이 기기의 계정 데이터 삭제 → 로그아웃. 실패하면 오류를 그대로 던진다
  const deleteAccount = useCallback(async () => {
    const uid = uidOf(ref.current);
    await auth.deleteAccount();
    clearAccountData(uid);
    store.set(SESSION_KEY, null); setSession(null);
  }, []);
  const finishRecovery = useCallback(() => setRecovery(false), []);
  const value = useMemo(() => ({ session, uid: uidOf(session), isGuest: session?.type === "guest", ready, recovery, finishRecovery, signIn, signOut, deleteAccount }), [session, ready, recovery, finishRecovery, signIn, signOut, deleteAccount]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth 는 <AuthProvider> 안에서만 사용할 수 있어요.");
  return ctx;
}
