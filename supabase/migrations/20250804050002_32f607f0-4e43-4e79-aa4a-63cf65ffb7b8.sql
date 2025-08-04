-- Create workspaces table to organize projects and handle Pro plans/trials
CREATE TABLE public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT CHECK (plan IN ('free', 'pro')) DEFAULT 'free',
  trial_start_at TIMESTAMPTZ,
  trial_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Create policies for workspace access
CREATE POLICY "Users can view their own workspaces" 
ON public.workspaces 
FOR SELECT 
USING (owner_id = auth.uid());

CREATE POLICY "Users can create their own workspaces" 
ON public.workspaces 
FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own workspaces" 
ON public.workspaces 
FOR UPDATE 
USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own workspaces" 
ON public.workspaces 
FOR DELETE 
USING (owner_id = auth.uid());

-- Add workspace_id to projects table
ALTER TABLE public.projects ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_projects_workspace_id ON public.projects(workspace_id);

-- Create view for workspace storage usage
CREATE OR REPLACE VIEW public.workspace_storage_usage_gb AS
SELECT 
  w.id as workspace_id,
  w.name as workspace_name,
  COALESCE(SUM(f.file_size) / (1024.0 * 1024.0 * 1024.0), 0) as storage_gb
FROM public.workspaces w
LEFT JOIN public.projects p ON p.workspace_id = w.id
LEFT JOIN public.file_uploads f ON f.project_id = p.id
GROUP BY w.id, w.name;

-- Function to check if workspace has Pro access (including trial)
CREATE OR REPLACE FUNCTION public.workspace_has_pro_access(workspace_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    CASE 
      WHEN plan = 'pro' THEN true
      WHEN plan = 'free' AND trial_expires_at IS NOT NULL AND trial_expires_at > now() THEN true
      ELSE false
    END
  FROM public.workspaces 
  WHERE id = workspace_uuid;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a default workspace for existing users and migrate their projects
INSERT INTO public.workspaces (name, owner_id, plan, trial_start_at, trial_expires_at)
SELECT 
  COALESCE(up.display_name || '''s Workspace', 'My Workspace'),
  p.producer_id,
  'free',
  now(),
  now() + interval '10 days'
FROM (
  SELECT DISTINCT producer_id 
  FROM public.projects
) p
LEFT JOIN public.user_profiles up ON up.id = p.producer_id;

-- Update existing projects to link to workspaces
UPDATE public.projects 
SET workspace_id = w.id
FROM public.workspaces w
WHERE projects.producer_id = w.owner_id;