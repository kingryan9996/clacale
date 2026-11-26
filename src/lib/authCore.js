import { AUTH_ERRORS, AUTH_ERROR_DEFAULT } from "@/constants/auth";

/* ---------- 인증 로직(클라이언트 주입식: 테스트에서는 가짜 클라이언트, 실제에서는 Supabase) ---------- */

// 서버 오류 → 한국어 안내
export const authErrorText = (e) => {
  const s = `${e?.code ?? ""} ${e?.message ?? ""}`;
  for (const [re, text] of AUTH_ERRORS) if (re.test(s)) return text;
  return AUTH_ERROR_DEFAULT;
};

// Supabase user → 앱 세션 { type: "user", id, provider, name, email }
export const sessionOf = (user) => user && {
  type: "user",
  id: user.id,
  provider: user.app_metadata?.provider ?? "email",
  name: user.user_metadata?.name || user.user_metadata?.full_name || (user.email ?? "").split("@")[0] || "회원",
  email: user.email ?? "",
};

const ok = (r) => { if (r?.error) throw r.error; return r; };

/* 실제 인증(Supabase). 로그인 결과 세션은 onAuthStateChange 로 들어오므로 여기서는 세션을 돌려주지 않는다 */
export const makeAuth = (client, origin = "") => ({
  async signUp(email, password) {
    const { data } = ok(await client.auth.signUp({ email, password, options: { emailRedirectTo: origin } }));
    // 이미 가입된 이메일은 (메일 인증을 켠 경우) 오류 없이 identities 가 빈 사용자로 돌아온다
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw { code: "user_already_exists" };
    return { status: data?.session ? "signedIn" : "confirm" };
  },
  async signIn(email, password) { ok(await client.auth.signInWithPassword({ email, password })); return { status: "signedIn" }; },
  async oauth(provider) { ok(await client.auth.signInWithOAuth({ provider, options: { redirectTo: origin } })); return { status: "redirect" }; },
  async resetPassword(email) { ok(await client.auth.resetPasswordForEmail(email, { redirectTo: origin })); return { status: "sent" }; },
  async updatePassword(password) { ok(await client.auth.updateUser({ password })); return { status: "updated" }; },
  async signOut() { await client.auth.signOut(); },
  // 서버의 delete_my_account() 가 계정과 모든 데이터를 지운다. 계정이 사라진 뒤 로그아웃은 이 기기에서만 처리
  async deleteAccount() { ok(await client.rpc("delete_my_account")); await client.auth.signOut({ scope: "local" }).catch(() => {}); },
  // 가입 동의 기록을 서버에 남긴다(이미 있으면 그대로 둔다)
  async recordConsent(userId, c) {
    ok(await client.from("consents").upsert({ user_id: userId, version: c.version, age_ok: true, terms_ok: true, agreed_at: c.at }, { onConflict: "user_id,version", ignoreDuplicates: true }));
  },
});

/* 서버 설정이 없을 때(미리보기·로컬 개발): 데모 계정. 세션을 직접 돌려준다 */
export const demoAuth = {
  async signUp(email) { return { status: "signedIn", session: { type: "user", id: `email-${email}`, provider: "email", name: email, email } }; },
  async signIn(email) { return { status: "signedIn", session: { type: "user", id: `email-${email}`, provider: "email", name: email, email } }; },
  async oauth(provider) { return { status: "signedIn", session: { type: "user", id: `${provider}-demo`, provider, name: provider === "kakao" ? "카카오 데모 계정" : "Google 데모 계정", email: "" } }; },
  async resetPassword() { return { status: "sent" }; },
  async updatePassword() { return { status: "updated" }; },
  async signOut() {},
  async deleteAccount() {},
  async recordConsent() {},
};
