-- Debug and fix the signup trigger issue

-- First, let's check if we can create a test user profile manually
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
BEGIN
    RAISE LOG 'Testing user profile creation with test ID: %', test_user_id;
    
    -- Test if we can insert directly
    INSERT INTO public.user_profiles (id, display_name, prefs)
    VALUES (
        test_user_id,
        'Test User',
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
    
    RAISE LOG 'Successfully inserted test user profile';
    
    -- Clean up the test
    DELETE FROM public.user_profiles WHERE id = test_user_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error creating test user profile: % %', SQLSTATE, SQLERRM;
END
$$;

-- Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Log the trigger execution
    RAISE LOG 'handle_new_user trigger called for user: %', NEW.id;
    
    -- Check if user profile already exists
    IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.id) THEN
        RAISE LOG 'User profile already exists for user: %', NEW.id;
        RETURN NEW;
    END IF;
    
    -- Try to insert the user profile
    INSERT INTO public.user_profiles (id, display_name, prefs)
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
        }'::jsonb
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
$function$;