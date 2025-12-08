-- Migration: Add cancellation request fields to lessons table
-- Allows parents to request cancellation of planned lessons

-- Add cancellation request fields to lessons table
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancellation_processed_at TIMESTAMPTZ;

-- Index for finding pending cancellation requests
CREATE INDEX IF NOT EXISTS idx_lessons_cancellation_requested 
ON lessons(cancellation_requested_at) 
WHERE cancellation_requested_at IS NOT NULL AND cancellation_processed_at IS NULL;

-- Allow parents to update lessons for cancellation requests only
CREATE POLICY "Parents can request cancellation" ON lessons
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.student_id = lessons.student_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.student_id = lessons.student_id
    )
  );
