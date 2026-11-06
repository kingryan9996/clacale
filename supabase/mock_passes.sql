-- 목업: 이미 만료/소진된 이용권 5개 (브랜드·종류 혼합). 첫 번째 가입 사용자에게 넣습니다.
-- 만료된 이용권만 넣으므로 "이용중 이용권이 있으면 신규 등록 불가" 트리거에 걸리지 않습니다.
insert into public.passes (user_id, brand_id, kind, days, total, remaining, valid_days, start_on, expires_on, ended_on)
select u.id, v.brand_id, v.kind, v.days, v.total, v.remaining, v.valid_days, v.start_on, v.expires_on, v.ended_on
from (select id from auth.users order by created_at limit 1) u,
(values
  ('stones', 'period', 180, null, null, null, current_date - 297, current_date - 297 + 179, null),
  ('park', 'count', null, 30, 0, 365, current_date - 196, current_date - 196 + 364, current_date - 196 + 97),
  ('son', 'period', 180, null, null, null, current_date - 236, current_date - 236 + 179, null),
  ('ficus', 'period', 90, null, null, null, current_date - 191, current_date - 191 + 89, null),
  ('climb', 'count', null, 5, 0, 180, current_date - 151, current_date - 151 + 179, current_date - 151 + 75)
) as v(brand_id, kind, days, total, remaining, valid_days, start_on, expires_on, ended_on);
