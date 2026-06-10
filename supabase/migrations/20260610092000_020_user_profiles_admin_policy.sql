-- Migration 020: Allow admin to read and update all user_profiles
-- Required for the User Management page

-- Read all profiles (admin only)
DROP POLICY IF EXISTS "Admin can read all profiles" ON public.user_profiles;
CREATE POLICY "Admin can read all profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Update role (admin only)
DROP POLICY IF EXISTS "Admin can update user roles" ON public.user_profiles;
CREATE POLICY "Admin can update user roles"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Each user can read their own profile (needed for AuthContext)
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
