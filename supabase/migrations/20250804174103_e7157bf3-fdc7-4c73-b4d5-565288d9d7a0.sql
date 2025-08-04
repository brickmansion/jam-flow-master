-- Create collection_members table for collection-level collaborators
CREATE TABLE public.collection_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('manager', 'editor', 'artist')),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(collection_id, email)
);

-- Enable RLS
ALTER TABLE public.collection_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for collection_members
CREATE POLICY "Collection producers can manage collection members"
ON public.collection_members
FOR ALL
USING (
  collection_id IN (
    SELECT id FROM public.collections 
    WHERE producer_id = auth.uid()
  )
);

CREATE POLICY "Collection members can view other collection members"
ON public.collection_members
FOR SELECT
USING (
  collection_id IN (
    SELECT id FROM public.collections 
    WHERE producer_id = auth.uid()
  ) OR
  collection_id IN (
    SELECT collection_id FROM public.collection_members 
    WHERE user_id = auth.uid() OR email = auth.email()
  )
);

-- Update existing RLS policies to include collection-level access

-- Update projects policies
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;
CREATE POLICY "Users can view projects they are members of"
ON public.projects
FOR SELECT
USING (
  -- Original project access
  can_view_project(id) OR
  -- Collection-level access
  collection_id IN (
    SELECT collection_id FROM public.collection_members 
    WHERE user_id = auth.uid() OR email = auth.email()
  )
);

-- Update tasks policies  
DROP POLICY IF EXISTS "Project members can view tasks" ON public.tasks;
CREATE POLICY "Project members can view tasks"
ON public.tasks
FOR SELECT
USING (
  -- Original project access
  (project_id IN (
    SELECT projects.id FROM projects 
    WHERE projects.producer_id = auth.uid()
  )) OR
  (project_id IN (
    SELECT project_members.project_id FROM project_members 
    WHERE (project_members.user_id = auth.uid() OR project_members.email = auth.email())
  )) OR
  -- Collection-level access
  (project_id IN (
    SELECT p.id FROM projects p
    WHERE p.collection_id IN (
      SELECT collection_id FROM collection_members 
      WHERE user_id = auth.uid() OR email = auth.email()
    )
  ))
);

DROP POLICY IF EXISTS "Project members can update tasks based on role" ON public.tasks;
CREATE POLICY "Project members can update tasks based on role"
ON public.tasks
FOR UPDATE
USING (
  -- Original project access  
  (project_id IN (
    SELECT projects.id FROM projects 
    WHERE projects.producer_id = auth.uid()
  )) OR
  (project_id IN (
    SELECT project_members.project_id FROM project_members 
    WHERE ((project_members.user_id = auth.uid() OR project_members.email = auth.email()) 
           AND project_members.role IN ('editor', 'manager'))
  )) OR
  -- Collection-level access
  (project_id IN (
    SELECT p.id FROM projects p
    WHERE p.collection_id IN (
      SELECT collection_id FROM collection_members 
      WHERE (user_id = auth.uid() OR email = auth.email()) 
      AND role IN ('editor', 'manager')
    )
  ))
);

-- Update file_uploads policies
DROP POLICY IF EXISTS "workspace members rw files" ON public.file_uploads;
CREATE POLICY "workspace members rw files"
ON public.file_uploads
FOR ALL
USING (
  -- Original workspace access
  (workspace_id IN (
    SELECT w.id FROM workspaces w 
    WHERE w.owner_id = auth.uid()
  )) OR
  (workspace_id IN (
    SELECT p.workspace_id FROM projects p
    JOIN project_members pm ON p.id = pm.project_id
    WHERE (pm.user_id = auth.uid() OR pm.email = auth.email())
  )) OR
  -- Collection-level access
  (project_id IN (
    SELECT p.id FROM projects p
    WHERE p.collection_id IN (
      SELECT collection_id FROM collection_members 
      WHERE user_id = auth.uid() OR email = auth.email()
    )
  ))
);

-- Create trigger for updated_at
CREATE TRIGGER update_collection_members_updated_at
BEFORE UPDATE ON public.collection_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();