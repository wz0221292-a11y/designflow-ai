-- Create image_jobs table for persistent image generation tracking
CREATE TABLE IF NOT EXISTS image_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL CHECK (step_key IN ('appearance', 'storyboard', 'exploded_view')),
  slot_index INTEGER NOT NULL DEFAULT 0,
  prompt TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'custom-image-api',
  provider_job_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  image_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent duplicate active jobs for the same project + step + slot
CREATE UNIQUE INDEX IF NOT EXISTS idx_image_jobs_active_slot
  ON image_jobs(project_id, step_key, slot_index)
  WHERE status IN ('queued', 'processing');

-- Index for querying jobs by project + step
CREATE INDEX IF NOT EXISTS idx_image_jobs_project_step
  ON image_jobs(project_id, step_key);

-- Enable RLS
ALTER TABLE image_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only see jobs for their own projects
CREATE POLICY "Users can view own image jobs" ON image_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = image_jobs.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own image jobs" ON image_jobs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = image_jobs.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all image jobs" ON image_jobs
  FOR ALL USING (true)
  WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_image_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_image_jobs_updated ON image_jobs;
CREATE TRIGGER on_image_jobs_updated
  BEFORE UPDATE ON image_jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_image_jobs_updated_at();
