/*
  # CEO Modeltex role permissions

  Roles:
  - admin: full access to operational data, finances, employees and user roles.
  - empleado/staff: read operational modules and insert new operational records only.
  - pendiente: can only read own profile; no internal data access.
*/

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text AS $$
  SELECT COALESCE((SELECT role FROM public.user_profiles WHERE id = auth.uid()), 'pendiente');
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT public.current_app_role() = 'admin';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_employee_or_admin()
RETURNS boolean AS $$
  SELECT public.current_app_role() IN ('admin', 'empleado', 'staff');
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_employee_role()
RETURNS boolean AS $$
  SELECT public.current_app_role() IN ('empleado', 'staff');
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role text := COALESCE(NEW.raw_user_meta_data->>'role', 'pendiente');
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE WHEN requested_role IN ('admin', 'empleado', 'staff', 'pendiente') THEN requested_role ELSE 'pendiente' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Users may read their own profile; only admins manage roles/profiles.
-- Important: drop the old recursive admin SELECT policy that queried user_profiles inside
-- a user_profiles policy and could make getUserProfile fail, causing false "pendiente" UI.
DROP POLICY IF EXISTS "Users read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins delete profiles" ON user_profiles;

CREATE POLICY "Users read own profile" ON user_profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON user_profiles FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins insert profiles" ON user_profiles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins update all profiles" ON user_profiles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete profiles" ON user_profiles FOR DELETE TO authenticated USING (public.is_admin());

-- Customers: admin all; empleado read + insert only.
DROP POLICY IF EXISTS "Auth read customers" ON customers;
DROP POLICY IF EXISTS "Auth insert customers" ON customers;
DROP POLICY IF EXISTS "Auth update customers" ON customers;
DROP POLICY IF EXISTS "Auth delete customers" ON customers;
CREATE POLICY "Admin all customers" ON customers FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Employee read customers" ON customers FOR SELECT TO authenticated USING (public.is_employee_or_admin());
CREATE POLICY "Employee insert customers" ON customers FOR INSERT TO authenticated WITH CHECK (public.is_employee_or_admin());

-- Orders: admin all; empleado read + insert only.
DROP POLICY IF EXISTS "Auth read orders" ON orders;
DROP POLICY IF EXISTS "Auth insert orders" ON orders;
DROP POLICY IF EXISTS "Auth update orders" ON orders;
DROP POLICY IF EXISTS "Auth delete orders" ON orders;
CREATE POLICY "Admin all orders" ON orders FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Employee read orders" ON orders FOR SELECT TO authenticated USING (public.is_employee_or_admin());
CREATE POLICY "Employee insert orders" ON orders FOR INSERT TO authenticated WITH CHECK (public.is_employee_or_admin());

-- Order history supports order creation/history visibility; destructive cleanup stays admin-only.
DROP POLICY IF EXISTS "Auth read history" ON order_history;
DROP POLICY IF EXISTS "Auth insert history" ON order_history;
DROP POLICY IF EXISTS "Auth delete history" ON order_history;
CREATE POLICY "Admin all history" ON order_history FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Employee read history" ON order_history FOR SELECT TO authenticated USING (public.is_employee_or_admin());
CREATE POLICY "Employee insert history" ON order_history FOR INSERT TO authenticated WITH CHECK (public.is_employee_or_admin());

-- Inventory models: admin all; empleado read + insert only.
DROP POLICY IF EXISTS "Auth read inventory" ON inventory_models;
DROP POLICY IF EXISTS "Auth insert inventory" ON inventory_models;
DROP POLICY IF EXISTS "Auth update inventory" ON inventory_models;
DROP POLICY IF EXISTS "Auth delete inventory" ON inventory_models;
CREATE POLICY "Admin all inventory" ON inventory_models FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Employee read inventory" ON inventory_models FOR SELECT TO authenticated USING (public.is_employee_or_admin());
CREATE POLICY "Employee insert inventory" ON inventory_models FOR INSERT TO authenticated WITH CHECK (public.is_employee_or_admin());

-- Garment types: creation can insert new type names; usage-count updates remain admin-only.
DROP POLICY IF EXISTS "Auth read garment" ON garment_types;
DROP POLICY IF EXISTS "Auth insert garment" ON garment_types;
DROP POLICY IF EXISTS "Auth update garment" ON garment_types;
CREATE POLICY "Admin all garment types" ON garment_types FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Employee read garment types" ON garment_types FOR SELECT TO authenticated USING (public.is_employee_or_admin());
CREATE POLICY "Employee insert garment types" ON garment_types FOR INSERT TO authenticated WITH CHECK (public.is_employee_or_admin());

