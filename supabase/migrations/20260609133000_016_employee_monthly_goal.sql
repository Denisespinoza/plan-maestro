-- Personal module: monthly goal shown in profile instead of exposing hourly rate.

alter table public.employees
  add column if not exists monthly_goal numeric(12,2) not null default 0;

update public.employees
set monthly_goal = 700000
where upper(name) like '%ANA%'
  and coalesce(monthly_goal, 0) = 0;

notify pgrst, 'reload schema';
