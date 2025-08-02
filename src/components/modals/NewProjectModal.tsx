import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface NewProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: (projectData: {
    title: string;
    artist: string;
    due_date: string | null;
    bpm: number;
    sample_rate: number;
    song_key: string;
  }) => void;
}

export function NewProjectModal({ open, onOpenChange, onProjectCreated }: NewProjectModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [dueDate, setDueDate] = useState<Date>();
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    bpm: '',
    song_key: 'C major',
    sample_rate: '48000'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

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
        setIsLoading(false);
        return;
      }

      if (![44100, 48000, 88200, 96000].includes(sampleRate)) {
        toast({
          title: "Invalid Sample Rate",
          description: "Sample rate must be 44.1kHz, 48kHz, 88.2kHz, or 96kHz",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Check required fields
      if (!formData.title.trim() || !formData.artist.trim()) {
        toast({
          title: "Missing required fields",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // For now, just simulate success until database is ready
      const error = null;

      if (error) throw error;

      toast({
        title: "Project created",
        description: `${formData.title} has been created successfully.`
      });

      onProjectCreated({
        title: formData.title,
        artist: formData.artist,
        due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
        bpm,
        sample_rate: sampleRate,
        song_key: formData.song_key
      });
      onOpenChange(false);
      
      // Reset form
      setFormData({ title: '', artist: '', bpm: '', song_key: 'C major', sample_rate: '48000' });
      setDueDate(undefined);
    } catch (error: any) {
      toast({
        title: "Error creating project",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Set up a new music production project with all the details.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
                <Calendar
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}