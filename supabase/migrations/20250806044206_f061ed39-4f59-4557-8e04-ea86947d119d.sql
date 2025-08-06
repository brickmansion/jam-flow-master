-- Fix the user_profiles INSERT policy to be more secure while allowing signup
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;

-- Create a more secure policy that allows inserts only for the user's own profile
-- but also allows the trigger to work during signup
CREATE POLICY "Users can insert their own profile" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);