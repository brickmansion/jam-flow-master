import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MoreHorizontal, Trash2, Crown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CollectionMember } from '@/hooks/useCollectionMembers';

interface CollectionMembersListProps {
  members: CollectionMember[];
  isProducer: boolean;
  onUpdateRole: (memberId: string, role: CollectionMember['role']) => Promise<{ success: boolean; error?: string }>;
  onRemoveMember: (memberId: string) => Promise<{ success: boolean; error?: string }>;
  producerEmail?: string;
}

export function CollectionMembersList({
  members,
  isProducer,
  onUpdateRole,
  onRemoveMember,
  producerEmail
}: CollectionMembersListProps) {
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});

  const handleRoleChange = async (memberId: string, newRole: CollectionMember['role']) => {
    setLoadingActions(prev => ({ ...prev, [memberId]: true }));
    await onUpdateRole(memberId, newRole);
    setLoadingActions(prev => ({ ...prev, [memberId]: false }));
  };

  const handleRemoveMember = async (memberId: string) => {
    setLoadingActions(prev => ({ ...prev, [memberId]: true }));
    await onRemoveMember(memberId);
    setLoadingActions(prev => ({ ...prev, [memberId]: false }));
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'manager': return 'default';
      case 'editor': return 'secondary';
      case 'artist': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager': return 'text-blue-600 dark:text-blue-400';
      case 'editor': return 'text-green-600 dark:text-green-400';
      case 'artist': return 'text-purple-600 dark:text-purple-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      {/* Producer */}
      {producerEmail && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarFallback>
                <Crown className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">Producer</div>
              <div className="text-sm text-muted-foreground">{producerEmail}</div>
            </div>
          </div>
          <Badge variant="default" className="bg-yellow-500 text-white border-yellow-600">
            <Crown className="h-3 w-3 mr-1" />
            Producer
          </Badge>
        </div>
      )}

      {/* Collection Members */}
      {members.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No collection members yet. Invite team members to collaborate on all projects in this collection.</p>
        </div>
      ) : (
        members.map((member) => (
          <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarFallback>
                  {member.email[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <div className="font-medium">{member.email}</div>
                {!member.accepted_at && (
                  <Badge variant="outline" className="text-xs mt-1">
                    Pending invitation
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {isProducer ? (
                <Select
                  value={member.role}
                  onValueChange={(value: CollectionMember['role']) => handleRoleChange(member.id, value)}
                  disabled={loadingActions[member.id]}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="artist">Artist</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant={getRoleBadgeVariant(member.role)} className={getRoleColor(member.role)}>
                  {member.role}
                </Badge>
              )}

              {isProducer && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      disabled={loadingActions[member.id]}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Member
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Collection Member</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove {member.email} from this collection? 
                            They will lose access to all projects in this collection.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveMember(member.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove Member
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}