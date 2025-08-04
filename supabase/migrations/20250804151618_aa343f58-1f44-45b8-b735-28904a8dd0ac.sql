-- Enable pg_cron extension + retention schedule

-- Enable extension once
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Make sure search_path is safe
SET search_path = public;

-- Drop any prior job with same name
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'delete_old_sessions';

-- Schedule nightly cleanup (02:30 UTC) 
-- Using correct table name 'file_uploads' and category 'sessions'
SELECT cron.schedule(
  'delete_old_sessions',
  '30 2 * * *',  -- minute hour dom mon dow
  $$ 
    DELETE FROM public.file_uploads
    WHERE category = 'sessions'
      AND created_at < now() - interval '730 days';
  $$
);