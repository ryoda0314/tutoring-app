-- Migration: Create lessons table
-- Confirmed and completed lessons

CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  hours NUMERIC(3,1) NOT NULL,  -- e.g., 2.0, 3.0
  amount INTEGER NOT NULL,  -- Lesson fee in JPY (hours * 3500)
  transport_fee INTEGER DEFAULT 0,  -- Transport fee in JPY
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'done', 'cancelled')),
  is_makeup BOOLEAN DEFAULT FALSE,  -- True if this is a makeup lesson (no additional charge)
  memo TEXT,  -- Lesson content notes
  homework TEXT,  -- Homework assignments
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_lessons_student_id ON lessons(student_id);
CREATE INDEX idx_lessons_date ON lessons(date);
CREATE INDEX idx_lessons_status ON lessons(status);

-- Enable RLS
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Policies:
-- Teachers can CRUD lessons for their students
CREATE POLICY "Teachers can view own student lessons" ON lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = lessons.student_id
      AND s.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can insert lessons" ON lessons
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = lessons.student_id
      AND s.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update lessons" ON lessons
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = lessons.student_id
      AND s.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete lessons" ON lessons
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = lessons.student_id
      AND s.teacher_id = auth.uid()
    )
  );

-- Parents can view lessons for their assigned student
CREATE POLICY "Parents can view own student lessons" ON lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.student_id = lessons.student_id
    )
  );
