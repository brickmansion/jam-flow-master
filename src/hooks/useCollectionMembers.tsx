import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface CollectionMember {
  id: string;
  collection_id: string;
  user_id?: string;
  email: string;
  role: 'manager' | 'editor' | 'artist';
  accepted_at?: string;
  created_at: string;
  invited_by: string;
}

export function useCollectionMembers(collectionId: string) {
  const [members, setMembers] = useState<CollectionMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchMembers = useCallback(async () => {
    if (!collectionId || !user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('collection_members')
        .select('*')
        .eq('collection_id', collectionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers((data as CollectionMember[]) || []);
    } catch (error) {
      console.error('Error fetching collection members:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch collection members.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [collectionId, user, toast]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const inviteMember = async (email: string, role: CollectionMember['role']) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('collection_members')
        .insert({
          collection_id: collectionId,
          email: email.toLowerCase(),
          role,
          invited_by: user.id,
        });

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'User is already a member of this collection' };
        }
        throw error;
      }

      await fetchMembers();
      toast({
        title: 'Success',
        description: `Invitation sent to ${email}`,
      });
      return { success: true };
    } catch (error) {
      console.error('Error inviting member:', error);
      return { success: false, error: 'Failed to send invitation' };
    }
  };

  const updateMemberRole = async (memberId: string, newRole: CollectionMember['role']) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('collection_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      await fetchMembers();
      toast({
        title: 'Success',
        description: 'Member role updated successfully',
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating member role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update member role',
        variant: 'destructive',
      });
      return { success: false, error: 'Failed to update member role' };
    }
  };

  const removeMember = async (memberId: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('collection_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      await fetchMembers();
      toast({
        title: 'Success',
        description: 'Member removed successfully',
      });
      return { success: true };
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive',
      });
      return { success: false, error: 'Failed to remove member' };
    }
  };

  return {
    members,
    loading,
    inviteMember,
    updateMemberRole,
    removeMember,
    refreshMembers: fetchMembers,
  };
}