-- Fix security definer view by removing SECURITY DEFINER and making it a regular view
DROP VIEW IF EXISTS public.workspace_storage_usage_gb;

CREATE VIEW public.workspace_storage_usage_gb AS
SELECT 
  w.id as workspace_id,
  w.name as workspace_name,
  COALESCE(SUM(f.file_size) / (1024.0 * 1024.0 * 1024.0), 0) as storage_gb
FROM public.workspaces w
LEFT JOIN public.projects p ON p.workspace_id = w.id
LEFT JOIN public.file_uploads f ON f.project_id = p.id
WHERE w.owner_id = auth.uid()
GROUP BY w.id, w.name;