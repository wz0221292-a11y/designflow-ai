-- 创建 profiles 表（如果不存在）
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 projects 表（如果不存在）
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  idea TEXT NOT NULL,
  background TEXT,
  product_intro JSONB,
  personas JSONB,
  appearance_images JSONB,
  cmf JSONB,
  storyboard_images JSONB,
  exploded_view_image TEXT,
  current_step INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 补齐会员和权限字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_plan TEXT DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS image_usage JSONB DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 补齐项目字段
ALTER TABLE projects ADD COLUMN IF NOT EXISTS selected_appearance_index INTEGER;

-- 公告表
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  is_published BOOLEAN DEFAULT TRUE,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 支付订单表
CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  plan TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'closed', 'paid_late')),
  provider TEXT NOT NULL DEFAULT 'yft',
  provider_trade_no TEXT,
  provider_payload JSONB,
  paid_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 补齐支付订单字段和状态约束
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payment_orders DROP CONSTRAINT IF EXISTS payment_orders_status_check;
ALTER TABLE payment_orders ADD CONSTRAINT payment_orders_status_check
  CHECK (status IN ('pending', 'paid', 'failed', 'closed', 'paid_late'));

CREATE INDEX IF NOT EXISTS idx_announcements_published_at ON announcements (is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders (status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_pending_expires_at ON payment_orders (status, expires_at);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can manage announcements" ON announcements;
DROP POLICY IF EXISTS "Users can view own payment orders" ON payment_orders;

CREATE POLICY "Anyone can view published announcements" ON announcements
  FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Users can view own payment orders" ON payment_orders
  FOR SELECT USING (auth.uid() = user_id);


-- 先删除旧策略（如果存在），再创建新策略
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

-- profiles 表策略
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

REVOKE UPDATE ON profiles FROM authenticated;
GRANT SELECT ON profiles TO authenticated;

-- projects 表策略
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- 用户注册自动创建 profile 的触发器
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 自动更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_projects_updated ON projects;
CREATE TRIGGER on_projects_updated
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_announcements_updated ON announcements;
CREATE TRIGGER on_announcements_updated
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_payment_orders_updated ON payment_orders;
CREATE TRIGGER on_payment_orders_updated
  BEFORE UPDATE ON payment_orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 更新日志表
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

DROP POLICY IF EXISTS "Anyone can view changelogs" ON changelogs;
CREATE POLICY "Anyone can view changelogs" ON changelogs
  FOR SELECT USING (true);

-- 项目资源表（独立管理图片资产）
CREATE TABLE IF NOT EXISTS project_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('appearance', 'storyboard', 'exploded_view')),
  slot_index INTEGER NOT NULL DEFAULT 0,
  storage_bucket TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  source_url TEXT,
  source_provider TEXT,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'missing', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, asset_type, slot_index)
);

CREATE INDEX IF NOT EXISTS idx_project_assets_project ON project_assets (project_id);
CREATE INDEX IF NOT EXISTS idx_project_assets_user ON project_assets (user_id);
CREATE INDEX IF NOT EXISTS idx_project_assets_status ON project_assets (status);

ALTER TABLE project_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own assets" ON project_assets;
CREATE POLICY "Users can view own assets" ON project_assets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own assets" ON project_assets;
CREATE POLICY "Users can update own assets" ON project_assets
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own assets" ON project_assets;
CREATE POLICY "Users can insert own assets" ON project_assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- profiles 只能由客户端读取，敏感字段更新必须走服务端 API（service role）
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
REVOKE UPDATE ON profiles FROM authenticated;