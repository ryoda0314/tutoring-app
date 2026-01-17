-- Migration: Create student_invites table for linking parents to students
-- Teachers generate invite codes, parents use them to register and link

CREATE TABLE IF NOT EXISTS student_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE, -- nullable for new registration flow
  invite_code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  used_by UUID REFERENCES profiles(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE student_invites ENABLE ROW LEVEL SECURITY;

-- Policies
-- Teachers can create invites (with or without student_id)
CREATE POLICY "Teachers can create invites" ON student_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'teacher'
    )
  );

-- Teachers can view their own invites
CREATE POLICY "Teachers can view own invites" ON student_invites
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

-- Anyone authenticated can view invites (for redemption via code)
CREATE POLICY "Anyone can view invites for redemption" ON student_invites
  FOR SELECT TO authenticated
  USING (true);

-- Teachers can delete their invites
CREATE POLICY "Teachers can delete invites" ON student_invites
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Update policy for marking invite as used
CREATE POLICY "Users can use invites" ON student_invites
  FOR UPDATE TO authenticated
  USING (used_by IS NULL)
  WITH CHECK (used_by = auth.uid());

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_student_invites_code ON student_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_student_invites_creator ON student_invites(created_by);
