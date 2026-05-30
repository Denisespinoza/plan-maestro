/*
  # Personal Module - Employees and Payments

  1. New Tables
    - `employees` - Employee profiles
      - `id` (uuid, primary key)
      - `name` (text)
      - `phone` (text)
      - `position` (text)
      - `start_date` (date)
      - `monthly_salary` (numeric)
      - `status` (text: active, inactive)
      - `created_at` (timestamptz)

    - `employee_attendance` - Daily attendance
      - `id` (uuid, primary key)
      - `employee_id` (uuid FK to employees)
      - `date` (date)
      - `entry_time` (time)
      - `exit_time` (time, nullable)
      - `created_at` (timestamptz)

    - `employee_payments` - Payment records
      - `id` (uuid, primary key)
      - `employee_id` (uuid FK to employees)
      - `date` (date)
      - `amount` (numeric)
      - `payment_type` (text: adelanto, pago_parcial, pago_final)
      - `notes` (text)
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled with DEV policies for public access
*/

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  position text DEFAULT '',
  start_date date DEFAULT CURRENT_DATE,
  monthly_salary numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DEV: Public read employees" ON employees FOR SELECT TO public USING (true);
CREATE POLICY "DEV: Public insert employees" ON employees FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "DEV: Public update employees" ON employees FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "DEV: Public delete employees" ON employees FOR DELETE TO public USING (true);

-- Attendance table
CREATE TABLE IF NOT EXISTS employee_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  entry_time time,
  exit_time time,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, date)
);

ALTER TABLE employee_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DEV: Public read attendance" ON employee_attendance FOR SELECT TO public USING (true);
CREATE POLICY "DEV: Public insert attendance" ON employee_attendance FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "DEV: Public update attendance" ON employee_attendance FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "DEV: Public delete attendance" ON employee_attendance FOR DELETE TO public USING (true);

-- Payments table
CREATE TABLE IF NOT EXISTS employee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  payment_type text NOT NULL DEFAULT 'adelanto',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DEV: Public read payments" ON employee_payments FOR SELECT TO public USING (true);
CREATE POLICY "DEV: Public insert payments" ON employee_payments FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "DEV: Public update payments" ON employee_payments FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "DEV: Public delete payments" ON employee_payments FOR DELETE TO public USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON employee_attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_payments_employee ON employee_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON employee_payments(date);
