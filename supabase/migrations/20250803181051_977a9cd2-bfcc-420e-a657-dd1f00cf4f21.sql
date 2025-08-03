-- Update the file upload policies to include the new 'assistant' role
-- First, drop the existing policies that reference the role column

DROP POLICY IF EXISTS "Producers and editors can upload files" ON file_uploads;
DROP POLICY IF EXISTS "Producers and editors can delete files" ON file_uploads;

-- Recreate the policies with updated role checks
CREATE POLICY "Producers and editors can upload files" 
ON file_uploads 
FOR INSERT 
WITH CHECK (
  (project_id IN ( 
    SELECT projects.id
    FROM projects
    WHERE (projects.producer_id = auth.uid())
  )) OR 
  (project_id IN ( 
    SELECT project_members.project_id
    FROM project_members
    WHERE (
      ((project_members.user_id = auth.uid()) OR (project_members.email = auth.email())) 
      AND (project_members.role = ANY (ARRAY['editor'::text, 'manager'::text, 'producer'::text]))
    )
  ))
);

CREATE POLICY "Producers and editors can delete files" 
ON file_uploads 
FOR DELETE 
USING (
  (project_id IN ( 
    SELECT projects.id
    FROM projects
    WHERE (projects.producer_id = auth.uid())
  )) OR 
  (project_id IN ( 
    SELECT project_members.project_id
    FROM project_members
    WHERE (
      ((project_members.user_id = auth.uid()) OR (project_members.email = auth.email())) 
      AND (project_members.role = ANY (ARRAY['editor'::text, 'manager'::text, 'producer'::text]))
    )
  ))
);