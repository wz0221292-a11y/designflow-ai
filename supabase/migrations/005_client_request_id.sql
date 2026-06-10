-- Add client_request_id for idempotent image job creation
ALTER TABLE image_jobs
  ADD COLUMN IF NOT EXISTS client_request_id TEXT;

-- Populate existing rows with a generated value
UPDATE image_jobs
  SET client_request_id = 'image:' || project_id || ':legacy:' || id
  WHERE client_request_id IS NULL;

-- Make it required and unique going forward
ALTER TABLE image_jobs
  ALTER COLUMN client_request_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_image_jobs_client_request_id
  ON image_jobs(client_request_id);
