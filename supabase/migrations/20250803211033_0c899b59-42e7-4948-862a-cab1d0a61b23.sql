-- Create storage policies for project-files bucket to allow signed URL access
-- This will enable audio streaming for project members

-- Policy to allow authenticated users to view files they have access to via signed URLs
CREATE POLICY "Project members can access files via signed URLs" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'project-files' 
  AND (
    -- Project owners can access all files in their projects
    (storage.foldername(name))[1] IN (
      SELECT p.id::text 
      FROM public.projects p 
      WHERE p.producer_id = auth.uid()
    )
    OR
    -- Project members can access files in projects they're members of
    (storage.foldername(name))[1] IN (
      SELECT pm.project_id::text 
      FROM public.project_members pm 
      WHERE (pm.user_id = auth.uid() OR pm.email = auth.email())
    )
  )
);

-- Policy to allow project members to upload files
CREATE POLICY "Project members can upload files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'project-files' 
  AND (
    -- Project owners can upload to their projects
    (storage.foldername(name))[1] IN (
      SELECT p.id::text 
      FROM public.projects p 
      WHERE p.producer_id = auth.uid()
    )
    OR
    -- Project members with appropriate roles can upload
    (storage.foldername(name))[1] IN (
      SELECT pm.project_id::text 
      FROM public.project_members pm 
      WHERE (pm.user_id = auth.uid() OR pm.email = auth.email())
      AND pm.role IN ('editor', 'manager', 'producer')
    )
  )
);

-- Policy to allow project members to delete files
CREATE POLICY "Project members can delete files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'project-files' 
  AND (
    -- Project owners can delete files from their projects
    (storage.foldername(name))[1] IN (
      SELECT p.id::text 
      FROM public.projects p 
      WHERE p.producer_id = auth.uid()
    )
    OR
    -- Project members with appropriate roles can delete
    (storage.foldername(name))[1] IN (
      SELECT pm.project_id::text 
      FROM public.project_members pm 
      WHERE (pm.user_id = auth.uid() OR pm.email = auth.email())
      AND pm.role IN ('editor', 'manager', 'producer')
    )
  )
);