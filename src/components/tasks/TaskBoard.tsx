import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { TaskDrawer } from './TaskDrawer';
import { TaskColumn } from './TaskColumn';
import { toast } from 'sonner';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  external_link?: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

interface TaskBoardProps {
  projectId: string;
}

export function TaskBoard({ projectId }: TaskBoardProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.id !== 'demo-user-id') {
      fetchTasks();
    } else if (user?.id === 'demo-user-id') {
      // Load demo tasks
      loadDemoTasks();
    }
  }, [projectId, user]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const loadDemoTasks = () => {
    // Demo tasks for demo projects
    const demoTasks: Task[] = [
      {
        id: 'demo-task-1',
        title: 'Record vocals',
        description: 'Record lead and backing vocals for the chorus',
        status: 'completed',
        priority: 'high',
        due_date: '2025-08-10',
        external_link: 'https://wetransfer.com/demo-vocals',
        project_id: projectId,
        created_at: '2025-08-01T10:00:00Z',
        updated_at: '2025-08-01T10:00:00Z'
      },
      {
        id: 'demo-task-2',
        title: 'Mix instrumental',
        description: 'Balance levels and add effects to the instrumental track',
        status: 'in_progress',
        priority: 'medium',
        due_date: '2025-08-12',
        project_id: projectId,
        created_at: '2025-08-01T11:00:00Z',
        updated_at: '2025-08-01T11:00:00Z'
      },
      {
        id: 'demo-task-3',
        title: 'Master final track',
        description: 'Final mastering and audio optimization',
        status: 'pending',
        priority: 'high',
        due_date: '2025-08-15',
        project_id: projectId,
        created_at: '2025-08-01T12:00:00Z',
        updated_at: '2025-08-01T12:00:00Z'
      }
    ];
    setTasks(demoTasks);
  };

  const handleCreateTask = () => {
    setSelectedTask(null);
    setIsDrawerOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsDrawerOpen(true);
  };

  const handleTaskUpdate = () => {
    if (user?.id !== 'demo-user-id') {
      fetchTasks();
    } else {
      loadDemoTasks();
    }
    setIsDrawerOpen(false);
    setSelectedTask(null);
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    if (user?.id === 'demo-user-id') {
      toast.success('Status updated! (Demo mode)');
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', taskId);

      if (error) throw error;
      
      fetchTasks();
      toast.success('Task status updated');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task status');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading tasks...</p>
      </div>
    );
  }

  const columns = [
    { status: 'pending' as const, title: 'To Do', tasks: tasks.filter(t => t.status === 'pending') },
    { status: 'in_progress' as const, title: 'In Progress', tasks: tasks.filter(t => t.status === 'in_progress') },
    { status: 'completed' as const, title: 'Completed', tasks: tasks.filter(t => t.status === 'completed') }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Project Tasks</h3>
        <Button onClick={handleCreateTask} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((column) => (
          <TaskColumn
            key={column.status}
            title={column.title}
            tasks={column.tasks}
            onTaskClick={handleEditTask}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>

      <TaskDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        task={selectedTask}
        projectId={projectId}
        onTaskUpdate={handleTaskUpdate}
      />

      {user?.id === 'demo-user-id' && tasks.length > 0 && (
        <div className="text-center py-4 px-4 bg-orange-50 dark:bg-orange-950/50 rounded-lg border border-orange-200 dark:border-orange-800">
          <p className="text-sm text-orange-700 dark:text-orange-300">
            Demo tasks shown. Sign up to create and manage real project tasks!
          </p>
        </div>
      )}
    </div>
  );
}