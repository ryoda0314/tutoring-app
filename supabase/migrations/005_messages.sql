-- Migration: Create messages table
-- Communication between teacher and parents

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('teacher', 'parent')),
  body TEXT NOT NULL,
  message_type TEXT DEFAULT '連絡事項' CHECK (message_type IN ('日程相談', '宿題', '連絡事項', '欠席連絡')),
  related_schedule_request_id UUID REFERENCES schedule_requests(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_messages_student_id ON messages(student_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_related_request ON messages(related_schedule_request_id);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies:
-- Teachers can CRUD messages for their students
CREATE POLICY "Teachers can view messages for own students" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = messages.student_id
      AND s.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can insert messages" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = messages.student_id
      AND s.teacher_id = auth.uid()
    )
    AND sender_type = 'teacher'
  );

CREATE POLICY "Teachers can update messages" ON messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = messages.student_id
      AND s.teacher_id = auth.uid()
    )
  );

-- Parents can view messages for their assigned student
CREATE POLICY "Parents can view own student messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.student_id = messages.student_id
    )
  );

-- Parents can create messages for their assigned student
CREATE POLICY "Parents can create messages" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.student_id = messages.student_id
    )
    AND sender_type = 'parent'
  );
