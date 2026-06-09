/*
  # Fix client files uploads

  The app historically runs some modules with the anon Supabase key in addition to
  authenticated sessions. This migration makes the client file library usable in
  both modes while keeping the bucket private and using signed URLs in the UI.

  It also repairs partially-created `client_files` tables by adding any missing
  metadata columns used by the app.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('client-files', 'client-files', false, 104857600, NULL)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 104857600,
    allowed_mime_types = NULL;

CREATE TABLE IF NOT EXISTS client_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  related_order_id uuid NULL REFERENCES orders(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  original_file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NULL,
  file_extension text NULL,
  file_size bigint NULL,
  mime_type text NULL,
  category text NULL,
  notes text NULL,
  uploaded_by uuid NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE client_files ADD COLUMN IF NOT EXISTS related_order_id uuid NULL;
ALTER TABLE client_files ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE client_files ADD COLUMN IF NOT EXISTS original_file_name text;
ALTER TABLE client_files ADD COLUMN IF NOT EXISTS file_path text;
ALTER TABLE client_files ADD COLUMN IF NOT EXISTS file_type text NULL;
ALTER TABLE client_files ADD COLUMN IF NOT EXISTS file_extension text NULL;
ALTER TABLE client_files ADD COLUMN IF NOT EXISTS file_size bigint NULL;
ALTER TABLE client_files ADD COLUMN IF NOT EXISTS mime_type text NULL;
ALTER TABLE client_files ADD COLUMN IF NOT EXISTS category text NULL;
ALTER TABLE client_files ADD COLUMN IF NOT EXISTS notes text NULL;
ALTER TABLE client_files ADD COLUMN IF NOT EXISTS uploaded_by uuid NULL;
ALTER TABLE client_files ADD COLUMN IF NOT EXISTS uploaded_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE client_files ALTER COLUMN uploaded_at SET DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_files_file_path_unique'
  ) THEN
    ALTER TABLE client_files ADD CONSTRAINT client_files_file_path_unique UNIQUE (file_path);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_files_category_check'
  ) THEN
    ALTER TABLE client_files ADD CONSTRAINT client_files_category_check
      CHECK (category IS NULL OR category IN ('molde', 'tizado', 'pdf', 'imagen_referencia', 'ficha_tecnica', 'diseno', 'otro'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_client_files_client_id ON client_files(client_id);
CREATE INDEX IF NOT EXISTS idx_client_files_uploaded_at ON client_files(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_client_files_category ON client_files(category);
CREATE INDEX IF NOT EXISTS idx_client_files_related_order_id ON client_files(related_order_id);

ALTER TABLE client_files ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'client_files' AND policyname = 'Authenticated users can read client files') THEN
    CREATE POLICY "Authenticated users can read client files" ON client_files FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'client_files' AND policyname = 'Authenticated users can insert client files') THEN
    CREATE POLICY "Authenticated users can insert client files" ON client_files FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'client_files' AND policyname = 'Authenticated users can update client files') THEN
    CREATE POLICY "Authenticated users can update client files" ON client_files FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'client_files' AND policyname = 'Authenticated users can delete client files') THEN
    CREATE POLICY "Authenticated users can delete client files" ON client_files FOR DELETE TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'client_files' AND policyname = 'Anon can read client files') THEN
    CREATE POLICY "Anon can read client files" ON client_files FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'client_files' AND policyname = 'Anon can insert client files') THEN
    CREATE POLICY "Anon can insert client files" ON client_files FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'client_files' AND policyname = 'Anon can update client files') THEN
    CREATE POLICY "Anon can update client files" ON client_files FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'client_files' AND policyname = 'Anon can delete client files') THEN
    CREATE POLICY "Anon can delete client files" ON client_files FOR DELETE TO anon USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can read client file objects') THEN
    CREATE POLICY "Authenticated users can read client file objects" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'client-files');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload client file objects') THEN
    CREATE POLICY "Authenticated users can upload client file objects" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'client-files');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can update client file objects') THEN
    CREATE POLICY "Authenticated users can update client file objects" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'client-files') WITH CHECK (bucket_id = 'client-files');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can delete client file objects') THEN
    CREATE POLICY "Authenticated users can delete client file objects" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'client-files');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anon can read client file objects') THEN
    CREATE POLICY "Anon can read client file objects" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'client-files');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anon can upload client file objects') THEN
    CREATE POLICY "Anon can upload client file objects" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'client-files');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anon can update client file objects') THEN
    CREATE POLICY "Anon can update client file objects" ON storage.objects FOR UPDATE TO anon USING (bucket_id = 'client-files') WITH CHECK (bucket_id = 'client-files');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anon can delete client file objects') THEN
    CREATE POLICY "Anon can delete client file objects" ON storage.objects FOR DELETE TO anon USING (bucket_id = 'client-files');
  END IF;
END $$;
