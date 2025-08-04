import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Music, Clock, TrendingUp, CalendarIcon, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  title: string;
  artist: string;
  due_date?: string;
  bpm: number;
  sample_rate: number;
  song_key: string;
}

interface AddProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  onProjectAdded: () => void;
}

export const AddProjectModal = ({ open, onOpenChange, collectionId, onProjectAdded }: AddProjectModalProps) => {
  const [ungroupedProjects, setUngroupedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [dueDate, setDueDate] = useState<Date>();
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    bpm: '',
    song_key: 'C major',
    sample_rate: '48000'
  });
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open && user) {
      fetchUngroupedProjects();
    }
  }, [open, user]);

  const fetchUngroupedProjects = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('producer_id', user.id)
        .is('collection_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUngroupedProjects(data || []);
    } catch (error) {
      console.error('Error fetching ungrouped projects:', error);
      toast({
        title: 'Error',
        description: 'Failed to load projects.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addProjectToCollection = async (projectId: string) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ collection_id: collectionId })
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: 'Project added',
        description: 'Project has been added to the collection.',
      });

      onProjectAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding project to collection:', error);
      toast({
        title: 'Error',
        description: 'Failed to add project to collection.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const createNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsCreating(true);

    try {
      const bpm = parseInt(formData.bpm);
      const sampleRate = parseInt(formData.sample_rate);

      // Validation
      if (!formData.bpm || isNaN(bpm) || bpm < 40 || bpm > 300) {
        toast({
          title: "Invalid BPM",
          description: "BPM must be between 40 and 300",
          variant: "destructive"
        });
        setIsCreating(false);
        return;
      }

      if (![44100, 48000, 88200, 96000].includes(sampleRate)) {
        toast({
          title: "Invalid Sample Rate",
          description: "Sample rate must be 44.1kHz, 48kHz, 88.2kHz, or 96kHz",
          variant: "destructive"
        });
        setIsCreating(false);
        return;
      }

      // Check required fields
      if (!formData.title.trim() || !formData.artist.trim()) {
        toast({
          title: "Missing required fields",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        setIsCreating(false);
        return;
      }

      // Create the project directly in the collection
      const { error } = await supabase
        .from('projects')
        .insert({
          title: formData.title,
          artist: formData.artist,
          due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
          bpm,
          sample_rate: sampleRate,
          song_key: formData.song_key as any,
          collection_id: collectionId,
          producer_id: user.id
        });

      if (error) throw error;

      toast({
        title: 'Project created',
        description: 'New project has been created and added to the collection.',
      });

      // Reset form and close modal
      setFormData({ title: '', artist: '', bpm: '', song_key: 'C major', sample_rate: '48000' });
      setDueDate(undefined);
      onProjectAdded();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error creating project",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Project to Collection</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="existing" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Add Existing</TabsTrigger>
            <TabsTrigger value="new">
              <Plus className="h-4 w-4 mr-2" />
              Create New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted rounded animate-pulse"></div>
                ))}
              </div>
            ) : ungroupedProjects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No ungrouped projects available to add.</p>
                <p className="text-sm text-muted-foreground mt-2">Create a new project instead!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ungroupedProjects.map((project) => (
                  <Card 
                    key={project.id}
                    className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.01]"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold">{project.title}</h3>
                              <p className="text-sm text-muted-foreground">{project.artist}</p>
                            </div>
                            {project.due_date && (
                              <Badge variant={getDueBadgeVariant(project.due_date)} className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                {format(new Date(project.due_date), 'MMM dd')}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
                        </div>
                        
                        <Button 
                          size="sm"
                          onClick={() => addProjectToCollection(project.id)}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'Adding...' : 'Add'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="new" className="space-y-4">
            <form onSubmit={createNewProject} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Song Name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="artist">Artist *</Label>
                <Input
                  id="artist"
                  value={formData.artist}
                  onChange={(e) => setFormData(prev => ({ ...prev, artist: e.target.value }))}
                  placeholder="Artist Name"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bpm">BPM *</Label>
                  <Input
                    id="bpm"
                    type="number"
                    min="40"
                    max="300"
                    value={formData.bpm}
                    onChange={(e) => setFormData(prev => ({ ...prev, bpm: e.target.value }))}
                    placeholder="120"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sample_rate">Sample Rate *</Label>
                  <Select
                    value={formData.sample_rate}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, sample_rate: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="44100">44.1 kHz</SelectItem>
                      <SelectItem value="48000">48 kHz</SelectItem>
                      <SelectItem value="88200">88.2 kHz</SelectItem>
                      <SelectItem value="96000">96 kHz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="song_key">Song Key *</Label>
                <Select
                  value={formData.song_key}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, song_key: value }))}
                >
                  <SelectTrigger>
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
              </div>
              
              <div className="space-y-2">
                <Label>Due Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};