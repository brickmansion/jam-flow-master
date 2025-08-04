import { supabase } from '@/integrations/supabase/client';

// PHASE 5: Privacy & Data-Retention utilities

export interface ProjectMemberWithRole {
  id: string;
  project_id: string;
  user_id: string | null;
  email: string;
  role: string;
  invited_by: string;
  created_at: string;
  accepted_at: string | null;
  projects?: {
    producer_id: string;
  };
}

/**
 * Filters member emails based on user permissions
 * Only producers, managers, or the member themselves can see the email
 */
export function filterMemberEmailForPrivacy(
  member: ProjectMemberWithRole,
  currentUserId: string | null,
  currentUserRole?: string
): ProjectMemberWithRole {
  if (!currentUserId) {
    return {
      ...member,
      email: '***@***.***' // Hide email for unauthenticated users
    };
  }

  const isProducer = member.projects?.producer_id === currentUserId;
  const isManager = currentUserRole === 'manager' || currentUserRole === 'producer';
  const isOwnEmail = member.user_id === currentUserId;

  // Show full email if user is producer, manager, or viewing their own email
  if (isProducer || isManager || isOwnEmail) {
    return member;
  }

  // Otherwise, mask the email
  const [localPart, domain] = member.email.split('@');
  const maskedEmail = `${localPart.charAt(0)}***@${domain}`;
  
  return {
    ...member,
    email: maskedEmail
  };
}

/**
 * Gets the current user's role in a project
 */
export async function getCurrentUserRoleInProject(
  projectId: string,
  userId: string
): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) return null;

    // Check if user is the producer
    const { data: project } = await supabase
      .from('projects')
      .select('producer_id')
      .eq('id', projectId)
      .single();

    if (project?.producer_id === userId) {
      return 'producer';
    }

    // Check member role
    const { data: member } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    return member?.role || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

/**
 * Sanitizes file paths to prevent directory traversal and information disclosure
 */
export function sanitizeFilePath(originalPath: string): string {
  // Remove any directory traversal attempts
  const sanitized = originalPath
    .replace(/\.\./g, '') // Remove ..
    .replace(/\\/g, '/') // Normalize path separators
    .replace(/\/+/g, '/') // Remove multiple slashes
    .replace(/^\/+/, ''); // Remove leading slashes

  return sanitized;
}

/**
 * Generates a secure file name with UUID prefix
 */
export function generateSecureFileName(originalName: string): string {
  const uuid = crypto.randomUUID();
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${uuid}-${sanitizedName}`;
}
