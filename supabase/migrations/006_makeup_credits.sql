-- Migration: Create makeup_credits table
-- Tracking make-up lesson time (振替)

CREATE TABLE IF NOT EXISTS makeup_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  total_minutes INTEGER NOT NULL DEFAULT 0,  -- Remaining minutes
  expires_at TIMESTAMPTZ NOT NULL,  -- Expiration date (1 month from cancelled lesson)
  origin_lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,  -- The lesson that was cancelled
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_makeup_credits_student_id ON makeup_credits(student_id);
CREATE INDEX idx_makeup_credits_expires_at ON makeup_credits(expires_at);

-- Enable RLS
ALTER TABLE makeup_credits ENABLE ROW LEVEL SECURITY;

-- Policies:
-- Teachers can CRUD makeup credits for their students
CREATE POLICY "Teachers can view makeup credits for own students" ON makeup_credits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = makeup_credits.student_id
      AND s.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can insert makeup credits" ON makeup_credits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = makeup_credits.student_id
      AND s.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update makeup credits" ON makeup_credits
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = makeup_credits.student_id
      AND s.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete makeup credits" ON makeup_credits
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = makeup_credits.student_id
      AND s.teacher_id = auth.uid()
    )
  );

-- Parents can view makeup credits for their assigned student
CREATE POLICY "Parents can view own student makeup credits" ON makeup_credits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.student_id = makeup_credits.student_id
    )
  );

-- Helper view to get aggregated makeup credits per student (non-expired only)
CREATE OR REPLACE VIEW active_makeup_credits AS
SELECT 
  student_id,
  SUM(total_minutes) as total_remaining_minutes,
  MIN(expires_at) as nearest_expiration
FROM makeup_credits
WHERE expires_at > NOW() AND total_minutes > 0
GROUP BY student_id;
