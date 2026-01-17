-- Migration: Create schedule_requests table
-- Lesson scheduling requests from parents or teachers

CREATE TABLE IF NOT EXISTS schedule_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL CHECK (requested_by IN ('parent', 'teacher')),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,  -- e.g., "日暮里", "蓮沼", "オンライン"
  memo TEXT,
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'reproposed', 'rejected', 'confirmed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_schedule_requests_student_id ON schedule_requests(student_id);
CREATE INDEX idx_schedule_requests_date ON schedule_requests(date);
CREATE INDEX idx_schedule_requests_status ON schedule_requests(status);

-- Enable RLS
ALTER TABLE schedule_requests ENABLE ROW LEVEL SECURITY;

-- Policies:
-- Teachers can view all schedule requests for their students
CREATE POLICY "Teachers can view requests for own students" ON schedule_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = schedule_requests.student_id
      AND s.teacher_id = auth.uid()
    )
  );

-- Teachers can insert/update/delete requests for their students
CREATE POLICY "Teachers can insert requests" ON schedule_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = schedule_requests.student_id
      AND s.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update requests" ON schedule_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = schedule_requests.student_id
      AND s.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete requests" ON schedule_requests
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = schedule_requests.student_id
      AND s.teacher_id = auth.uid()
    )
  );

-- Parents can view requests for their assigned student
CREATE POLICY "Parents can view own student requests" ON schedule_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.student_id = schedule_requests.student_id
    )
  );

-- Parents can create requests for their assigned student
CREATE POLICY "Parents can create requests" ON schedule_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.student_id = schedule_requests.student_id
    )
    AND requested_by = 'parent'
  );

-- Trigger to update updated_at on change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_schedule_requests_updated_at
  BEFORE UPDATE ON schedule_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
