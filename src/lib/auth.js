/* ---------- 인증 스텁: 미리보기에서는 실제 서버에 연결되지 않고 데모 계정으로 로그인됩니다 ---------- */
export const auth = {
  // Supabase 연동 시: supabase.auth.signInWithOAuth({ provider: "kakao" | "google" })
  async oauth(provider) { return { type: "user", id: `${provider}-demo`, provider, name: provider === "kakao" ? "카카오 데모 계정" : "Google 데모 계정" }; },
  // Supabase 연동 시: supabase.auth.signInWithPassword / signUp
  async email(email) { return { type: "user", id: `email-${email}`, provider: "email", name: email }; },
};
