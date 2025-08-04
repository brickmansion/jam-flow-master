import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollectionMembers } from '@/hooks/useCollectionMembers';
import { useAuth } from '@/hooks/useAuth';
import { InviteCollectionMemberModal } from './InviteCollectionMemberModal';
import { CollectionMembersList } from './CollectionMembersList';
import { Users } from 'lucide-react';

interface CollectionCollaboratorsSectionProps {
  collectionId: string;
  producerId: string;
  producerEmail?: string;
}

export function CollectionCollaboratorsSection({ 
  collectionId, 
  producerId, 
  producerEmail 
}: CollectionCollaboratorsSectionProps) {
  const { user } = useAuth();
  const { members, loading, inviteMember, updateMemberRole, removeMember } = useCollectionMembers(collectionId);
  
  const isProducer = user?.id === producerId;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse space-y-2">
            <div className="h-5 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-3 bg-muted rounded w-1/6"></div>
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
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Collection Collaborators</span>
            </CardTitle>
            <CardDescription>
              Manage collection members who can work on all projects in this collection
            </CardDescription>
          </div>
          {isProducer && <InviteCollectionMemberModal onInvite={inviteMember} />}
        </div>
      </CardHeader>
      <CardContent>
        <CollectionMembersList
          members={members}
          isProducer={isProducer}
          onUpdateRole={updateMemberRole}
          onRemoveMember={removeMember}
          producerEmail={producerEmail}
        />
      </CardContent>
    </Card>
  );
}