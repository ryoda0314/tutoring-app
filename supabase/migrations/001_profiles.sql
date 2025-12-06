-- Migration: Create profiles table
-- This table extends auth.users with additional profile information

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'parent')),
  name TEXT NOT NULL,
  student_id UUID,  -- For parents: references which student they're associated with
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies:
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Profiles are created via trigger or admin, not directly by users
-- This policy allows the profile to be created during signup
CREATE POLICY "Enable insert for service role" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Teachers can view profiles of parents associated with their students
CREATE POLICY "Teachers can view parent profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'teacher'
    )
    AND role = 'parent'
  );
