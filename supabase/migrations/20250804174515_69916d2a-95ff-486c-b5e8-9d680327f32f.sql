-- Fix infinite recursion in collection_members RLS policy
-- The issue is that the policy was self-referencing the same table

-- Drop the problematic policy
DROP POLICY IF EXISTS "Collection members can view other collection members" ON public.collection_members;

-- Create a corrected policy that doesn't cause infinite recursion
CREATE POLICY "Collection members can view other collection members"
ON public.collection_members
FOR SELECT
USING (
  -- Only allow if user is the collection producer
  collection_id IN (
    SELECT id FROM public.collections 
    WHERE producer_id = auth.uid()
  )
);