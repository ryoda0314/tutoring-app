-- Migration: Create students table
-- Students managed by the teacher

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,  -- e.g., "中学3年", "高校2年"
  school TEXT,
  subjects TEXT[] DEFAULT '{}',  -- e.g., ARRAY['数学', '英語']
  contact TEXT,  -- LINE ID, email, phone, etc.
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for common queries
CREATE INDEX idx_students_teacher_id ON students(teacher_id);

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policies:
-- Teachers can CRUD their own students
CREATE POLICY "Teachers can view own students" ON students
  FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can insert students" ON students
  FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update own students" ON students
  FOR UPDATE USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete own students" ON students
  FOR DELETE USING (teacher_id = auth.uid());

-- Parents can view students they are associated with
CREATE POLICY "Parents can view assigned student" ON students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.student_id = students.id
    )
  );

-- Add foreign key from profiles.student_id to students.id
-- (This needs to be added after students table exists)
ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_student
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;
