import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Music, Clock, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
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
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Existing Project</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        ) : ungroupedProjects.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No ungrouped projects available to add.</p>
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

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};