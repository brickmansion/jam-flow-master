-- Add additional RLS policies for service role on invitation tables
-- These provide full CRUD access needed for the send-invite-email edge function

-- Additional policies for invitation_tokens table
CREATE POLICY "Service role can read invitation tokens" 
ON public.invitation_tokens 
FOR SELECT 
TO service_role 
USING (true);

CREATE POLICY "Service role can update invitation tokens" 
ON public.invitation_tokens 
FOR UPDATE 
TO service_role 
USING (true)
WITH CHECK (true);

-- Additional policies for invitation_rate_limit table  
CREATE POLICY "Service role can read rate limits" 
ON public.invitation_rate_limit 
FOR SELECT 
TO service_role 
USING (true);

CREATE POLICY "Service role can update rate limits" 
ON public.invitation_rate_limit 
FOR UPDATE 
TO service_role 
USING (true)
WITH CHECK (true);