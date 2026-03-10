-- Phase 30B: Multi-Sport Favorite Teams & Banner Collection
-- One favorite team per sport per user, with a featured selection for the profile.

-- 1. Create user_sport_favorites table
CREATE TABLE IF NOT EXISTS user_sport_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE SET NULL,
  banner_color_scheme TEXT NOT NULL DEFAULT 'primary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, sport_id)
);

-- 2. Add featured_favorite_id to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS featured_favorite_id UUID REFERENCES user_sport_favorites(id) ON DELETE SET NULL;

-- 3. RLS policies
ALTER TABLE user_sport_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sport favorites"
  ON user_sport_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sport favorites"
  ON user_sport_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sport favorites"
  ON user_sport_favorites FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sport favorites"
  ON user_sport_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Migrate existing favorite_school_id data into the new table
-- Find the CFB sport_id and insert favorites for users who have one set
INSERT INTO user_sport_favorites (user_id, sport_id, school_id)
SELECT
  p.id,
  s.id,
  p.favorite_school_id
FROM profiles p
CROSS JOIN sports s
WHERE s.slug = 'college_football'
  AND p.favorite_school_id IS NOT NULL
ON CONFLICT (user_id, sport_id) DO NOTHING;

-- 5. Set featured_favorite_id for migrated rows
UPDATE profiles p
SET featured_favorite_id = usf.id
FROM user_sport_favorites usf
WHERE usf.user_id = p.id
  AND p.favorite_school_id IS NOT NULL
  AND p.featured_favorite_id IS NULL;

-- 6. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_sport_favorites_user
  ON user_sport_favorites (user_id);
