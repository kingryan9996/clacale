-- ============================================================================
-- 혼잡도 집계 (schema.sql 을 먼저 실행한 뒤, 혼잡도를 붙일 때 실행)
-- 일정(schedules) 전체에서 "날짜 × 암장 × 3시간 구간" 방문 예정 인원을 다시 계산해 gym_daily_stats 에 둔다.
-- 클라이언트가 숫자를 직접 올리고 내리지 못하게 하고(조작 방지), 계산은 서버 함수만 한다.
-- time_slot = (시작+종료)/2 가 속한 3시간 구간의 시작 시각 (13:00~17:00 → 중간 15:00 → 15:00) — 앱의 lib/crowd.js slotOf 와 같다.
-- ============================================================================

create table public.gym_daily_stats (
  date        date not null,
  gym_id      text not null,
  time_slot   time not null,
  visit_count int  not null check (visit_count >= 0),
  primary key (date, gym_id, time_slot)
);
alter table public.gym_daily_stats enable row level security;   -- 정책 없음 = 직접 조회·쓰기 불가 (아래 함수로만 접근)

-- p_from ~ p_to(최대 400일) 구간을 일정 전체에서 다시 계산. 반복 일정은 발생일로 펼친다. 예약 실행용(클라이언트 호출 불가)
create or replace function public.rebuild_gym_stats(p_from date, p_to date) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_to - p_from > 400 then raise exception 'range too long'; end if;
  delete from public.gym_daily_stats where date between p_from and p_to;
  insert into public.gym_daily_stats (date, gym_id, time_slot, visit_count)
  select d::date, s.gym_id,
         make_time((floor(extract(hour from (s.start_at + (s.end_at - s.start_at) / 2)) / 3) * 3)::int, 0, 0),
         count(*)::int
    from public.schedules s
   cross join lateral generate_series(greatest(s.start_at::date, p_from)::timestamp, p_to::timestamp, interval '1 day') d
   where d::date >= s.start_at::date
     and (s.until_on is null or d::date <= s.until_on)
     and not (d::date = any (s.except_on))
     and case s.repeat_kind
           when 'none'    then d::date = s.start_at::date
           when 'daily'   then true
           when 'weekly'  then (d::date - s.start_at::date) % 7 = 0
           when 'monthly' then extract(day from d) = extract(day from s.start_at)
           when 'yearly'  then extract(month from d) = extract(month from s.start_at) and extract(day from d) = extract(day from s.start_at)
         end
   group by 1, 2, 3;
end $$;
revoke execute on function public.rebuild_gym_stats(date, date) from public, anon, authenticated;

-- 앱이 부르는 조회: 구간별 인원. p_min(기본 20, 앱의 CROWD_MIN_DISPLAY) 미만은 정확한 숫자를 내보내지 않고 0 으로 가린다.
-- 마지막에 하루 합계 행(time_slot = null)을 함께 준다.
create or replace function public.get_gym_crowd(p_date date, p_gym text, p_min int default 20)
returns table (time_slot time, visit_count int) language sql stable security definer set search_path = public as $$
  select g.time_slot, case when g.visit_count < p_min then 0 else g.visit_count end
    from public.gym_daily_stats g where g.date = p_date and g.gym_id = p_gym
  union all
  select null::time, case when coalesce(sum(g.visit_count), 0) < p_min then 0 else sum(g.visit_count)::int end
    from public.gym_daily_stats g where g.date = p_date and g.gym_id = p_gym;
$$;
grant execute on function public.get_gym_crowd(date, text, int) to anon, authenticated;

-- (선택) 매시 정각에 오늘-7일 ~ 오늘+90일 다시 계산 (pg_cron 을 켠 뒤 실행). 지난 집계는 3개월 뒤 정리
-- select cron.schedule('clacale-crowd', '0 * * * *', $$select public.rebuild_gym_stats(current_date - 7, current_date + 90)$$);
-- select cron.schedule('clacale-crowd-prune', '10 18 * * *', $$delete from public.gym_daily_stats where date < current_date - 92$$);
