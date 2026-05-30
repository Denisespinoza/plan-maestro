/*
  # Modeltex - Inventory and Mold Library Schema

  1. New Tables
    - `inventory_models` - Product catalog/model inventory
      - `id` (uuid, primary key)
      - `code` (text, unique internal code)
      - `name` (text, article name)
      - `category` (text: hombre, mujer, niño, niña, bebé, deportivo, escolar, trabajo, accesorios, otros)
      - `subcategory` (text, optional subcategory)
      - `size_curve` (text, curva de talles)
      - `recommended_fabric` (text, tipo de tela recomendada)
      - `description` (text, description)
      - `main_photo_url` (text, URL for main photo in storage)
      - `quantity_available` (integer, cantidad disponible)
      - `quantity_sold` (integer, cantidad vendida)
      - `status` (text: active, hidden, archived)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `mold_library` - File library for each inventory model
      - `id` (uuid, primary key)
      - `model_id` (uuid, foreign key to inventory_models)
      - `file_name` (text, original file name)
      - `file_type` (text: pdf_a4, pdf_plotter, plt, dxf, cdr, ai, zip, jpg, png, other)
      - `file_url` (text, URL in storage)
      - `version` (text, version identifier)
      - `technical_notes` (text, observaciones técnicas)
      - `is_primary` (boolean, primary file for type)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Modifications to existing tables
    - `orders` - Add `model_id` (uuid, nullable FK to inventory_models)
    - `customers` - Add computed/virtual relationship to track models ordered

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated admin users to perform CRUD operations
    - Add DEV policies for public access during development

  4. Important Notes
    - Categories are predefined: hombre, mujer, niño, niña, bebé, deportivo, escolar, trabajo, accesorios, otros
    - File types include: pdf_a4, pdf_plotter, plt, dxf, cdr, ai, zip, jpg, png
    - Multiple files per model supported in mold_library
    - Orders can link to inventory models for automatic data population
    - Models track quantity available and sold for inventory management
*/

-- Create inventory_models table
CREATE TABLE IF NOT EXISTS inventory_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'otros',
  subcategory text DEFAULT '',
  size_curve text DEFAULT '',
  recommended_fabric text DEFAULT '',
  description text DEFAULT '',
  main_photo_url text DEFAULT '',
  quantity_available integer NOT NULL DEFAULT 0,
  quantity_sold integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read inventory_models"
  ON inventory_models FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert inventory_models"
  ON inventory_models FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update inventory_models"
  ON inventory_models FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete inventory_models"
  ON inventory_models FOR DELETE
  TO authenticated
  USING (true);

-- DEV policies for public access
CREATE POLICY "DEV: Public read access on inventory_models"
  ON inventory_models FOR SELECT
  TO public
  USING (true);

CREATE POLICY "DEV: Public insert access on inventory_models"
  ON inventory_models FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "DEV: Public update access on inventory_models"
  ON inventory_models FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "DEV: Public delete access on inventory_models"
  ON inventory_models FOR DELETE
  TO public
  USING (true);

-- Create mold_library table
CREATE TABLE IF NOT EXISTS mold_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES inventory_models(id) ON DELETE CASCADE,
  file_name text NOT NULL DEFAULT '',
  file_type text NOT NULL DEFAULT 'other',
  file_url text NOT NULL DEFAULT '',
  version text DEFAULT '',
  technical_notes text DEFAULT '',
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE mold_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read mold_library"
  ON mold_library FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert mold_library"
  ON mold_library FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update mold_library"
  ON mold_library FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete mold_library"
  ON mold_library FOR DELETE
  TO authenticated
  USING (true);

-- DEV policies for mold_library
CREATE POLICY "DEV: Public read access on mold_library"
  ON mold_library FOR SELECT
  TO public
  USING (true);

CREATE POLICY "DEV: Public insert access on mold_library"
  ON mold_library FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "DEV: Public update access on mold_library"
  ON mold_library FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "DEV: Public delete access on mold_library"
  ON mold_library FOR DELETE
  TO public
  USING (true);

-- Add model_id to orders table (nullable, for linking to inventory)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'model_id') THEN
    ALTER TABLE orders ADD COLUMN model_id uuid REFERENCES inventory_models(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add DEV policy for orders with model_id
CREATE POLICY "DEV: Public update access on orders (model_id)"
  ON orders FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create storage bucket for mold files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('mold-files', 'mold-files', true, 52428800, ARRAY[
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/postscript',
  'application/ai',
  'application/cdr',
  'application/x-cdr',
  'application/plt',
  'application/dxf',
  'image/x-dxf'
])
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to mold files
CREATE POLICY "Public read access for mold files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'mold-files');

-- Allow authenticated users to upload mold files
CREATE POLICY "Authenticated users can upload mold files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'mold-files');

-- DEV: Allow public upload
CREATE POLICY "DEV: Public upload mold files"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'mold-files');

CREATE POLICY "DEV: Public update mold files"
  ON storage.objects FOR UPDATE
  TO public
  USING (bucket_id = 'mold-files');

CREATE POLICY "DEV: Public delete mold files"
  ON storage.objects FOR DELETE
  TO public
  USING (bucket_id = 'mold-files');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_models_code ON inventory_models(code);
CREATE INDEX IF NOT EXISTS idx_inventory_models_category ON inventory_models(category);
CREATE INDEX IF NOT EXISTS idx_inventory_models_status ON inventory_models(status);
CREATE INDEX IF NOT EXISTS idx_mold_library_model_id ON mold_library(model_id);
CREATE INDEX IF NOT EXISTS idx_mold_library_file_type ON mold_library(file_type);
CREATE INDEX IF NOT EXISTS idx_orders_model_id ON orders(model_id);
