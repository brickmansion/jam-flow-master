import { useProjectMembers } from '@/hooks/useProjectMembers';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

interface ProjectCollaboratorsProps {
  projectId: string;
  producerEmail?: string;
}

export function ProjectCollaborators({ projectId, producerEmail }: ProjectCollaboratorsProps) {
  const { members, loading } = useProjectMembers(projectId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-3 w-3" />
        <div className="h-3 w-16 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  // Include producer in count
  const totalMembers = members.length + (producerEmail ? 1 : 0);

  if (totalMembers === 0) {
    return null;
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'producer': return 'bg-yellow-500';
      case 'manager': return 'bg-blue-500';
      case 'artist': return 'bg-purple-500';
      case 'editor': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  const displayMembers = members.slice(0, 3); // Show max 3 avatars
  const hasMore = totalMembers > 3;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-3 w-3" />
        <div className="flex items-center gap-1">
          {/* Producer avatar if email provided */}
          {producerEmail && (
            <Tooltip>
              <TooltipTrigger>
                <Avatar className="h-5 w-5 border border-background">
                  <AvatarFallback className={`text-white text-[10px] ${getRoleColor('producer')}`}>
                    {getInitials(producerEmail)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <p className="font-medium">{producerEmail}</p>
                  <Badge variant="secondary" className="text-xs mt-1">Producer</Badge>
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Member avatars */}
          {displayMembers.map((member) => (
            <Tooltip key={member.id}>
              <TooltipTrigger>
                <Avatar className="h-5 w-5 border border-background">
                  <AvatarFallback className={`text-white text-[10px] ${getRoleColor(member.role)}`}>
                    {getInitials(member.email)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <p className="font-medium">{member.email}</p>
                  <Badge variant="secondary" className="text-xs mt-1 capitalize">
                    {member.role}
                  </Badge>
                  {!member.accepted_at && (
                    <p className="text-xs text-muted-foreground mt-1">Pending</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}

          {/* More indicator */}
          {hasMore && (
            <Tooltip>
              <TooltipTrigger>
                <div className="h-5 w-5 border border-background rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                  +{totalMembers - 3}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{totalMembers - 3} more collaborator{totalMembers - 3 !== 1 ? 's' : ''}</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          <span className="ml-1">
            {totalMembers} collaborator{totalMembers !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}