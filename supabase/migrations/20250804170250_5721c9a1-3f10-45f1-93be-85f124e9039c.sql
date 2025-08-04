-- 1. STORAGE - allow authenticated PUT / GET for project buckets
DROP POLICY IF EXISTS "authenticated can access objects" ON storage.objects;
DROP POLICY IF EXISTS "tmp_del" ON storage.objects;

CREATE POLICY "authenticated rw project buckets"
  ON storage.objects
  FOR ALL              -- covers select, insert, update, delete
  TO authenticated
  USING (
      bucket_id IN ('project-files','sessions')
  );

-- 2. TABLE file_uploads - add workspace_id and proper RLS
-- 2.1 Add workspace_id column if missing
ALTER TABLE file_uploads
  ADD COLUMN IF NOT EXISTS workspace_id uuid;

-- Update existing records with workspace_id from projects
UPDATE file_uploads
  SET workspace_id = (
     SELECT workspace_id FROM projects p
     WHERE p.id = file_uploads.project_id
  )
WHERE workspace_id IS NULL;

-- 2.2 Drop existing problematic policies
DROP POLICY IF EXISTS "Project members can view files" ON file_uploads;
DROP POLICY IF EXISTS "Producers and editors can upload files" ON file_uploads;
DROP POLICY IF EXISTS "Producers and editors can delete files" ON file_uploads;

-- Create new workspace-based RLS policy
CREATE POLICY "workspace members rw files"
  ON public.file_uploads
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT w.id
      FROM workspaces w
      WHERE w.owner_id = auth.uid()
    )
    OR 
    workspace_id IN (
      SELECT p.workspace_id
      FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      WHERE (pm.user_id = auth.uid() OR pm.email = auth.email())
    )
  );