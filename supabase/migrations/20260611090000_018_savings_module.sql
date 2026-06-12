/*
  # Módulo de Ahorros

  Crea dos tablas:
  1. savings_goals   — objetivos de ahorro (nombre, monto objetivo, fecha límite, categoría, estado)
  2. savings_contributions — aportes individuales por objetivo (monto, fecha, fuente)
*/

-- ============================================
-- 1. SAVINGS_GOALS
-- ============================================
CREATE TABLE IF NOT EXISTS savings_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  target_amount numeric NOT NULL DEFAULT 0 CHECK (target_amount > 0),
  current_amount numeric NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  deadline date NOT NULL,
  category text NOT NULL DEFAULT 'corto' CHECK (category IN ('corto', 'mediano', 'largo')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  color text NOT NULL DEFAULT '#8B5CF6',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth read savings_goals" ON savings_goals;
DROP POLICY IF EXISTS "Auth insert savings_goals" ON savings_goals;
DROP POLICY IF EXISTS "Auth update savings_goals" ON savings_goals;
DROP POLICY IF EXISTS "Auth delete savings_goals" ON savings_goals;

CREATE POLICY "Auth read savings_goals"   ON savings_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert savings_goals" ON savings_goals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update savings_goals" ON savings_goals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete savings_goals" ON savings_goals FOR DELETE TO authenticated USING (true);

-- ============================================
-- 2. SAVINGS_CONTRIBUTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS savings_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0 CHECK (amount > 0),
  contribution_date date NOT NULL DEFAULT CURRENT_DATE,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'weekly')),
  notes text DEFAULT '',
  finance_movement_id uuid REFERENCES finance_movements(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE savings_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth read savings_contributions" ON savings_contributions;
DROP POLICY IF EXISTS "Auth insert savings_contributions" ON savings_contributions;
DROP POLICY IF EXISTS "Auth update savings_contributions" ON savings_contributions;
DROP POLICY IF EXISTS "Auth delete savings_contributions" ON savings_contributions;

CREATE POLICY "Auth read savings_contributions"   ON savings_contributions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert savings_contributions" ON savings_contributions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update savings_contributions" ON savings_contributions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete savings_contributions" ON savings_contributions FOR DELETE TO authenticated USING (true);

-- ============================================
-- 3. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_savings_goals_status   ON savings_goals(status);
CREATE INDEX IF NOT EXISTS idx_savings_goals_category ON savings_goals(category);
CREATE INDEX IF NOT EXISTS idx_savings_goals_deadline ON savings_goals(deadline);
CREATE INDEX IF NOT EXISTS idx_savings_contributions_goal ON savings_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_savings_contributions_date ON savings_contributions(contribution_date DESC);

-- ============================================
-- 4. TRIGGER updated_at en savings_goals
-- ============================================
CREATE OR REPLACE FUNCTION set_savings_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_savings_goals_updated_at ON savings_goals;
CREATE TRIGGER trg_savings_goals_updated_at
  BEFORE UPDATE ON savings_goals
  FOR EACH ROW EXECUTE FUNCTION set_savings_goals_updated_at();

SELECT 'Módulo Ahorros listo: savings_goals y savings_contributions creadas.' AS status;
