-- Migration 018: Add 'asistente' role and assign admin users
-- Safe: only adds new role value and updates specific users

-- 1. Drop old check constraint and add new one with 'asistente'
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin', 'staff', 'empleado', 'pendiente', 'asistente'));

-- 2. Change default role for new users to 'asistente'
ALTER TABLE public.user_profiles
  ALTER COLUMN role SET DEFAULT 'asistente';

-- 3. Assign admin role to both owner accounts
UPDATE public.user_profiles
SET role = 'admin', updated_at = now()
WHERE email ILIKE 'CEO.MODLETEX@GMAIL.COM'
   OR email ILIKE 'J.DENIS.IA.1305@GMAIL.COM';

-- 4. Update the trigger that auto-creates user_profiles on signup
--    so new users get 'asistente' as default (not 'staff')
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'asistente'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
