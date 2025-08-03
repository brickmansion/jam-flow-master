import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AvatarUploader } from '@/components/AvatarUploader';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/hooks/useAuth';
import { Edit, Mail, Calendar, User } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { EditProfileForm } from '@/components/profile/EditProfileForm';
import { ProjectsList } from '@/components/profile/ProjectsList';
import { Skeleton } from '@/components/ui/skeleton';

export default function Profile() {
  const { profile, loading, updateProfile } = useUserProfile();
  const { user, profile: authProfile } = useAuth();
  const [isEditOpen, setIsEditOpen] = useState(false);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Skeleton className="h-32 w-32 rounded-full" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleAvatarUpdate = (url: string) => {
    updateProfile({ avatar_url: url });
  };

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';
  const userRole = authProfile?.role || 'Producer';

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Hero Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <AvatarUploader
                avatarUrl={profile?.avatar_url}
                displayName={displayName}
                onAvatarUpdate={handleAvatarUpdate}
                size="lg"
              />
              
              <div className="flex-1 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">{displayName}</h1>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        <User className="h-3 w-3 mr-1" />
                        {userRole}
                      </Badge>
                    </div>
                  </div>
                  
                  <Drawer open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DrawerTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2">
                        <Edit className="h-4 w-4" />
                        Edit Profile
                      </Button>
                    </DrawerTrigger>
                    <DrawerContent>
                      <DrawerHeader>
                        <DrawerTitle>Edit Profile</DrawerTitle>
                      </DrawerHeader>
                      <EditProfileForm 
                        profile={profile}
                        onSave={() => setIsEditOpen(false)}
                      />
                    </DrawerContent>
                  </Drawer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {user?.email}
                  </div>
                  {profile?.created_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Joined {new Date(profile.created_at).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {profile?.bio && (
                  <p className="text-muted-foreground leading-relaxed">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* My Projects */}
        <Card>
          <CardHeader>
            <CardTitle>My Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectsList />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}