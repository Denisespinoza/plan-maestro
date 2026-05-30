/*
  # Modeltex - Enhanced Clients and Orders Schema

  1. Modified Tables
    - `customers` (renamed conceptually to `clients` but keeping table name for compatibility)
      - Added `business_name` (text, razón social)
      - Added `contact_name` (text, nombre del contacto)
      - Added `email` (text)
      - Added `address` (text)
      - Added `locality` (text, localidad)
      - Added `province` (text, provincia/país)
      - Added `client_type` (text: fabricante, emprendedor, taller, revendedor, otro)
      - Added `industry` (text, rubro/tipo de prendas)
      - Added `notes` (text, observaciones internas)
      - Added `status` (text: active, pending, inactive)
      - Added `whatsapp` (text, número de WhatsApp separado)
    - `orders`
      - Added `priority` (text: normal, urgent, very_urgent)
      - Added `work_type` (text: moldería digital, cartón, tizado, diseño a pedido, otro)
      - Added `article_name` (text, nombre del pedido/artículo)
      - Changed status options: nuevo, en_proceso, esperando_confirmacion, listo_entregar, entregado, cancelado
      - Added `client_whatsapp` (text, WhatsApp del cliente vinculado)

  2. Important Notes
    - All existing data is preserved with safe defaults for new columns
    - Status values migration: pending -> nuevo, in_design/en_correction -> en_proceso, ready -> listo_entregar, delivered -> entregado
    - The phone field remains for backwards compatibility, whatsapp field added for dedicated WhatsApp number
*/

-- Add new columns to customers table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'business_name') THEN
    ALTER TABLE customers ADD COLUMN business_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'contact_name') THEN
    ALTER TABLE customers ADD COLUMN contact_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'email') THEN
    ALTER TABLE customers ADD COLUMN email text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'address') THEN
    ALTER TABLE customers ADD COLUMN address text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'locality') THEN
    ALTER TABLE customers ADD COLUMN locality text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'province') THEN
    ALTER TABLE customers ADD COLUMN province text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'client_type') THEN
    ALTER TABLE customers ADD COLUMN client_type text DEFAULT 'otro';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'industry') THEN
    ALTER TABLE customers ADD COLUMN industry text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'notes') THEN
    ALTER TABLE customers ADD COLUMN notes text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'status') THEN
    ALTER TABLE customers ADD COLUMN status text DEFAULT 'active';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'whatsapp') THEN
    ALTER TABLE customers ADD COLUMN whatsapp text DEFAULT '';
  END IF;
END $$;

-- Add new columns to orders table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'priority') THEN
    ALTER TABLE orders ADD COLUMN priority text DEFAULT 'normal';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'work_type') THEN
    ALTER TABLE orders ADD COLUMN work_type text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'article_name') THEN
    ALTER TABLE orders ADD COLUMN article_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'client_whatsapp') THEN
    ALTER TABLE orders ADD COLUMN client_whatsapp text DEFAULT '';
  END IF;
END $$;

-- Update existing orders to new status values
UPDATE orders SET status = 'nuevo' WHERE status = 'pending';
UPDATE orders SET status = 'en_proceso' WHERE status IN ('in_design', 'in_correction');
UPDATE orders SET status = 'listo_entregar' WHERE status = 'ready';
UPDATE orders SET status = 'entregado' WHERE status = 'delivered';

-- DEV policies for new columns (public access for development)
CREATE POLICY "DEV: Public update access on customers (all columns)"
  ON customers FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "DEV: Public insert access on orders (enhanced)"
  ON orders FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "DEV: Public update access on orders (enhanced)"
  ON orders FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_client_type ON customers(client_type);
CREATE INDEX IF NOT EXISTS idx_customers_locality ON customers(locality);
CREATE INDEX IF NOT EXISTS idx_orders_priority ON orders(priority);
