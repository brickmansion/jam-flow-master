-- Create project_members table for collaboration
CREATE TABLE public.project_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- null until invite accepted
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager', 'producer', 'artist', 'editor')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(project_id, email)
);

-- Enable RLS
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Producers can invite others to their projects
CREATE POLICY "Producers can invite to their projects" 
ON public.project_members 
FOR INSERT 
WITH CHECK (
  project_id IN (
    SELECT id FROM public.projects WHERE producer_id = auth.uid()
  )
);

-- Producers can manage members of their projects
CREATE POLICY "Producers can manage their project members" 
ON public.project_members 
FOR UPDATE 
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE producer_id = auth.uid()
  )
);

-- Producers can remove members from their projects
CREATE POLICY "Producers can remove members from their projects" 
ON public.project_members 
FOR DELETE 
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE producer_id = auth.uid()
  )
);

-- All project members can view other members of projects they belong to
CREATE POLICY "Project members can view other members" 
ON public.project_members 
FOR SELECT 
USING (
  project_id IN (
    SELECT project_id FROM public.project_members 
    WHERE user_id = auth.uid() OR email = auth.email()
  ) OR 
  project_id IN (
    SELECT id FROM public.projects WHERE producer_id = auth.uid()
  )
);

-- Update projects table to allow project members to view projects
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;

CREATE POLICY "Users can view projects they are members of" 
ON public.projects 
FOR SELECT 
USING (
  producer_id = auth.uid() OR
  id IN (
    SELECT project_id FROM public.project_members 
    WHERE user_id = auth.uid() OR email = auth.email()
  )
);

-- Update tasks policies to allow project members to interact with tasks
DROP POLICY IF EXISTS "Users can view tasks for their projects" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks for their projects" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks for their projects" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks for their projects" ON public.tasks;

-- Project members can view tasks
CREATE POLICY "Project members can view tasks" 
ON public.tasks 
FOR SELECT 
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE producer_id = auth.uid()
  ) OR
  project_id IN (
    SELECT project_id FROM public.project_members 
    WHERE user_id = auth.uid() OR email = auth.email()
  )
);

-- Only producers can create tasks initially
CREATE POLICY "Producers can create tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  project_id IN (
    SELECT id FROM public.projects WHERE producer_id = auth.uid()
  )
);

-- Project members can update tasks based on their role
CREATE POLICY "Project members can update tasks based on role" 
ON public.tasks 
FOR UPDATE 
USING (
  -- Producers can update any task in their projects
  project_id IN (
    SELECT id FROM public.projects WHERE producer_id = auth.uid()
  ) OR
  -- Editors can update tasks
  project_id IN (
    SELECT project_id FROM public.project_members 
    WHERE (user_id = auth.uid() OR email = auth.email()) 
    AND role = 'editor'
  ) OR
  -- Managers can update task status and external_link only
  project_id IN (
    SELECT project_id FROM public.project_members 
    WHERE (user_id = auth.uid() OR email = auth.email()) 
    AND role = 'manager'
  )
);

-- Only producers can delete tasks
CREATE POLICY "Producers can delete tasks" 
ON public.tasks 
FOR DELETE 
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE producer_id = auth.uid()
  )
);