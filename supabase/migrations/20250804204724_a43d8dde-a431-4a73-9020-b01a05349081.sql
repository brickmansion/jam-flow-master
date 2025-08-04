-- Allow service role to insert invitation tokens and rate limit records
-- These are needed for the send-invite-email edge function

-- Update invitation_tokens policies to allow service role inserts
DROP POLICY IF EXISTS "Service role can insert invitation tokens" ON public.invitation_tokens;
CREATE POLICY "Service role can insert invitation tokens" 
ON public.invitation_tokens 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Update invitation_rate_limit policies to allow service role inserts
DROP POLICY IF EXISTS "Service role can insert rate limit records" ON public.invitation_rate_limit;
CREATE POLICY "Service role can insert rate limit records" 
ON public.invitation_rate_limit 
FOR INSERT 
TO service_role
WITH CHECK (true);