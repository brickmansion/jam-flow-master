-- PHASE 1: Critical RLS / Role Escalation Fixes

-- 1. Add user_id enforcement constraint
ALTER TABLE project_members 
ADD CONSTRAINT user_id_required 
CHECK (user_id IS NOT NULL OR email IS NOT NULL);

-- 2. Create trigger to auto-set user_id when email matches auth.email()
CREATE OR REPLACE FUNCTION public.auto_set_user_id_on_project_members()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = auth.email() AND NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_set_user_id_trigger
  BEFORE INSERT OR UPDATE ON public.project_members
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_user_id_on_project_members();

-- 3. Prevent role escalation - users cannot upgrade their own role
CREATE POLICY "cannot_self_upgrade_role" 
ON public.project_members 
FOR UPDATE 
USING (user_id != auth.uid());

-- 4. Producer role validation trigger (since constraints can't use subqueries)
CREATE OR REPLACE FUNCTION public.validate_producer_role_assignment()
RETURNS TRIGGER AS $$
DECLARE
  project_producer_id UUID;
BEGIN
  IF NEW.role = 'producer' THEN
    SELECT producer_id INTO project_producer_id 
    FROM projects 
    WHERE id = NEW.project_id;
    
    IF project_producer_id != auth.uid() THEN
      RAISE EXCEPTION 'Only project producers can assign producer role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER validate_producer_role_trigger
  BEFORE INSERT OR UPDATE ON public.project_members
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_producer_role_assignment();