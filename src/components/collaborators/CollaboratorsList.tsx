import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Crown, UserCheck, Clock } from 'lucide-react';
import { ProjectMember } from '@/hooks/useProjectMembers';

interface CollaboratorsListProps {
  members: ProjectMember[];
  isProducer: boolean;
  onUpdateRole: (memberId: string, newRole: ProjectMember['role']) => void;
  onRemoveMember: (memberId: string) => void;
  producerEmail?: string;
}

export function CollaboratorsList({ 
  members, 
  isProducer, 
  onUpdateRole, 
  onRemoveMember,
  producerEmail 
}: CollaboratorsListProps) {
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'producer': return <Crown className="w-3 h-3" />;
      case 'manager': return <UserCheck className="w-3 h-3" />;
      default: return null;
    }
  };

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

  // Add producer as first member if not already in the list
  const allMembers = [...members];
  if (producerEmail && !members.find(m => m.email === producerEmail)) {
    allMembers.unshift({
      id: 'producer',
      project_id: '',
      user_id: 'producer',
      email: producerEmail,
      role: 'producer' as const,
      invited_by: '',
      created_at: '',
      accepted_at: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-3">
      {allMembers.map((member) => (
        <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className={`text-white text-xs ${getRoleColor(member.role)}`}>
                {getInitials(member.email)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium truncate">
                  {member.email}
                </p>
                {!member.accepted_at && (
                  <Clock className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {getRoleIcon(member.role)}
                  <span className="ml-1 capitalize">{member.role}</span>
                </Badge>
                {!member.accepted_at && (
                  <span className="text-xs text-muted-foreground">Pending</span>
                )}
              </div>
            </div>
          </div>

          {isProducer && member.role !== 'producer' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="p-2">
                  <Select 
                    value={member.role} 
                    onValueChange={(newRole: ProjectMember['role']) => onUpdateRole(member.id, newRole)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="artist">Artist</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DropdownMenuItem 
                  onClick={() => onRemoveMember(member.id)}
                  className="text-red-600"
                >
                  Remove Member
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ))}
    </div>
  );
}