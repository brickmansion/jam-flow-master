import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Plus, Calendar, Folder } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Collection {
  id: string;
  title: string;
  artist?: string;
  release_type: 'Single' | 'EP' | 'Album';
  due_date?: string;
  created_at: string;
}

interface Project {
  id: string;
  title: string;
  artist: string;
  due_date?: string;
  bpm: number;
  sample_rate: number;
  song_key: string;
  created_at: string;
}

export const CollectionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [collection, setCollection] = useState<Collection | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && user) {
      fetchCollectionData();
    }
  }, [id, user]);

  const fetchCollectionData = async () => {
    if (!id || !user) return;

    try {
      // Fetch collection details
      const { data: collectionData, error: collectionError } = await supabase
        .from('collections')
        .select('*')
        .eq('id', id)
        .eq('producer_id', user.id)
        .single();

      if (collectionError) throw collectionError;
      setCollection(collectionData as Collection);

      // Fetch projects in this collection
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('collection_id', id)
        .eq('producer_id', user.id)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);
    } catch (error) {
      console.error('Error fetching collection:', error);
      toast({
        title: 'Error',
        description: 'Failed to load collection details.',
        variant: 'destructive',
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (project: Project) => {
    // Placeholder progress calculation
    return Math.floor(Math.random() * 100);
  };

  const getReleaseTypeColor = (type: string) => {
    switch (type) {
      case 'Single': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'EP': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'Album': return 'bg-green-500/10 text-green-600 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getDueBadgeVariant = (dueDate?: string) => {
    if (!dueDate) return 'secondary';
    
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'destructive';
    if (diffDays <= 7) return 'destructive';
    if (diffDays <= 14) return 'secondary';
    return 'default';
  };

  const averageProgress = projects.length > 0 
    ? projects.reduce((sum, project) => sum + calculateProgress(project), 0) / projects.length 
    : 0;

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Collection not found</h2>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Collection Details</h1>
          </div>
        </div>

        {/* Collection Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Folder className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle className="text-xl">{collection.title}</CardTitle>
                  {collection.artist && (
                    <p className="text-muted-foreground mt-1">{collection.artist}</p>
                  )}
                </div>
              </div>
              <Badge 
                variant="outline" 
                className={getReleaseTypeColor(collection.release_type)}
              >
                {collection.release_type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Overall Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(averageProgress)}%
                  </span>
                </div>
                <Progress value={averageProgress} className="h-3" />
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{projects.length}</div>
                <div className="text-sm text-muted-foreground">
                  {projects.length === 1 ? 'Track' : 'Tracks'}
                </div>
              </div>

              {collection.due_date && (
                <div className="text-center">
                  <Badge variant={getDueBadgeVariant(collection.due_date)} className="text-sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    Due {format(new Date(collection.due_date), 'MMM dd, yyyy')}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Projects Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Tracks in Collection</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Existing Project
            </Button>
          </div>

          {projects.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No tracks yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start building your collection by adding existing projects or creating new ones.
                </p>
                <Button>Add Project</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card 
                  key={project.id} 
                  className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold leading-tight">{project.title}</h3>
                        <p className="text-sm text-muted-foreground">{project.artist}</p>
                      </div>
                      {project.due_date && (
                        <Badge variant={getDueBadgeVariant(project.due_date)} className="text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          {format(new Date(project.due_date), 'MMM dd')}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Progress</span>
                        <span className="text-sm text-muted-foreground">
                          {calculateProgress(project)}%
                        </span>
                      </div>
                      <Progress value={calculateProgress(project)} className="h-2" />
                      
                      <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                        <div>BPM: {project.bpm}</div>
                        <div>Key: {project.song_key}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};