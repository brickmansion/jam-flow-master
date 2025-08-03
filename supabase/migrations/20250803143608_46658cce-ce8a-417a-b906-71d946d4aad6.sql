-- Create file categories enum
CREATE TYPE public.file_category AS ENUM ('stems', 'mixes', 'references', 'notes');

-- Create file uploads table
CREATE TABLE public.file_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  uploaded_by UUID NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  category file_category NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add premium_uploads flag to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN premium_uploads BOOLEAN NOT NULL DEFAULT false;

-- Enable RLS on file_uploads
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

-- Create policies for file_uploads
CREATE POLICY "Project members can view files" 
ON public.file_uploads 
FOR SELECT 
USING (
  project_id IN (
    SELECT projects.id 
    FROM projects 
    WHERE projects.producer_id = auth.uid()
  ) 
  OR 
  project_id IN (
    SELECT project_members.project_id 
    FROM project_members 
    WHERE (project_members.user_id = auth.uid() OR project_members.email = auth.email())
  )
);

CREATE POLICY "Producers and editors can upload files" 
ON public.file_uploads 
FOR INSERT 
WITH CHECK (
  project_id IN (
    SELECT projects.id 
    FROM projects 
    WHERE projects.producer_id = auth.uid()
  ) 
  OR 
  project_id IN (
    SELECT project_members.project_id 
    FROM project_members 
    WHERE (
      (project_members.user_id = auth.uid() OR project_members.email = auth.email()) 
      AND project_members.role IN ('editor', 'manager')
    )
  )
);

CREATE POLICY "Producers and editors can delete files" 
ON public.file_uploads 
FOR DELETE 
USING (
  project_id IN (
    SELECT projects.id 
    FROM projects 
    WHERE projects.producer_id = auth.uid()
  ) 
  OR 
  project_id IN (
    SELECT project_members.project_id 
    FROM project_members 
    WHERE (
      (project_members.user_id = auth.uid() OR project_members.email = auth.email()) 
      AND project_members.role IN ('editor', 'manager')
    )
  )
);

-- Create storage buckets for project files
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', false);

-- Create storage policies
CREATE POLICY "Project members can view files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'project-files' 
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT projects.id 
    FROM projects 
    WHERE projects.producer_id = auth.uid()
    UNION
    SELECT project_members.project_id 
    FROM project_members 
    WHERE (project_members.user_id = auth.uid() OR project_members.email = auth.email())
  )
);

CREATE POLICY "Producers and editors can upload files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'project-files' 
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT projects.id 
    FROM projects 
    WHERE projects.producer_id = auth.uid()
    UNION
    SELECT project_members.project_id 
    FROM project_members 
    WHERE (
      (project_members.user_id = auth.uid() OR project_members.email = auth.email()) 
      AND project_members.role IN ('editor', 'manager')
    )
  )
);

CREATE POLICY "Producers and editors can delete files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'project-files' 
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT projects.id 
    FROM projects 
    WHERE projects.producer_id = auth.uid()
    UNION
    SELECT project_members.project_id 
    FROM project_members 
    WHERE (
      (project_members.user_id = auth.uid() OR project_members.email = auth.email()) 
      AND project_members.role IN ('editor', 'manager')
    )
  )
);

-- Create function to automatically increment version numbers
CREATE OR REPLACE FUNCTION public.get_next_file_version(
  p_project_id UUID,
  p_category file_category
) RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(MAX(version), 0) + 1
  FROM public.file_uploads
  WHERE project_id = p_project_id AND category = p_category;
$$;

-- Create trigger to update timestamps
CREATE TRIGGER update_file_uploads_updated_at
BEFORE UPDATE ON public.file_uploads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();