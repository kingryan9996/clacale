import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { prepareAccount, uidOf } from "@/lib/account";
import { store } from "@/lib/store";

const AuthContext = createContext(null);
const SESSION_KEY = "clacale:session";

/* 전역 세션: null | { type: "guest" } | { type: "user", id, provider, name }
   페이지/컴포넌트는 session·signIn·signOut 을 prop 으로 받지 않고 useAuth() 로 직접 참조한다. */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => store.get(SESSION_KEY, null));
  const signIn = useCallback((sess) => { prepareAccount(sess); store.set(SESSION_KEY, sess); setSession(sess); }, []);
  const signOut = useCallback(() => { store.set(SESSION_KEY, null); setSession(null); }, []);
  const value = useMemo(() => ({ session, uid: uidOf(session), isGuest: session?.type === "guest", signIn, signOut }), [session, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth 는 <AuthProvider> 안에서만 사용할 수 있어요.");
  return ctx;
}
