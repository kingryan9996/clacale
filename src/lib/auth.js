import { demoAuth, makeAuth } from "@/lib/authCore";
import { supabase, supabaseEnabled } from "@/lib/supabase";

/* 앱이 쓰는 인증 객체: 서버 설정이 있으면 Supabase, 없으면 데모 */
export { authErrorText, sessionOf } from "@/lib/authCore";
export { supabaseEnabled };
export const auth = supabaseEnabled ? makeAuth(supabase, window.location.origin) : demoAuth;
