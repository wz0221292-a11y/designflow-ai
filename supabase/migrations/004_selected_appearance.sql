-- Add selected_appearance_index to track which appearance image the user chose
ALTER TABLE projects ADD COLUMN IF NOT EXISTS selected_appearance_index INTEGER DEFAULT NULL;
