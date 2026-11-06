-- 클라캘 사용자 데이터 + 암장 혼잡도 집계 (Supabase / Postgres)
-- 공식 암장·지점은 src/constants/gyms.js 의 정적 데이터를 참조하므로 테이블이 없습니다.

create table public.favorite_centers (
  user_id  uuid not null references auth.users on delete cascade,
  brand_id text not null,
  primary key (user_id, brand_id)
);

create table public.custom_gyms (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  name         text not null,
  max_capacity int  not null default 100
);

create table public.schedules (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users on delete cascade,
  gym_id    text not null,                      -- constants/gyms.js 의 id 또는 custom_gyms.id
  start_at  timestamptz not null,
  end_at    timestamptz not null,
  travel_min int  not null default 0,
  memo      text not null default '',
  repeat    text not null default 'none' check (repeat in ('none','daily','weekly','monthly','yearly')),
  alerts    int[] not null default '{}',        -- 분 단위 (5, 60, 1440 ...)
  until     date,                                -- "이후 일정 모두 삭제" 시 마지막 발생일
  ex        date[] not null default '{}',        -- "이 일정만 삭제"로 제외된 날짜
  created_at timestamptz not null default now(),
  check (end_at >= start_at)
);

-- 날짜 x 암장 x 시간대 별 방문 예정 인원. time_slot = (시작+종료)/2 의 정시 (13:00~17:00 -> 15:00)
create table public.gym_daily_stats (
  date         date not null,
  gym_id       text not null,
  time_slot    time not null,
  visit_count  int  not null default 0 check (visit_count >= 0),
  max_capacity int  not null default 100,
  primary key (date, gym_id, time_slot)
);

alter table public.favorite_centers enable row level security;
alter table public.custom_gyms      enable row level security;
alter table public.schedules        enable row level security;
alter table public.gym_daily_stats  enable row level security;

create policy "own rows" on public.favorite_centers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.custom_gyms      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.schedules        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- 통계는 누구나 조회, 쓰기는 아래 함수로만
create policy "read stats" on public.gym_daily_stats for select using (true);

-- 일정 등록(+1)/삭제(-1) 시 호출. 반복 일정은 발생일마다 호출하거나 서버 작업으로 펼쳐서 집계하세요.
create or replace function public.adjust_visit(p_date date, p_gym text, p_slot time, p_delta int)
returns void language sql security definer set search_path = public as $$
  insert into public.gym_daily_stats (date, gym_id, time_slot, visit_count)
  values (p_date, p_gym, p_slot, greatest(p_delta, 0))
  on conflict (date, gym_id, time_slot)
  do update set visit_count = greatest(public.gym_daily_stats.visit_count + p_delta, 0);
$$;

-- 이용권 (브랜드 단위). 기간권은 expires_on 보유, 횟수권은 total/remaining 보유
create table public.passes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  brand_id    text not null,                                  -- constants/gyms.js 의 BRANDS.id
  kind        text not null check (kind in ('period','count')),
  days        int  check (days in (30, 90, 180, 365)),        -- 기간권
  total       int  check (total in (5, 10, 30)),              -- 횟수권
  remaining   int,
  valid_days  int check (valid_days in (180, 365)),            -- 횟수권 유효기간 (5회: 180일 / 10·30회: 365일 기본)
  ended_on    date,                                           -- 횟수 소진일
  start_on    date,                                           -- null = 사용대기 (사용 시작일 지정 전)
  expires_on  date,                                           -- 기간권: 정지 일수만큼 자동 연장
  pause_from  date,
  pause_to    date,
  pause_count int not null default 0,                         -- 기간권 정지 횟수 이력 (시작 전 취소는 제외)
  check (pause_from is null or (pause_to >= pause_from and pause_to - pause_from < 15)),  -- 정지 최대 15일
  check ((kind = 'period' and days is not null) or (kind = 'count' and total is not null))
);
alter table public.passes enable row level security;
create policy "own rows" on public.passes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 같은 브랜드에 이용중(만료/소진 전)인 이용권이 있으면 새 이용권 등록 불가
create or replace function public.enforce_pass_limit() returns trigger language plpgsql as $$
begin
  if exists (select 1 from public.passes p
              where p.user_id = new.user_id and p.brand_id = new.brand_id and p.id <> new.id
                and p.start_on is not null
                and (p.expires_on is null or p.expires_on >= current_date)
                and (p.kind = 'period' or coalesce(p.remaining, 0) > 0))
     and new.start_on is not null and (new.expires_on is null or new.expires_on >= current_date)
     and (new.kind = 'period' or coalesce(new.remaining, 0) > 0)
  then raise exception '이용 중인 이용권이 있는 브랜드는 새 이용권을 등록할 수 없어요.';
  end if;
  return new;
end $$;
drop trigger if exists passes_limit on public.passes;
create trigger passes_limit before insert on public.passes for each row execute function public.enforce_pass_limit();

-- 횟수권 자동 차감: 지난 일정 1건당 1회. (schedule_id, occurrence_date) 로 중복 차감 방지
create table public.pass_usages (
  pass_id         uuid not null references public.passes on delete cascade,
  schedule_id     uuid not null references public.schedules on delete cascade,
  occurrence_date date not null,
  primary key (pass_id, schedule_id, occurrence_date)
);
alter table public.pass_usages enable row level security;
create policy "own rows" on public.pass_usages for all
  using (exists (select 1 from public.passes p where p.id = pass_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.passes p where p.id = pass_id and p.user_id = auth.uid()));

-- 매일 00:05(KST) pg_cron 등으로 실행: 어제까지의 일정을 같은 브랜드의 이용중 횟수권에서 1회씩 차감 (반복 일정은 발생일로 펼친 뒤 삽입)
create or replace function public.settle_count_pass(p_pass uuid, p_schedule uuid, p_date date)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.pass_usages (pass_id, schedule_id, occurrence_date) values (p_pass, p_schedule, p_date) on conflict do nothing;
  if found then
    update public.passes set remaining = remaining - 1, ended_on = case when remaining - 1 <= 0 then p_date + 1 else ended_on end
     where id = p_pass and remaining > 0;
  end if;
end $$;
