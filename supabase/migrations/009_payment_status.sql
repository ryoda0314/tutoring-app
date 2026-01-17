-- Migration: Create monthly_payments table
-- Tracks payment status between parents and teachers

CREATE TABLE IF NOT EXISTS monthly_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,  -- 'YYYY-MM' format (e.g., '2025-01')
  total_amount INTEGER NOT NULL DEFAULT 0,  -- Total billing amount for the month
  payment_reported_at TIMESTAMPTZ,  -- When parent reported payment complete
  payment_confirmed_at TIMESTAMPTZ, -- When teacher confirmed payment received
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, year_month)
);

-- Create indexes
CREATE INDEX idx_monthly_payments_student_id ON monthly_payments(student_id);
CREATE INDEX idx_monthly_payments_year_month ON monthly_payments(year_month);

-- Enable RLS
ALTER TABLE monthly_payments ENABLE ROW LEVEL SECURITY;

-- Teachers can view and update payments for their students
CREATE POLICY "Teachers can view own student payments" ON monthly_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = monthly_payments.student_id
      AND s.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can insert payments" ON monthly_payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = monthly_payments.student_id
      AND s.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update payments" ON monthly_payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = monthly_payments.student_id
      AND s.teacher_id = auth.uid()
    )
  );

-- Parents can view and report payments for their assigned student
CREATE POLICY "Parents can view own student payments" ON monthly_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.student_id = monthly_payments.student_id
    )
  );

CREATE POLICY "Parents can insert payments" ON monthly_payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.student_id = monthly_payments.student_id
    )
  );

CREATE POLICY "Parents can update payments" ON monthly_payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.student_id = monthly_payments.student_id
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_monthly_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_monthly_payments_updated_at
  BEFORE UPDATE ON monthly_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_payments_updated_at();
