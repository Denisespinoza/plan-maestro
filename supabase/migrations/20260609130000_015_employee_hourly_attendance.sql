-- Personal module: hourly employees, two daily shifts, monthly payments.
-- Keeps legacy columns (date/payment_type) where they already exist, while adding
-- the explicit fields used by the updated frontend.

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

create table if not exists public.employee_attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  date date not null default current_date,
  created_at timestamptz default now()
);

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
  add column if not exists notes text null,
  add column if not exists updated_at timestamptz not null default now();

update public.employee_attendance
set work_date = coalesce(work_date, date, current_date)
where work_date is null;

alter table public.employee_attendance
  alter column work_date set not null;

create index if not exists idx_employee_attendance_employee_id
on public.employee_attendance(employee_id);

create index if not exists idx_employee_attendance_work_date
on public.employee_attendance(work_date);

create unique index if not exists idx_employee_attendance_employee_work_date
on public.employee_attendance(employee_id, work_date);

create table if not exists public.employee_payments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  date date not null default current_date,
  amount numeric not null default 0,
  notes text default '',
  created_at timestamptz default now()
);

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
  alter column payment_method set default 'efectivo';

create index if not exists idx_employee_payments_employee_id
on public.employee_payments(employee_id);

create index if not exists idx_employee_payments_payment_date
on public.employee_payments(payment_date);

alter table public.employee_attendance enable row level security;
alter table public.employee_payments enable row level security;

drop policy if exists "Authenticated users can read employee attendance" on public.employee_attendance;
drop policy if exists "Authenticated users can insert employee attendance" on public.employee_attendance;
drop policy if exists "Authenticated users can update employee attendance" on public.employee_attendance;
drop policy if exists "Authenticated users can delete employee attendance" on public.employee_attendance;

create policy "Authenticated users can read employee attendance"
on public.employee_attendance
for select
to authenticated
using (true);

create policy "Authenticated users can insert employee attendance"
on public.employee_attendance
for insert
to authenticated
with check (true);

create policy "Authenticated users can update employee attendance"
on public.employee_attendance
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete employee attendance"
on public.employee_attendance
for delete
to authenticated
using (true);

drop policy if exists "Authenticated users can read employee payments" on public.employee_payments;
drop policy if exists "Authenticated users can insert employee payments" on public.employee_payments;
drop policy if exists "Authenticated users can update employee payments" on public.employee_payments;
drop policy if exists "Authenticated users can delete employee payments" on public.employee_payments;

create policy "Authenticated users can read employee payments"
on public.employee_payments
for select
to authenticated
using (true);

create policy "Authenticated users can insert employee payments"
on public.employee_payments
for insert
to authenticated
with check (true);

create policy "Authenticated users can update employee payments"
on public.employee_payments
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete employee payments"
on public.employee_payments
for delete
to authenticated
using (true);

notify pgrst, 'reload schema';