-- Mold library: admin all; empleado read + insert only.
DROP POLICY IF EXISTS "Auth read mold" ON mold_library;
DROP POLICY IF EXISTS "Auth insert mold" ON mold_library;
DROP POLICY IF EXISTS "Auth update mold" ON mold_library;
DROP POLICY IF EXISTS "Auth delete mold" ON mold_library;
CREATE POLICY "Admin all mold library" ON mold_library FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Employee read mold library" ON mold_library FOR SELECT TO authenticated USING (public.is_employee_or_admin());
CREATE POLICY "Employee insert mold library" ON mold_library FOR INSERT TO authenticated WITH CHECK (public.is_employee_or_admin());

-- Internal catalog: admin all; empleado read + insert only.
DROP POLICY IF EXISTS "Auth read catalog" ON internal_catalog;
DROP POLICY IF EXISTS "Auth insert catalog" ON internal_catalog;
DROP POLICY IF EXISTS "Auth update catalog" ON internal_catalog;
DROP POLICY IF EXISTS "Auth delete catalog" ON internal_catalog;
CREATE POLICY "Admin all catalog" ON internal_catalog FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Employee read catalog" ON internal_catalog FOR SELECT TO authenticated USING (public.is_employee_or_admin());
CREATE POLICY "Employee insert catalog" ON internal_catalog FOR INSERT TO authenticated WITH CHECK (public.is_employee_or_admin());

-- Library files: admin all; empleado read + insert only.
DROP POLICY IF EXISTS "Auth read files" ON library_files;
DROP POLICY IF EXISTS "Auth insert files" ON library_files;
DROP POLICY IF EXISTS "Auth update files" ON library_files;
DROP POLICY IF EXISTS "Auth delete files" ON library_files;
CREATE POLICY "Admin all library files" ON library_files FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Employee read library files" ON library_files FOR SELECT TO authenticated USING (public.is_employee_or_admin());
CREATE POLICY "Employee insert library files" ON library_files FOR INSERT TO authenticated WITH CHECK (public.is_employee_or_admin());

-- Finance and personnel stay admin-only. Drop broad policies if they exist.
DROP POLICY IF EXISTS "Auth read finance movements" ON finance_movements;
DROP POLICY IF EXISTS "Auth insert finance movements" ON finance_movements;
DROP POLICY IF EXISTS "Auth update finance movements" ON finance_movements;
DROP POLICY IF EXISTS "Auth delete finance movements" ON finance_movements;
DROP POLICY IF EXISTS "Auth read finance_movements" ON finance_movements;
DROP POLICY IF EXISTS "Auth insert finance_movements" ON finance_movements;
DROP POLICY IF EXISTS "Auth update finance_movements" ON finance_movements;
DROP POLICY IF EXISTS "Auth delete finance_movements" ON finance_movements;
DROP POLICY IF EXISTS "Admin read finance_movements" ON finance_movements;
DROP POLICY IF EXISTS "Admin insert finance_movements" ON finance_movements;
DROP POLICY IF EXISTS "Admin update finance_movements" ON finance_movements;
DROP POLICY IF EXISTS "Admin delete finance_movements" ON finance_movements;
CREATE POLICY "Admin all finance movements" ON finance_movements FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Storage: empleados can upload/read new files; updates/deletes are admin-only to avoid overwriting/removing existing assets.
DROP POLICY IF EXISTS "Auth upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth read" ON storage.objects;
DROP POLICY IF EXISTS "Auth update" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete" ON storage.objects;
CREATE POLICY "Admin all app storage" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id IN ('catalog-images', 'order-files', 'mold-files', 'library-files') AND public.is_admin())
  WITH CHECK (bucket_id IN ('catalog-images', 'order-files', 'mold-files', 'library-files') AND public.is_admin());
CREATE POLICY "Employee read app storage" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('catalog-images', 'order-files', 'mold-files', 'library-files') AND public.is_employee_or_admin());
CREATE POLICY "Employee upload app storage" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('catalog-images', 'order-files', 'mold-files', 'library-files') AND public.is_employee_or_admin());
