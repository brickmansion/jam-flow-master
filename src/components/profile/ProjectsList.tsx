import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Music, Clock, Users, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ProjectWithRole {
  id: string;
  title: string;
  artist: string;
  due_date: string | null;
  created_at: string;
  role: 'producer' | 'member';
  member_role?: string;
  task_completion?: number;
}

export function ProjectsList() {
  const [projects, setProjects] = useState<ProjectWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;

      try {
        // Fetch projects where user is producer
        const { data: ownedProjects, error: ownedError } = await supabase
          .from('projects')
          .select('id, title, artist, due_date, created_at')
          .eq('producer_id', user.id);

        if (ownedError) throw ownedError;

        // Fetch projects where user is a member
        const { data: memberProjects, error: memberError } = await supabase
          .from('project_members')
          .select(`
            project_id,
            role,
            projects!inner (
              id,
              title,
              artist,
              due_date,
              created_at
            )
          `)
          .or(`user_id.eq.${user.id},email.eq.${user.email}`);

        if (memberError) throw memberError;

        // Combine and format projects
        const allProjects: ProjectWithRole[] = [
          ...(ownedProjects || []).map(project => ({
            ...project,
            role: 'producer' as const
          })),
          ...(memberProjects || []).map(member => ({
            id: member.projects.id,
            title: member.projects.title,
            artist: member.projects.artist,
            due_date: member.projects.due_date,
            created_at: member.projects.created_at,
            role: 'member' as const,
            member_role: member.role
          }))
        ];

        // Remove duplicates and sort by creation date
        const uniqueProjects = allProjects.filter((project, index, self) => 
          index === self.findIndex(p => p.id === project.id)
        ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setProjects(uniqueProjects);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-8">
        <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No projects yet</h3>
        <p className="text-muted-foreground mb-4">
          You haven't created or been invited to any projects yet.
        </p>
        <Button onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  const getRoleBadge = (project: ProjectWithRole) => {
    if (project.role === 'producer') {
      return <Badge variant="default">Producer</Badge>;
    }
    return (
      <Badge variant="secondary">
        {project.member_role === 'manager' ? 'Manager' : 
         project.member_role === 'editor' ? 'Editor' : 'Viewer'}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <Card key={project.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-foreground truncate">
                    {project.title}
                  </h3>
                  {getRoleBadge(project)}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Music className="h-4 w-4" />
                    <span>{project.artist}</span>
                  </div>
                  
                  {project.due_date && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>Due {formatDate(project.due_date)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>Created {formatDate(project.created_at)}</span>
                  </div>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/project/${project.id}`)}
                className="ml-4"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}