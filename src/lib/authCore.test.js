import { describe, expect, it } from "vitest";
import { AUTH_ERROR_DEFAULT } from "@/constants/auth";
import { authErrorText, demoAuth, makeAuth, sessionOf } from "@/lib/authCore";

// 호출을 기록하고 정해 둔 응답을 돌려주는 가짜 Supabase 클라이언트
const fake = (res = {}) => {
  const calls = [];
  const rec = (name) => async (...a) => { calls.push([name, ...a]); return res[name] ?? { data: {}, error: null }; };
  return {
    calls,
    auth: { signUp: rec("signUp"), signInWithPassword: rec("signIn"), signInWithOAuth: rec("oauth"), resetPasswordForEmail: rec("reset"), updateUser: rec("update"), signOut: rec("signOut") },
    rpc: rec("rpc"),
    from: (t) => ({ upsert: rec(`upsert:${t}`) }),
  };
};

describe("authErrorText", () => {
  it("서버 오류를 한국어로 바꾼다", () => {
    expect(authErrorText({ code: "invalid_credentials" })).toContain("맞지 않아요");
    expect(authErrorText({ message: "Invalid login credentials" })).toContain("맞지 않아요");
    expect(authErrorText({ code: "user_already_exists" })).toContain("이미 가입");
    expect(authErrorText({ message: "Email not confirmed" })).toContain("인증");
    expect(authErrorText({ code: "over_email_send_rate_limit" })).toContain("잠시 후");
    expect(authErrorText({ message: "Failed to fetch" })).toContain("네트워크");
  });
  it("모르는 오류는 기본 문구", () => {
    expect(authErrorText({ message: "???" })).toBe(AUTH_ERROR_DEFAULT);
    expect(authErrorText(null)).toBe(AUTH_ERROR_DEFAULT);
  });
});

describe("sessionOf", () => {
  it("이름 → 전체 이름 → 이메일 앞부분 순으로 표시 이름을 정한다", () => {
    expect(sessionOf({ id: "u", email: "a@x.com", app_metadata: { provider: "kakao" }, user_metadata: { name: "에이" } })).toEqual({ type: "user", id: "u", provider: "kakao", name: "에이", email: "a@x.com" });
    expect(sessionOf({ id: "u", email: "a@x.com", user_metadata: { full_name: "Full" } }).name).toBe("Full");
    expect(sessionOf({ id: "u", email: "abc@x.com" })).toMatchObject({ name: "abc", provider: "email" });
  });
  it("사용자가 없으면 null 계열", () => {
    expect(sessionOf(null)).toBeFalsy();
  });
});

describe("makeAuth", () => {
  const ORIGIN = "https://clacale.vercel.app";
  it("가입: 세션이 없으면 메일 인증이 필요한 상태", async () => {
    const c = fake({ signUp: { data: { user: { identities: [{}] }, session: null }, error: null } });
    expect(await makeAuth(c, ORIGIN).signUp("a@x.com", "123456")).toEqual({ status: "confirm" });
    expect(c.calls[0]).toEqual(["signUp", { email: "a@x.com", password: "123456", options: { emailRedirectTo: ORIGIN } }]);
  });
  it("가입: 세션이 바로 오면(메일 인증 끔) 로그인 상태", async () => {
    const c = fake({ signUp: { data: { user: { identities: [{}] }, session: { access_token: "t" } }, error: null } });
    expect(await makeAuth(c).signUp("a@x.com", "123456")).toEqual({ status: "signedIn" });
  });
  it("가입: 이미 가입된 이메일(identities 가 빔)은 오류", async () => {
    const c = fake({ signUp: { data: { user: { identities: [] }, session: null }, error: null } });
    await expect(makeAuth(c).signUp("a@x.com", "123456")).rejects.toMatchObject({ code: "user_already_exists" });
  });
  it("서버 오류는 그대로 던진다", async () => {
    const c = fake({ signIn: { data: {}, error: { code: "invalid_credentials", message: "Invalid login credentials" } } });
    await expect(makeAuth(c).signIn("a@x.com", "x")).rejects.toMatchObject({ code: "invalid_credentials" });
  });
  it("소셜 로그인은 돌아올 주소를 함께 보낸다", async () => {
    const c = fake();
    expect(await makeAuth(c, ORIGIN).oauth("kakao")).toEqual({ status: "redirect" });
    expect(c.calls[0]).toEqual(["oauth", { provider: "kakao", options: { redirectTo: ORIGIN } }]);
  });
  it("비밀번호 재설정 메일 / 새 비밀번호", async () => {
    const c = fake();
    const a = makeAuth(c, ORIGIN);
    await a.resetPassword("a@x.com"); await a.updatePassword("newpass1");
    expect(c.calls[0]).toEqual(["reset", "a@x.com", { redirectTo: ORIGIN }]);
    expect(c.calls[1]).toEqual(["update", { password: "newpass1" }]);
  });
  it("탈퇴: 서버 함수 호출 뒤 이 기기에서만 로그아웃", async () => {
    const c = fake();
    await makeAuth(c).deleteAccount();
    expect(c.calls).toEqual([["rpc", "delete_my_account"], ["signOut", { scope: "local" }]]);
  });
  it("탈퇴 실패는 던진다(기기 데이터를 지우지 않도록)", async () => {
    const c = fake({ rpc: { data: null, error: { message: "boom" } } });
    await expect(makeAuth(c).deleteAccount()).rejects.toMatchObject({ message: "boom" });
    expect(c.calls.some((x) => x[0] === "signOut")).toBe(false);
  });
  it("가입 동의 기록은 이미 있으면 그대로 둔다", async () => {
    const c = fake();
    await makeAuth(c).recordConsent("u1", { version: 1, at: "2026-11-26T00:00:00.000Z" });
    expect(c.calls[0]).toEqual(["upsert:consents", { user_id: "u1", version: 1, age_ok: true, terms_ok: true, agreed_at: "2026-11-26T00:00:00.000Z" }, { onConflict: "user_id,version", ignoreDuplicates: true }]);
  });
});

describe("demoAuth", () => {
  it("데모 계정 세션을 바로 돌려준다", async () => {
    expect((await demoAuth.signIn("a@x.com")).session).toMatchObject({ type: "user", provider: "email" });
    expect((await demoAuth.oauth("kakao")).session.name).toContain("카카오");
  });
});
