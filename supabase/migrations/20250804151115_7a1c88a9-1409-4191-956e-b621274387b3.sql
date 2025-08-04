-- PHASE 5: Set up data retention cron job
-- This requires pg_cron extension to be enabled

-- Create cron job to run data retention cleanup daily at 2 AM
SELECT cron.schedule(
  'data-retention-cleanup',
  '0 2 * * *', -- Daily at 2 AM
  $$
  SELECT
    net.http_post(
        url:='https://ayqvnclmnepqyhvjqxjy.supabase.co/functions/v1/data-retention-cleanup',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cXZuY2xtbmVwcXlodmpxeGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMjUzMTUsImV4cCI6MjA2OTcwMTMxNX0.8VIKJEes7MISktoJ9OW4AgFiIJdKKfOa5OfscS5CYqg"}'::jsonb,
        body:=concat('{"timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);