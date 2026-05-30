/*
  # Fix Storage Policies for Public Development Access

  1. Problem
    - The app has authentication disabled for development
    - Requests are made as 'public' role (anon key)
    - 'order-files' bucket only allows INSERT/UPDATE/DELETE for 'authenticated' role
    - This causes "Error al subir archivo" when trying to upload

  2. Solution
    - Add DEV policies for 'order-files' bucket allowing public (anon) access
    - Match the same pattern already used for 'mold-files' bucket

  3. Security Note
    - These DEV policies should be removed before production
    - Production should require authentication
*/

-- Add DEV policies for order-files bucket (public/anonymous access)
CREATE POLICY "DEV: Public upload order files"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'order-files');

CREATE POLICY "DEV: Public update order files"
  ON storage.objects FOR UPDATE
  TO public
  USING (bucket_id = 'order-files');

CREATE POLICY "DEV: Public delete order files"
  ON storage.objects FOR DELETE
  TO public
  USING (bucket_id = 'order-files');
