import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Calendar, Clock, TrendingUp, Music, Users, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Navbar } from '@/components/Navbar';
import { NewProjectModal } from '@/components/modals/NewProjectModal';
import { NewCollectionModal } from '@/components/collections/NewCollectionModal';
import { CollectionCard } from '@/components/collections/CollectionCard';
import { ProjectCollaborators } from '@/components/ProjectCollaborators';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  title: string;
  artist: string;
  due_date: string | null;
  bpm: number;
  sample_rate: number;
  song_key: string;
  producer_id: string;
  created_at: string;
  collection_id?: string | null;
}

interface Collection {
  id: string;
  title: string;
  artist?: string;
  release_type: 'Single' | 'EP' | 'Album';
  due_date?: string;
  project_count: number;
  average_progress: number;
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);

  // Helper function to get demo projects from localStorage or default
  const getDemoProjects = (): Project[] => {
    const stored = localStorage.getItem('demo-projects');
    if (stored) {
      return JSON.parse(stored);
    }
    // Return default demo projects
    return [
      {
        id: 'demo-project-1',
        title: 'Summer Vibes',
        artist: 'The Waves',
        due_date: '2025-08-15',
        bpm: 128,
        sample_rate: 48000,
        song_key: 'G major',
        producer_id: 'demo-user-id',
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: 'demo-project-2',
        title: 'Midnight Sessions',
        artist: 'Luna Eclipse',
        due_date: '2025-08-20',
        bpm: 110,
        sample_rate: 44100,
        song_key: 'A minor',
        producer_id: 'demo-user-id',
        created_at: '2025-01-02T00:00:00Z'
      },
      {
        id: 'demo-project-3',
        title: 'Electric Dreams',
        artist: 'Synth City',
        due_date: null,
        bpm: 140,
        sample_rate: 48000,
        song_key: 'E minor',
        producer_id: 'demo-user-id',
        created_at: '2025-01-03T00:00:00Z'
      }
    ];
  };

  // Helper function to save demo projects to localStorage
  const saveDemoProjects = (projects: Project[]) => {
    localStorage.setItem('demo-projects', JSON.stringify(projects));
  };

  // Function to add a new project (for both demo and real users)
  const addProject = async (projectData: Omit<Project, 'id' | 'created_at' | 'producer_id'>) => {
    if (user?.id === 'demo-user-id') {
      // For demo users, add to localStorage
      const newProject: Project = {
        ...projectData,
        id: `demo-project-${Date.now()}`,
        producer_id: user.id,
        created_at: new Date().toISOString()
      };
      
      const currentProjects = getDemoProjects();
      const updatedProjects = [...currentProjects, newProject];
      saveDemoProjects(updatedProjects);
      setProjects(updatedProjects);
    } else {
      // For real users, save to database
      try {
        const { data, error } = await supabase
          .from('projects')
          .insert({
            title: projectData.title,
            artist: projectData.artist,
            due_date: projectData.due_date,
            bpm: projectData.bpm,
            sample_rate: projectData.sample_rate,
            song_key: projectData.song_key as any,
            producer_id: user?.id
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating project:', error);
          toast({
            title: "Error creating project",
            description: error.message,
            variant: "destructive"
          });
          return;
        }

        // Add to local state
        setProjects(prev => [...prev, data]);
        
        toast({
          title: "Project created",
          description: "Your project has been created successfully.",
        });
      } catch (error) {
        console.error('Error creating project:', error);
        toast({
          title: "Error creating project",
          description: "Could not create project. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchCollections();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      // Check if we're in demo mode
      if (user?.id === 'demo-user-id') {
        // Get demo projects from localStorage or defaults
        const demoProjects = getDemoProjects();
        setProjects(demoProjects);
        // Save defaults to localStorage if not already saved
        if (!localStorage.getItem('demo-projects')) {
          saveDemoProjects(demoProjects);
        }
      } else {
        // For real users, fetch from database
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching projects:', error);
          toast({
            title: "Error loading projects",
            description: error.message,
            variant: "destructive"
          });
          setProjects([]);
        } else {
          setProjects(data || []);
        }
      }
    } catch (error) {
      toast({
        title: "Error loading projects",
        description: "Could not load your projects. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async () => {
    if (user?.id === 'demo-user-id') {
      // Demo collections
      const demoCollections: Collection[] = [
        {
          id: 'demo-collection-1',
          title: 'Summer Vibes - EP',
          artist: 'The Waves',
          release_type: 'EP',
          due_date: '2025-08-30',
          project_count: 3,
          average_progress: 47
        }
      ];
      setCollections(demoCollections);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('collections')
        .select(`
          *,
          projects!projects_collection_id_fkey(id)
        `)
        .eq('producer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate project count and average progress for each collection
      const collectionsWithStats = data?.map(collection => {
        const projectCount = collection.projects?.length || 0;
        const averageProgress = projectCount > 0 
          ? collection.projects.reduce((sum: number, project: any) => sum + Math.floor(Math.random() * 100), 0) / projectCount
          : 0;

        return {
          id: collection.id,
          title: collection.title,
          artist: collection.artist,
          release_type: collection.release_type as 'Single' | 'EP' | 'Album',
          due_date: collection.due_date,
          project_count: projectCount,
          average_progress: averageProgress
        };
      }) || [];

      setCollections(collectionsWithStats);
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  const calculateProgress = async (projectId: string) => {
    // For now, return 0 until database is ready
    return 0;
  };

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDueBadgeVariant = (days: number | null) => {
    if (days === null) return 'secondary';
    if (days < 0) return 'destructive';
    if (days <= 3) return 'destructive';
    if (days <= 7) return 'default';
    return 'secondary';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar title="Dashboard" />
        <div className="p-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-2 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar title="Dashboard" />
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your music collections and projects
            </p>
          </div>
          
          {profile?.role === 'producer' && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowNewCollectionModal(true)}>
                <Folder className="mr-2 h-4 w-4" />
                New Collection
              </Button>
              <Button onClick={() => setShowNewProjectModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-8">
          {/* Collections Section */}
          {collections.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Collections</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {collections.map((collection) => (
                  <CollectionCard 
                    key={collection.id} 
                    collection={collection}
                    onClick={() => navigate(`/collections/${collection.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Ungrouped Projects Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">
                {collections.length > 0 ? 'Ungrouped Projects' : 'Projects'}
              </h2>
            </div>

            {projects.filter(p => !p.collection_id).length === 0 && collections.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                  <p className="text-muted-foreground mb-4">
                    {profile?.role === 'producer' 
                      ? 'Create your first project or collection to get started'
                      : 'You haven\'t been assigned to any projects yet'
                    }
                  </p>
                  {profile?.role === 'producer' && (
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" onClick={() => setShowNewCollectionModal(true)}>
                        <Folder className="mr-2 h-4 w-4" />
                        Create Collection
                      </Button>
                      <Button onClick={() => setShowNewProjectModal(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Project
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.filter(p => !p.collection_id).map((project) => {
                  const daysUntilDue = getDaysUntilDue(project.due_date);
                  
                  return (
                    <Card 
                      key={project.id} 
                      className="group hover:shadow-md transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-lg">
                              {project.title}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">{project.artist}</p>
                          </div>
                          
                          {project.due_date && (
                            <Badge variant={getDueBadgeVariant(daysUntilDue)}>
                              {daysUntilDue === null ? 'No due date' :
                               daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` :
                               daysUntilDue === 0 ? 'Due today' :
                               `${daysUntilDue} days left`}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {project.bpm} BPM
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {project.sample_rate / 1000}kHz
                            </div>
                            <div className="flex items-center gap-1">
                              <Music className="h-3 w-3" />
                              {project.song_key}
                            </div>
                          </div>
                          
                          {project.due_date && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Due {new Date(project.due_date).toLocaleDateString()}
                            </div>
                          )}
                          
                          <ProjectCollaborators 
                            projectId={project.id}
                            producerEmail={user?.email}
                          />
                          
                          <ProjectProgress projectId={project.id} />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <NewProjectModal 
        open={showNewProjectModal}
        onOpenChange={setShowNewProjectModal}
        onProjectCreated={async (projectData) => {
          await addProject(projectData);
        }}
      />

      <NewCollectionModal 
        open={showNewCollectionModal}
        onOpenChange={setShowNewCollectionModal}
        onCollectionCreated={() => {
          fetchCollections();
        }}
      />
    </div>
  );
}

function ProjectProgress({ projectId }: { projectId: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Set demo progress for demo projects
    if (projectId.startsWith('demo-')) {
      const demoProgress = {
        'demo-project-1': 75,
        'demo-project-2': 45,
        'demo-project-3': 20
      };
      setProgress(demoProgress[projectId as keyof typeof demoProgress] || 0);
    } else {
      // For real projects, set random progress until database is ready
      setProgress(Math.floor(Math.random() * 100));
    }
  }, [projectId]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Progress</span>
        <span className="font-medium">{progress}%</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}