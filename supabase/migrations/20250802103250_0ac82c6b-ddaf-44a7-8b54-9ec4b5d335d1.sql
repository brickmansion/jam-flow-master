-- Create enum type for song keys
CREATE TYPE song_key AS ENUM (
  'C major', 'C minor', 'C♯ major', 'C♯ minor', 
  'D major', 'D minor', 'E♭ major', 'E♭ minor',
  'E major', 'E minor', 'F major', 'F minor', 
  'F♯ major', 'F♯ minor', 'G major', 'G minor',
  'A♭ major', 'A♭ minor', 'A major', 'A minor', 
  'B♭ major', 'B♭ minor', 'B major', 'B minor'
);

-- Create projects table with song_key field
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  due_date DATE,
  bpm INTEGER NOT NULL CHECK (bpm >= 40 AND bpm <= 300),
  sample_rate INTEGER NOT NULL CHECK (sample_rate IN (44100, 48000, 88200, 96000)),
  song_key song_key NOT NULL DEFAULT 'C major',
  producer_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own projects" 
ON public.projects 
FOR SELECT 
USING (auth.uid() = producer_id);

CREATE POLICY "Users can create their own projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (auth.uid() = producer_id);

CREATE POLICY "Users can update their own projects" 
ON public.projects 
FOR UPDATE 
USING (auth.uid() = producer_id);

CREATE POLICY "Users can delete their own projects" 
ON public.projects 
FOR DELETE 
USING (auth.uid() = producer_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();