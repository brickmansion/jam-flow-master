-- Create collections table
CREATE TABLE public.collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT,
  release_type TEXT CHECK (release_type IN ('Single', 'EP', 'Album')) DEFAULT 'EP',
  producer_id UUID NOT NULL,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add collection_id to projects table
ALTER TABLE public.projects 
ADD COLUMN collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL;

-- Enable Row Level Security on collections
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- RLS policies for collections
CREATE POLICY "Users can create their own collections" 
ON public.collections 
FOR INSERT 
WITH CHECK (auth.uid() = producer_id);

CREATE POLICY "Users can view their own collections" 
ON public.collections 
FOR SELECT 
USING (auth.uid() = producer_id);

CREATE POLICY "Users can update their own collections" 
ON public.collections 
FOR UPDATE 
USING (auth.uid() = producer_id);

CREATE POLICY "Users can delete their own collections" 
ON public.collections 
FOR DELETE 
USING (auth.uid() = producer_id);

-- Add trigger for automatic timestamp updates on collections
CREATE TRIGGER update_collections_updated_at
BEFORE UPDATE ON public.collections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();