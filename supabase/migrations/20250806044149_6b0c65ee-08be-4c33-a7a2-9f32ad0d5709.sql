-- Check if trigger exists and fix user_profiles policies for signup
DO $$
BEGIN
  -- Drop existing trigger if it exists
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
EXCEPTION
  WHEN OTHERS THEN NULL;
END
$$;

-- Recreate the trigger to ensure it exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, prefs)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name', 
      NEW.raw_user_meta_data ->> 'full_name', 
      NEW.email,
      ''
    ),
    '{
      "theme": "system",
      "dateFormat": "MM/DD/YYYY",
      "notifications": {
        "invite": true,
        "taskReady": true,
        "commentMention": true
      }
    }'::jsonb
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error for debugging but don't fail the signup
    RAISE LOG 'Error in handle_new_user: % %', SQLSTATE, SQLERRM;
    -- Still try to insert with minimal data to not block signup
    INSERT INTO public.user_profiles (id, display_name, prefs)
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      '{
        "theme": "system",
        "dateFormat": "MM/DD/YYYY",
        "notifications": {
          "invite": true,
          "taskReady": true,
          "commentMention": true
        }
      }'::jsonb
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$function$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update the INSERT policy to allow the trigger to work
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (true);