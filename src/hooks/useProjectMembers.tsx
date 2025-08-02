import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string | null;
  email: string;
  role: 'manager' | 'producer' | 'artist' | 'editor';
  invited_by: string;
  created_at: string;
  accepted_at: string | null;
}

export function useProjectMembers(projectId: string) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMembers = async () => {
    if (!projectId) return;

    try {
      // For demo mode, return mock data
      if (projectId.startsWith('demo-')) {
        const demoMembers: ProjectMember[] = [
          {
            id: 'demo-member-1',
            project_id: projectId,
            user_id: null,
            email: 'manager@example.com',
            role: 'manager',
            invited_by: 'demo-user-id',
            created_at: new Date().toISOString(),
            accepted_at: null,
          },
          {
            id: 'demo-member-2',
            project_id: projectId,
            user_id: null,
            email: 'artist@example.com',
            role: 'artist',
            invited_by: 'demo-user-id',
            created_at: new Date().toISOString(),
            accepted_at: null,
          },
        ];
        setMembers(demoMembers);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMembers((data || []) as ProjectMember[]);
    } catch (error: any) {
      console.error('Error fetching project members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project members',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const inviteMember = async (email: string, role: ProjectMember['role']) => {
    try {
      // For demo mode, simulate adding member
      if (projectId.startsWith('demo-')) {
        const newMember: ProjectMember = {
          id: `demo-member-${Date.now()}`,
          project_id: projectId,
          user_id: null,
          email: email.toLowerCase().trim(),
          role,
          invited_by: 'demo-user-id',
          created_at: new Date().toISOString(),
          accepted_at: null,
        };

        setMembers(prev => [...prev, newMember]);
        
        toast({
          title: 'Member invited',
          description: `Invitation sent to ${email} (Demo Mode)`,
        });

        return { success: true };
      }

      const { data, error } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          email: email.toLowerCase().trim(),
          role,
          invited_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setMembers(prev => [...prev, data as ProjectMember]);
      
      toast({
        title: 'Member invited',
        description: `Invitation sent to ${email}`,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error inviting member:', error);
      
      let message = 'Failed to invite member';
      if (error.code === '23505') {
        message = 'This email is already invited to the project';
      }
      
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      return { success: false, error: message };
    }
  };

  const updateMemberRole = async (memberId: string, newRole: ProjectMember['role']) => {
    try {
      // For demo mode, just update locally
      if (projectId.startsWith('demo-')) {
        setMembers(prev => 
          prev.map(member => 
            member.id === memberId ? { ...member, role: newRole } : member
          )
        );

        toast({
          title: 'Role updated',
          description: 'Member role has been updated (Demo Mode)',
        });
        return;
      }

      const { error } = await supabase
        .from('project_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prev => 
        prev.map(member => 
          member.id === memberId ? { ...member, role: newRole } : member
        )
      );

      toast({
        title: 'Role updated',
        description: 'Member role has been updated',
      });
    } catch (error: any) {
      console.error('Error updating member role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update member role',
        variant: 'destructive',
      });
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      // For demo mode, just remove locally
      if (projectId.startsWith('demo-')) {
        setMembers(prev => prev.filter(member => member.id !== memberId));

        toast({
          title: 'Member removed',
          description: 'Member has been removed from the project (Demo Mode)',
        });
        return;
      }

      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prev => prev.filter(member => member.id !== memberId));

      toast({
        title: 'Member removed',
        description: 'Member has been removed from the project',
      });
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [projectId]);

  return {
    members,
    loading,
    inviteMember,
    updateMemberRole,
    removeMember,
    refetch: fetchMembers,
  };
}