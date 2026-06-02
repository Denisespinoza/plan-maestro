/*
  # Finance movements module

  Creates a single finance_movements table for Modeltex financial control.
  The table stores manual income and expense movements without modifying
  orders, customers, employees, storage, login, or role systems.
*/

CREATE TABLE IF NOT EXISTS finance_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  category text NOT NULL DEFAULT '',
  payment_method text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (status IN ('collected', 'paid', 'pending')),
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  related_person text,
  attachment_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE finance_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth read finance movements" ON finance_movements;
DROP POLICY IF EXISTS "Auth insert finance movements" ON finance_movements;
DROP POLICY IF EXISTS "Auth update finance movements" ON finance_movements;
DROP POLICY IF EXISTS "Auth delete finance movements" ON finance_movements;

CREATE POLICY "Auth read finance movements" ON finance_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert finance movements" ON finance_movements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update finance movements" ON finance_movements FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete finance movements" ON finance_movements FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_finance_movements_date ON finance_movements(movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_movements_type ON finance_movements(type);
CREATE INDEX IF NOT EXISTS idx_finance_movements_status ON finance_movements(status);
CREATE INDEX IF NOT EXISTS idx_finance_movements_payment_method ON finance_movements(payment_method);
CREATE INDEX IF NOT EXISTS idx_finance_movements_category ON finance_movements(category);
CREATE INDEX IF NOT EXISTS idx_finance_movements_customer ON finance_movements(customer_id);
CREATE INDEX IF NOT EXISTS idx_finance_movements_order ON finance_movements(order_id);
CREATE INDEX IF NOT EXISTS idx_finance_movements_employee ON finance_movements(employee_id);

CREATE OR REPLACE FUNCTION set_finance_movements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_finance_movements_updated_at ON finance_movements;
CREATE TRIGGER trg_finance_movements_updated_at
  BEFORE UPDATE ON finance_movements
  FOR EACH ROW
  EXECUTE FUNCTION set_finance_movements_updated_at();
