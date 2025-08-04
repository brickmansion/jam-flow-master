import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Task } from './TaskBoard';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { validateTaskTitle, validateUrl, sanitizeTaskDescription } from '@/utils/inputValidation';

interface TaskDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  projectId: string;
  onTaskUpdate: () => void;
}

export function TaskDrawer({ open, onOpenChange, task, projectId, onTaskUpdate }: TaskDrawerProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending' as Task['status'],
    priority: 'medium' as Task['priority'],
    due_date: '',
    external_link: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        due_date: task.due_date || '',
        external_link: task.external_link || ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        due_date: '',
        external_link: ''
      });
    }
  }, [task]);

  const validateExternalLink = (url: string): boolean => {
    if (!url) return true; // Optional field
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced validation using security utilities
    const titleValidation = validateTaskTitle(formData.title);
    if (!titleValidation.isValid) {
      toast.error(titleValidation.error || 'Task title is invalid');
      return;
    }

    const urlValidation = validateUrl(formData.external_link);
    if (!urlValidation.isValid) {
      toast.error(urlValidation.error || 'Invalid URL format');
      return;
    }

    const taskData = {
      title: formData.title.trim(),
      description: sanitizeTaskDescription(formData.description),
      status: formData.status,
      priority: formData.priority,
      due_date: formData.due_date || null,
      external_link: formData.external_link.trim() || null,
      project_id: projectId
    };

    if (user?.id === 'demo-user-id') {
      // Handle demo mode task creation/updating with localStorage
      const savedTasks = localStorage.getItem(`demo-tasks-${projectId}`);
      let tasks = savedTasks ? JSON.parse(savedTasks) : [];
      
      if (task) {
        // Update existing task
        tasks = tasks.map((t: any) => t.id === task.id ? { ...t, ...taskData, updated_at: new Date().toISOString() } : t);
      } else {
        // Create new task
        const newTask = { 
          ...taskData, 
          id: `demo-task-${Date.now()}`, 
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        tasks.push(newTask);
      }
      
      localStorage.setItem(`demo-tasks-${projectId}`, JSON.stringify(tasks));
      toast.success(task ? 'Task updated! (Demo mode)' : 'Task created! (Demo mode)');
      onTaskUpdate();
      return;
    }

    setLoading(true);
    try {

      if (task) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', task.id);
        
        if (error) throw error;
        toast.success('Task updated');
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([taskData]);
        
        if (error) throw error;
        toast.success('Task created');
      }
      
      onTaskUpdate();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    
    if (user?.id === 'demo-user-id') {
      // Handle demo mode task deletion
      const savedTasks = localStorage.getItem(`demo-tasks-${projectId}`);
      if (savedTasks) {
        const tasks = JSON.parse(savedTasks).filter((t: any) => t.id !== task.id);
        localStorage.setItem(`demo-tasks-${projectId}`, JSON.stringify(tasks));
      }
      toast.success('Task deleted! (Demo mode)');
      onTaskUpdate();
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id);
      
      if (error) throw error;
      toast.success('Task deleted');
      onTaskUpdate();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    } finally {
      setLoading(false);
    }
  };

  const handleExternalLinkClick = () => {
    if (formData.external_link && validateExternalLink(formData.external_link)) {
      window.open(formData.external_link, '_blank');
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-md mx-auto">
        <DrawerHeader>
          <DrawerTitle>{task ? 'Edit Task' : 'Create Task'}</DrawerTitle>
          <DrawerDescription>
            {task ? 'Update task details' : 'Add a new task to your project'}
          </DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="px-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter task title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter task description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: Task['status']) => 
                setFormData(prev => ({ ...prev, status: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value: Task['priority']) => 
                setFormData(prev => ({ ...prev, priority: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="external_link">External session link (WeTransfer, Dropbox...)</Label>
            <div className="flex gap-2">
              <Input
                id="external_link"
                type="url"
                value={formData.external_link}
                onChange={(e) => setFormData(prev => ({ ...prev, external_link: e.target.value }))}
                placeholder="https://wetransfer.com/..."
                className="flex-1"
              />
              {formData.external_link && validateExternalLink(formData.external_link) && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleExternalLinkClick}
                  title="Open external link"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
            {formData.external_link && !validateExternalLink(formData.external_link) && (
              <p className="text-sm text-destructive">Please enter a valid URL starting with http:// or https://</p>
            )}
          </div>

          <DrawerFooter className="px-0">
            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Saving...' : (task ? 'Update Task' : 'Create Task')}
              </Button>
              {task && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={handleDelete}
                  disabled={loading}
                  title="Delete task"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}