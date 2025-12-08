-- Migration: Create teacher_settings and student_locations tables

CREATE TABLE IF NOT EXISTS teacher_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_price INTEGER DEFAULT 0,  -- Price per lesson in JPY
  lesson_duration INTEGER DEFAULT 60,  -- Default lesson duration in minutes
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(teacher_id)
);

-- Locations table per student (for privacy)
CREATE TABLE IF NOT EXISTS student_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  name TEXT NOT NULL,  -- Location name (e.g., "自宅", "日暮里")
  transportation_fee INTEGER DEFAULT 0,  -- Transportation fee in JPY
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE teacher_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_locations ENABLE ROW LEVEL SECURITY;

-- Teacher settings policies
CREATE POLICY "Teachers can view own settings" ON teacher_settings
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert own settings" ON teacher_settings
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own settings" ON teacher_settings
  FOR UPDATE USING (auth.uid() = teacher_id);

-- Student locations policies (teachers can manage)
CREATE POLICY "Teachers can manage student locations" ON student_locations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_locations.student_id
      AND s.teacher_id = auth.uid()
    )
  );

-- Parents can view their student's locations
CREATE POLICY "Parents can view own student locations" ON student_locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.student_id = student_locations.student_id
    )
  );

-- Updated_at trigger for teacher_settings
CREATE OR REPLACE FUNCTION update_teacher_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER teacher_settings_updated_at
  BEFORE UPDATE ON teacher_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_settings_updated_at();
