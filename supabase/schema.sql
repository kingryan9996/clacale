-- ============================================================================
-- 클라캘 서버 DB (Supabase / Postgres) — 핵심 테이블
-- 실행: Supabase 대시보드 → SQL Editor → New query → 이 파일 전체를 붙여 넣고 Run (한 번만).
-- 혼잡도 집계는 crowd.sql 로 분리했습니다(혼잡도를 붙일 때 실행).
-- 앱의 데이터 모양(src/lib/*.js)과 1:1 로 맞춘 구조이며, 모든 테이블은 RLS 로 "내 행만" 접근할 수 있습니다.
-- 공식 암장·지점은 src/constants/gyms.js 의 정적 데이터를 참조하므로 테이블이 없습니다.
-- 일정의 날짜·시각은 "한국 시각 그대로(timestamp, 시간대 없음)" 로 저장합니다(앱의 'YYYY-MM-DDTHH:mm' 문자열과 같음).
-- ============================================================================

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- 프로필 (게시판 닉네임 등 공개 정보) ----------
create table public.profiles (
  user_id    uuid primary key references auth.users on delete cascade,
  nickname   text not null default '' check (char_length(nickname) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles readable by members" on public.profiles for select to authenticated using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- 가입하면 프로필 자동 생성 (소셜 로그인의 이름 → 없으면 이메일 앞부분)
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, nickname)
  values (new.id, left(coalesce(nullif(new.raw_user_meta_data->>'name', ''), nullif(new.raw_user_meta_data->>'full_name', ''), split_part(coalesce(new.email, ''), '@', 1), ''), 20))
  on conflict (user_id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- 가입 동의 기록 (연령 확인 + 이용약관·개인정보처리방침; 문서 버전 = constants/consent.js 의 CONSENT_VERSION) ----------
create table public.consents (
  user_id   uuid not null references auth.users on delete cascade,
  version   int  not null,
  age_ok    boolean not null check (age_ok),
  terms_ok  boolean not null check (terms_ok),
  agreed_at timestamptz not null default now(),
  primary key (user_id, version)
);
alter table public.consents enable row level security;
create policy "own consents read" on public.consents for select to authenticated using (auth.uid() = user_id);
create policy "own consents insert" on public.consents for insert to authenticated with check (auth.uid() = user_id);

-- ---------- 즐겨찾기 센터 (앱의 "b:브랜드id" 키에서 브랜드id 만 저장) ----------
create table public.favorite_centers (
  user_id  uuid not null references auth.users on delete cascade,
  brand_id text not null check (char_length(brand_id) <= 40),
  primary key (user_id, brand_id)
);
alter table public.favorite_centers enable row level security;
create policy "own rows" on public.favorite_centers for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- 일정 ----------
-- id 는 앱이 만든 UUID 를 그대로 쓴다(upsert). 반복 일정은 한 행 + 반복 규칙으로 저장하고 화면에서 펼친다.
-- 보관: 지난 일정은 3개월까지만(아래 prune_old_data), 앞으로의 일정은 모두 (constants/legal.js 의 RETENTION.pastScheduleMonths 와 같은 값)
create table public.schedules (
  id          uuid primary key,
  user_id     uuid not null references auth.users on delete cascade,
  brand_id    text not null check (char_length(brand_id) <= 40),
  place       text not null check (char_length(place) between 1 and 100),   -- 예: "더클라임 강남"
  gym_id      text not null check (char_length(gym_id) <= 100),            -- 혼잡도 집계용: "brand" 또는 "brand:지점" (앱의 gymIdOf)
  start_at    timestamp not null,
  end_at      timestamp not null,
  travel_min  int  not null default 0 check (travel_min between 0 and 600),
  memo        text not null default '' check (char_length(memo) <= 2000),
  repeat_kind text not null default 'none' check (repeat_kind in ('none','daily','weekly','monthly','yearly')),
  alerts      int[] not null default '{}',                                  -- 분 단위 (5, 60, 1440 ...)
  until_on    date,                                                         -- "이후 일정 모두 삭제/수정" 시 마지막 발생일
  except_on   date[] not null default '{}',                                 -- "이 일정만 삭제/수정"으로 제외된 날짜
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_at >= start_at)
);
create index schedules_user_start on public.schedules (user_id, start_at);
alter table public.schedules enable row level security;
create policy "own rows" on public.schedules for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger schedules_updated before update on public.schedules for each row execute function public.set_updated_at();

-- ---------- 이용권 (브랜드 단위) ----------
-- 값은 모두 사용자가 자유롭게 입력·수정·삭제한다(프리셋은 입력 편의일 뿐). 같은 브랜드·종류의 이용권이 여러 개여도 막지 않는다.
-- 기간권: days + pauses(정지 이력). 횟수권: total / remaining / valid_days.
-- expires_on = start_on + days(또는 valid_days) - 1 + 정지 일수 합계 + bonus_days  (앱의 lib/passes.js computeExpires 와 같은 식; 서버에는 앱이 계산한 값을 저장)
-- pauses: [{ "id": "...", "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }, ...]  (횟수·일수 제한 없음, 지난 정지도 가능)
-- used_keys: 횟수권 자동 차감 내역 "일정id|YYYY-MM-DD" (중복 차감 방지). 끝난 지 1년이 지나면 비운다(prune_old_data).
-- 보관: 이용권 요약은 사용자가 삭제/탈퇴할 때까지 (constants/legal.js 의 RETENTION.passDetailAfterEndYears 와 같은 값으로 세부 기록만 정리)
create table public.passes (
  id           uuid primary key,
  user_id      uuid not null references auth.users on delete cascade,
  brand_id     text not null check (char_length(brand_id) <= 40),
  kind         text not null check (kind in ('period','count')),
  days         int  check (days between 1 and 3650),
  total        int  check (total between 1 and 999),
  remaining    int,
  valid_days   int  check (valid_days between 1 and 3650),
  bonus_days   int  not null default 0 check (bonus_days between -3650 and 3650),
  start_on     date,                                   -- null = 사용대기 (사용 시작일 지정 전)
  expires_on   date,
  ended_on     date,                                   -- 횟수 소진일
  counted_from timestamp,                              -- 횟수를 직접 고친 시각: 이 시각 이후 시작하는 일정만 자동 차감 (이중 차감 방지)
  pauses       jsonb not null default '[]' check (jsonb_typeof(pauses) = 'array'),
  used_keys    text[] not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check ((kind = 'period' and days is not null) or (kind = 'count' and total is not null and remaining is not null and remaining between 0 and total))
);
create index passes_user on public.passes (user_id);
alter table public.passes enable row level security;
create policy "own rows" on public.passes for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger passes_updated before update on public.passes for each row execute function public.set_updated_at();

-- ---------- 보관 기간 정리 (매일 한 번 실행: 맨 아래 예약 참고) ----------
create or replace function public.prune_old_data() returns void language plpgsql security definer set search_path = public as $$
begin
  -- 지난 일정: 3개월이 지난 일정 삭제 (반복 일정은 종료일이 있고 그것이 3개월 전일 때만)
  delete from public.schedules
   where (repeat_kind = 'none' and end_at < now() - interval '3 months')
      or (repeat_kind <> 'none' and until_on is not null and until_on < (now() - interval '3 months')::date);
  -- 끝난 지 1년이 지난 이용권: 차감 내역만 비우고 이용권 요약은 남긴다
  update public.passes set used_keys = '{}'
   where used_keys <> '{}'
     and (case when kind = 'count' and remaining <= 0 then coalesce(ended_on, expires_on) else expires_on end) < current_date - interval '1 year';
end $$;
revoke execute on function public.prune_old_data() from public, anon, authenticated;

-- ---------- 회원 탈퇴: 내 계정과 모든 데이터를 즉시 삭제 (연결된 테이블은 on delete cascade) ----------
create or replace function public.delete_my_account() returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------- (선택) 매일 03:00(KST) = 18:00(UTC) 정리 예약: 대시보드 Database → Extensions 에서 pg_cron 을 켠 뒤 실행 ----------
-- select cron.schedule('clacale-prune', '0 18 * * *', $$select public.prune_old_data()$$);
