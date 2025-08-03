-- Add 'sessions' to the file_category enum
ALTER TYPE file_category ADD VALUE 'sessions';

-- Create sessions storage bucket (reusing project-files bucket structure)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sessions', 'sessions', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for sessions bucket
CREATE POLICY "Users can upload their own session files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'sessions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own session files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'sessions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own session files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'sessions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own session files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'sessions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);