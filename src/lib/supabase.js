import { createClient } from "@supabase/supabase-js";

/* Supabase 클라이언트: 환경변수(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)가 있을 때만 만든다.
   없으면 null → 앱은 기기 저장 + 데모 로그인으로 동작한다(미리보기·로컬 개발). anon 키는 공개용이며 데이터 보호는 DB 의 RLS 가 맡는다 */
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(url && key);
export const supabase = supabaseEnabled ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
