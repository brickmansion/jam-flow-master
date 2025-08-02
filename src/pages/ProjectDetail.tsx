import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, TrendingUp, Music, Edit2, Check, X } from 'lucide-react';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    bpm: '',
    sample_rate: '',
    song_key: ''
  });

  useEffect(() => {
    if (id) {
      fetchProject(id);
    }
  }, [id]);

  const fetchProject = async (projectId: string) => {
    try {
      // Check if we're in demo mode and this is a demo project
      if (user?.id === 'demo-user-id' && projectId.startsWith('demo-')) {
        // Get all demo projects from localStorage
        const stored = localStorage.getItem('demo-projects');
        let demoProjects: any = {};
        
        if (stored) {
          // Convert array to object for lookup
          const projectsArray = JSON.parse(stored);
          demoProjects = projectsArray.reduce((acc: any, project: any) => {
            acc[project.id] = project;
            return acc;
          }, {});
        } else {
          // Fallback to hardcoded demo projects
          demoProjects = {
            'demo-project-1': {
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
            'demo-project-2': {
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
            'demo-project-3': {
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
          };
        }

        const demoProgress = {
          'demo-project-1': 75,
          'demo-project-2': 45,
          'demo-project-3': 20
        };

        const projectData = demoProjects[projectId];
        if (projectData) {
          setProject(projectData);
          // Set progress for known projects, default to random for new ones
          const knownProgress = demoProgress[projectId as keyof typeof demoProgress];
          setProgress(knownProgress || Math.floor(Math.random() * 100));
        } else {
          navigate('/dashboard');
        }
      } else {
        // For real projects, fetch from database
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (error) {
          console.error('Error fetching project:', error);
          toast({
            title: "Project not found",
            description: "This project doesn't exist or you don't have access to it.",
            variant: "destructive"
          });
          navigate('/dashboard');
        } else {
          setProject(data);
          // Set random progress for real projects until task system is integrated
          setProgress(Math.floor(Math.random() * 100));
        }
      }
    } catch (error) {
      toast({
        title: "Error loading project",
        description: "Could not load project details. Please try again.",
        variant: "destructive"
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = () => {
    if (project) {
      setEditValues({
        bpm: project.bpm.toString(),
        sample_rate: project.sample_rate.toString(),
        song_key: project.song_key
      });
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditValues({ bpm: '', sample_rate: '', song_key: '' });
  };

  const saveChanges = async () => {
    if (!project) return;

    const bpm = parseInt(editValues.bpm);
    const sampleRate = parseInt(editValues.sample_rate);

    // Validation
    if (isNaN(bpm) || bpm < 40 || bpm > 300) {
      toast({
        title: "Invalid BPM",
        description: "BPM must be between 40 and 300",
        variant: "destructive"
      });
      return;
    }

    if (![44100, 48000, 88200, 96000].includes(sampleRate)) {
      toast({
        title: "Invalid Sample Rate",
        description: "Sample rate must be 44.1kHz, 48kHz, 88.2kHz, or 96kHz",
        variant: "destructive"
      });
      return;
    }

    try {
      // Update the project locally (for demo mode)
      const updatedProject = {
        ...project,
        bpm,
        sample_rate: sampleRate,
        song_key: editValues.song_key
      };
      setProject(updatedProject);
      setIsEditing(false);

      toast({
        title: "Project updated",
        description: "Project details have been updated successfully."
      });

      // For real projects, add database update logic here
      // await supabase.from('projects').update({ bpm, sample_rate }).eq('id', project.id);
    } catch (error) {
      toast({
        title: "Error updating project",
        description: "Could not save changes. Please try again.",
        variant: "destructive"
      });
    }
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
        <Navbar title="Project Details" />
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar title="Project Not Found" />
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Project Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The project you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const daysUntilDue = getDaysUntilDue(project.due_date);

  return (
    <div className="min-h-screen bg-background">
      <Navbar title="Project Details" />
      
      <div className="p-6">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">{project.title}</h1>
              <p className="text-xl text-muted-foreground mb-1">{project.artist}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {project.bpm} BPM
                </div>
                <div className="flex items-center gap-1">
                  <Music className="h-3 w-3" />
                  {project.song_key}
                </div>
              </div>
            </div>
            
            {project.due_date && (
              <Badge variant={getDueBadgeVariant(daysUntilDue)} className="text-sm">
                {daysUntilDue === null ? 'No due date' :
                 daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` :
                 daysUntilDue === 0 ? 'Due today' :
                 `${daysUntilDue} days left`}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Project Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="h-5 w-5" />
                    Project Details
                  </div>
                  {!isEditing ? (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={startEditing}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={saveChanges}
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={cancelEditing}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">BPM</p>
                    {isEditing ? (
                      <Input
                        type="number"
                        min="40"
                        max="300"
                        value={editValues.bpm}
                        onChange={(e) => setEditValues(prev => ({ ...prev, bpm: e.target.value }))}
                        className="text-2xl font-bold h-12"
                        placeholder="120"
                      />
                    ) : (
                      <p className="text-2xl font-bold">{project.bpm}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Sample Rate</p>
                    {isEditing ? (
                      <Select
                        value={editValues.sample_rate}
                        onValueChange={(value) => setEditValues(prev => ({ ...prev, sample_rate: value }))}
                      >
                        <SelectTrigger className="text-2xl font-bold h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="44100">44.1 kHz</SelectItem>
                          <SelectItem value="48000">48 kHz</SelectItem>
                          <SelectItem value="88200">88.2 kHz</SelectItem>
                          <SelectItem value="96000">96 kHz</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-2xl font-bold">{project.sample_rate / 1000}kHz</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Song Key</p>
                    {isEditing ? (
                      <Select
                        value={editValues.song_key}
                        onValueChange={(value) => setEditValues(prev => ({ ...prev, song_key: value }))}
                      >
                        <SelectTrigger className="text-2xl font-bold h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] overflow-y-auto">
                          <SelectItem value="C major">C major</SelectItem>
                          <SelectItem value="C minor">C minor</SelectItem>
                          <SelectItem value="C♯ major">C♯ major</SelectItem>
                          <SelectItem value="C♯ minor">C♯ minor</SelectItem>
                          <SelectItem value="D major">D major</SelectItem>
                          <SelectItem value="D minor">D minor</SelectItem>
                          <SelectItem value="E♭ major">E♭ major</SelectItem>
                          <SelectItem value="E♭ minor">E♭ minor</SelectItem>
                          <SelectItem value="E major">E major</SelectItem>
                          <SelectItem value="E minor">E minor</SelectItem>
                          <SelectItem value="F major">F major</SelectItem>
                          <SelectItem value="F minor">F minor</SelectItem>
                          <SelectItem value="F♯ major">F♯ major</SelectItem>
                          <SelectItem value="F♯ minor">F♯ minor</SelectItem>
                          <SelectItem value="G major">G major</SelectItem>
                          <SelectItem value="G minor">G minor</SelectItem>
                          <SelectItem value="A♭ major">A♭ major</SelectItem>
                          <SelectItem value="A♭ minor">A♭ minor</SelectItem>
                          <SelectItem value="A major">A major</SelectItem>
                          <SelectItem value="A minor">A minor</SelectItem>
                          <SelectItem value="B♭ major">B♭ major</SelectItem>
                          <SelectItem value="B♭ minor">B♭ minor</SelectItem>
                          <SelectItem value="B major">B major</SelectItem>
                          <SelectItem value="B minor">B minor</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-2xl font-bold">{project.song_key}</p>
                    )}
                  </div>
                  {project.due_date && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="text-lg font-medium">
                          {new Date(project.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Created</p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <p className="text-lg font-medium">
                        {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <TaskBoard projectId={id!} />
              </CardContent>
            </Card>
          </div>

          {/* Progress Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Overall Progress</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                  </div>
                  
                  <div className="space-y-3 pt-4">
                    <div className="flex justify-between text-sm">
                      <span>Pre-production</span>
                      <span className="text-green-600 font-medium">✓ Complete</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Recording</span>
                      <span className="text-blue-600 font-medium">
                        {progress > 30 ? '✓ Complete' : '⏸ In Progress'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Mixing</span>
                      <span className="text-muted-foreground">
                        {progress > 60 ? '⏸ In Progress' : '⏳ Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Mastering</span>
                      <span className="text-muted-foreground">
                        {progress > 80 ? '⏸ In Progress' : '⏳ Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {user?.id === 'demo-user-id' && (
              <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/50">
                <CardHeader>
                  <CardTitle className="text-orange-800 dark:text-orange-200 text-sm">
                    Demo Mode
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                    You're viewing a demo project. Sign up to create and manage real projects!
                  </p>
                  <Button 
                    size="sm" 
                    onClick={() => navigate('/auth')}
                    className="w-full"
                  >
                    Sign Up Now
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}