import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useProjectMembers } from './useProjectMembers';

export interface UserPermissions {
  canView: boolean;
  canComment: boolean;
  canEditTasks: boolean;
  canManageProject: boolean;
  canInviteMembers: boolean;
  canDeleteTasks: boolean;
  userRole: 'producer' | 'manager' | 'artist' | 'editor' | null;
}

export function useUserPermissions(projectId: string, producerId: string): UserPermissions {
  const { user } = useAuth();
  const { members } = useProjectMembers(projectId);

  return useMemo(() => {
    if (!user) {
      return {
        canView: false,
        canComment: false,
        canEditTasks: false,
        canManageProject: false,
        canInviteMembers: false,
        canDeleteTasks: false,
        userRole: null,
      };
    }

    // Check if user is the producer
    if (user.id === producerId) {
      return {
        canView: true,
        canComment: true,
        canEditTasks: true,
        canManageProject: true,
        canInviteMembers: true,
        canDeleteTasks: true,
        userRole: 'producer',
      };
    }

    // Find user in project members
    const userMember = members.find(
      (member) => 
        member.user_id === user.id || 
        member.email === user.email
    );

    if (!userMember || !userMember.accepted_at) {
      return {
        canView: false,
        canComment: false,
        canEditTasks: false,
        canManageProject: false,
        canInviteMembers: false,
        canDeleteTasks: false,
        userRole: null,
      };
    }

    const role = userMember.role;

    switch (role) {
      case 'manager':
        return {
          canView: true,
          canComment: true,
          canEditTasks: true, // Can update task status and links
          canManageProject: false,
          canInviteMembers: false,
          canDeleteTasks: false,
          userRole: 'manager',
        };
      
      case 'editor':
        return {
          canView: true,
          canComment: true,
          canEditTasks: true,
          canManageProject: false,
          canInviteMembers: false,
          canDeleteTasks: false,
          userRole: 'editor',
        };
      
      case 'artist':
        return {
          canView: true,
          canComment: true,
          canEditTasks: false,
          canManageProject: false,
          canInviteMembers: false,
          canDeleteTasks: false,
          userRole: 'artist',
        };
      
      default:
        return {
          canView: false,
          canComment: false,
          canEditTasks: false,
          canManageProject: false,
          canInviteMembers: false,
          canDeleteTasks: false,
          userRole: null,
        };
    }
  }, [user, members, producerId]);
}