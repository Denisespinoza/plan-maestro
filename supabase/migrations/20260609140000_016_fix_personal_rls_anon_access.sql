-- Fix RLS policies: ensure anon key (used by the app) can read and write
-- employee_attendance and employee_payments. Migration 015 only created
-- "authenticated" policies which blocked the app's anon Supabase client.

-- employee_attendance
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

-- employee_payments
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
