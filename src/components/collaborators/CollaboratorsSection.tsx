import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useProjectMembers } from '@/hooks/useProjectMembers';
import { useAuth } from '@/hooks/useAuth';
import { InviteMemberModal } from './InviteMemberModal';
import { CollaboratorsList } from './CollaboratorsList';
import { Users } from 'lucide-react';

interface CollaboratorsSectionProps {
  projectId: string;
  producerId: string;
  producerEmail?: string;
}

export function CollaboratorsSection({ projectId, producerId, producerEmail }: CollaboratorsSectionProps) {
  const { user } = useAuth();
  const { members, loading, inviteMember, updateMemberRole, removeMember } = useProjectMembers(projectId);
  
  const isProducer = user?.id === producerId;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Collaborators</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
                <div className="w-8 h-8 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="h-3 bg-muted rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Collaborators</span>
            </CardTitle>
            <CardDescription>
              Manage team members and their roles
            </CardDescription>
          </div>
          {isProducer && <InviteMemberModal onInvite={inviteMember} />}
        </div>
      </CardHeader>
      <CardContent>
        <CollaboratorsList
          members={members}
          isProducer={isProducer}
          onUpdateRole={updateMemberRole}
          onRemoveMember={removeMember}
          producerEmail={producerEmail}
        />
        
        {members.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No collaborators yet</p>
            {isProducer && (
              <p className="text-sm">Invite team members to start collaborating</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}