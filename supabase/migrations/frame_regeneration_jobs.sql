-- Frame Regeneration Jobs
-- 服务端编排：单槽位 prompt 生成 + 图片生成 → 原子提交
CREATE TABLE IF NOT EXISTS frame_regeneration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  slot_index INTEGER NOT NULL CHECK (slot_index >= 0 AND slot_index < 6),
  generation_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'generating_prompt', 'generating_image', 'completed', 'failed')),
  description_draft TEXT,
  prompt_draft TEXT,
  image_url_draft TEXT,
  storage_path_draft TEXT,
  file_size_draft BIGINT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 按项目+槽位查活跃任务（防重复提交）
CREATE INDEX IF NOT EXISTS idx_frame_regen_project_slot
  ON frame_regeneration_jobs(project_id, slot_index);

-- 按状态过滤
CREATE INDEX IF NOT EXISTS idx_frame_regen_status
  ON frame_regeneration_jobs(status);
