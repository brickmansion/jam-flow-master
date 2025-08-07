-- Fix the handle_new_user function to include premium_uploads column
-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the existing function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the updated function with premium_uploads column
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Log the trigger execution
    RAISE LOG 'handle_new_user trigger called for user: %', NEW.id;
    
    -- Check if user profile already exists
    IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.id) THEN
        RAISE LOG 'User profile already exists for user: %', NEW.id;
        RETURN NEW;
    END IF;
    
    -- Try to insert the user profile with all required columns
    INSERT INTO public.user_profiles (id, display_name, prefs, premium_uploads)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data ->> 'display_name', 
            NEW.raw_user_meta_data ->> 'full_name', 
            NEW.email,
            'User'
        ),
        '{
          "theme": "system",
          "dateFormat": "MM/DD/YYYY",
          "notifications": {
            "invite": true,
            "taskReady": true,
            "commentMention": true
          }
        }'::jsonb,
        false  -- Set premium_uploads to false by default
    );
    
    RAISE LOG 'Successfully created user profile for user: %', NEW.id;
    RETURN NEW;
    
EXCEPTION
    WHEN unique_violation THEN
        RAISE LOG 'User profile already exists (unique violation) for user: %', NEW.id;
        RETURN NEW;
    WHEN OTHERS THEN
        RAISE LOG 'Error in handle_new_user for user %: % %', NEW.id, SQLSTATE, SQLERRM;
        -- Don't fail the signup, just return NEW
        RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();