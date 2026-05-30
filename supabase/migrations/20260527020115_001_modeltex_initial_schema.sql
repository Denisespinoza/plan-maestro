/*
  # Modeltex - Initial Database Schema

  1. New Tables
    - `customers`
      - `id` (uuid, primary key)
      - `name` (text, customer name)
      - `phone` (text, phone number)
      - `is_favorite` (boolean, favorite client flag)
      - `created_at` (timestamptz)
    - `orders`
      - `id` (uuid, primary key)
      - `order_number` (text, unique auto-generated order number like MOD-0001)
      - `customer_id` (uuid, foreign key to customers)
      - `customer_name` (text, denormalized for quick access)
      - `phone` (text, denormalized for quick access)
      - `garment_type` (text, type of garment)
      - `sizes` (text, sizes as comma-separated or free text)
      - `quantity` (integer, quantity)
      - `fabric_type` (text, type of fabric)
      - `notes` (text, additional notes)
      - `delivery_date` (date, expected delivery date)
      - `status` (text, one of: pending, in_design, in_correction, ready, delivered)
      - `price` (numeric, total price)
      - `paid_amount` (numeric, amount paid so far)
      - `remaining_balance` (numeric, price - paid_amount)
      - `reference_image_url` (text, URL for reference image in storage)
      - `pdf_file_url` (text, URL for PDF file in storage)
      - `mold_file_url` (text, URL for mold file in storage)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `order_history`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key to orders)
      - `action` (text, description of change)
      - `old_value` (text, previous value)
      - `new_value` (text, new value)
      - `created_at` (timestamptz)
    - `garment_types`
      - `id` (uuid, primary key)
      - `name` (text, garment type name)
      - `usage_count` (integer, how often used, for recently used feature)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated admin users to perform CRUD operations
    - All tables restricted to authenticated users only

  3. Important Notes
    - Orders use auto-generated order numbers in format MOD-XXXX
    - Customer data is partially denormalized on orders for query performance
    - remaining_balance is stored as a generated/computed field kept in sync via app logic
    - order_history tracks all changes for timeline/audit trail
*/

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (true);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  garment_type text NOT NULL DEFAULT '',
  sizes text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  fabric_type text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  delivery_date date,
  status text NOT NULL DEFAULT 'pending',
  price numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  remaining_balance numeric NOT NULL DEFAULT 0,
  reference_image_url text DEFAULT '',
  pdf_file_url text DEFAULT '',
  mold_file_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read orders"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (true);

-- Order history table for timeline/audit
CREATE TABLE IF NOT EXISTS order_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  action text NOT NULL DEFAULT '',
  old_value text DEFAULT '',
  new_value text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read order history"
  ON order_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert order history"
  ON order_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete order history"
  ON order_history FOR DELETE
  TO authenticated
  USING (true);

-- Garment types table for recently used feature
CREATE TABLE IF NOT EXISTS garment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  usage_count integer NOT NULL DEFAULT 0
);

ALTER TABLE garment_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read garment types"
  ON garment_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert garment types"
  ON garment_types FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update garment types"
  ON garment_types FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON order_history(order_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
