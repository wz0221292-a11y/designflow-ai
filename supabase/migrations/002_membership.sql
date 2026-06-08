-- Membership fields for profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS membership_plan TEXT DEFAULT 'none' CHECK (membership_plan IN ('none', 'day', 'week', 'month', 'half_year', 'year')),
  ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS image_usage JSONB DEFAULT '{}'::jsonb;

UPDATE profiles
SET membership_plan = COALESCE(membership_plan, 'none'),
    image_usage = COALESCE(image_usage, '{}'::jsonb);
