-- ═══════════════════════════════════════════════════════════
-- DesignFlow AI 更新日志表
-- 请在 Supabase SQL Editor 中执行
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS changelogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'feature',
  version TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_changelogs_created_at ON changelogs (created_at DESC);

ALTER TABLE changelogs ENABLE ROW LEVEL SECURITY;

-- 公开可读
DROP POLICY IF EXISTS "Anyone can view changelogs" ON changelogs;
CREATE POLICY "Anyone can view changelogs" ON changelogs
  FOR SELECT USING (true);

-- 管理员可管理
DROP POLICY IF EXISTS "Admins can manage changelogs" ON changelogs;
CREATE POLICY "Admins can manage changelogs" ON changelogs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE)
  );
