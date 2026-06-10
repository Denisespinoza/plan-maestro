-- Full personal module schema fix: applies all pending changes from migration 015
-- in an idempotent way, plus ensures anon RLS policies are present.
-- Run this in Supabase SQL Editor if migrations 015–016 were not applied.

-- 1. employees: add hourly_rate and payment_type if missing
alter table public.employees
  add column if not exists hourly_rate numeric(12,2) not null default 0,
  add column if not exists payment_type text not null default 'mensual';

update public.employees
set
  hourly_rate = case
    when upper(name) like '%ANA%' and coalesce(hourly_rate, 0) = 0 then 5072.46
    else hourly_rate
  end,
  payment_type = case
    when upper(name) like '%ANA%' then 'por_hora'
    else coalesce(payment_type, 'mensual')
  end,
  position = case
    when upper(name) like '%ANA%' and coalesce(position, '') = '' then 'ASISTENTE'
    else position
  end;

-- 2. employee_attendance: add new shift columns if missing
alter table public.employee_attendance
  add column if not exists work_date date,
  add column if not exists morning_start time null,
  add column if not exists morning_end time null,
  add column if not exists afternoon_start time null,
  add column if not exists afternoon_end time null,
  add column if not exists morning_minutes integer not null default 0,
  add column if not exists afternoon_minutes integer not null default 0,
  add column if not exists total_minutes integer not null default 0,
  add column if not exists hourly_rate numeric(12,2) not null default 0,
  add column if not exists total_amount numeric(12,2) not null default 0,
  add column if not exists notes text null;

-- backfill work_date from legacy date column where present
update public.employee_attendance
set work_date = coalesce(work_date, date, current_date)
where work_date is null;

-- make work_date not null
alter table public.employee_attendance
  alter column work_date set not null,
  alter column work_date set default current_date;

-- unique index for upsert conflict resolution
create unique index if not exists idx_employee_attendance_employee_work_date
on public.employee_attendance(employee_id, work_date);

create index if not exists idx_employee_attendance_employee_id
on public.employee_attendance(employee_id);

create index if not exists idx_employee_attendance_work_date
on public.employee_attendance(work_date);

-- 3. employee_payments: add payment_date and payment_method if missing
alter table public.employee_payments
  add column if not exists payment_date date,
  add column if not exists payment_method text null;

update public.employee_payments
set
  payment_date = coalesce(payment_date, date, current_date),
  payment_method = coalesce(payment_method, 'efectivo')
where payment_date is null or payment_method is null;

alter table public.employee_payments
  alter column payment_date set not null,
  alter column payment_date set default current_date,
  alter column payment_method set not null,
  alter column payment_method set default 'efectivo';

create index if not exists idx_employee_payments_employee_id
on public.employee_payments(employee_id);

create index if not exists idx_employee_payments_payment_date
on public.employee_payments(payment_date);

-- 4. RLS: ensure anon has full access to both tables
alter table public.employee_attendance enable row level security;
alter table public.employee_payments enable row level security;

-- employee_attendance anon policies
drop policy if exists "Anon can read employee_attendance" on public.employee_attendance;
drop policy if exists "Anon can insert employee_attendance" on public.employee_attendance;
drop policy if exists "Anon can update employee_attendance" on public.employee_attendance;
drop policy if exists "Anon can delete employee_attendance" on public.employee_attendance;

create policy "Anon can read employee_attendance"
on public.employee_attendance for select to anon using (true);

create policy "Anon can insert employee_attendance"
on public.employee_attendance for insert to anon with check (true);

create policy "Anon can update employee_attendance"
on public.employee_attendance for update to anon using (true) with check (true);

create policy "Anon can delete employee_attendance"
on public.employee_attendance for delete to anon using (true);

-- employee_payments anon policies
drop policy if exists "Anon can read employee_payments" on public.employee_payments;
drop policy if exists "Anon can insert employee_payments" on public.employee_payments;
drop policy if exists "Anon can update employee_payments" on public.employee_payments;
drop policy if exists "Anon can delete employee_payments" on public.employee_payments;

create policy "Anon can read employee_payments"
on public.employee_payments for select to anon using (true);

create policy "Anon can insert employee_payments"
on public.employee_payments for insert to anon with check (true);

create policy "Anon can update employee_payments"
on public.employee_payments for update to anon using (true) with check (true);

create policy "Anon can delete employee_payments"
on public.employee_payments for delete to anon using (true);

notify pgrst, 'reload schema';
