import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Command, 
  CommandDialog, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from '@/components/ui/command';
import { FolderOpen, CheckSquare, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Project {
  id: string;
  title: string;
  artist: string;
}

interface Task {
  id: string;
  title: string;
  project_id: string;
  projects: { title: string };
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (open && user) {
      fetchData();
    }
  }, [open, user]);

  const fetchData = async () => {
    // For now, return empty arrays until database is ready
    setProjects([]);
    setTasks([]);
  };

  const runCommand = (command: () => void) => {
    onOpenChange(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search projects, tasks, or actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => runCommand(() => navigate('/dashboard'))}>
            <FolderOpen className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
        </CommandGroup>

        {projects.length > 0 && (
          <CommandGroup heading="Projects">
            {projects.map((project) => (
              <CommandItem
                key={project.id}
                onSelect={() => runCommand(() => navigate(`/projects/${project.id}`))}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                {project.title} - {project.artist}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {tasks.length > 0 && (
          <CommandGroup heading="Recent Tasks">
            {tasks.map((task) => (
              <CommandItem
                key={task.id}
                onSelect={() => runCommand(() => navigate(`/projects/${task.project_id}?task=${task.id}`))}
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                {task.title} ({task.projects?.title})
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}