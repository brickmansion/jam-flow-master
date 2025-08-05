-- Fix the handle_new_user function to handle missing metadata gracefully
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