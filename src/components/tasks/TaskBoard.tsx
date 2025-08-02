import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { TaskDrawer } from './TaskDrawer';
import { TaskColumn } from './TaskColumn';
import { toast } from 'sonner';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { TaskCard } from './TaskCard';

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
  category?: 'pre-production' | 'recording' | 'mixing' | 'mastering' | 'other';
}

interface TaskBoardProps {
  projectId: string;
  onProgressChange?: (progress: number, phaseProgress: Record<string, number>) => void;
}

export function TaskBoard({ projectId, onProgressChange }: TaskBoardProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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
    // Check localStorage for any saved demo tasks for this project
    const savedTasks = localStorage.getItem(`demo-tasks-${projectId}`);
    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks));
        return;
      } catch (error) {
        console.error('Error parsing saved demo tasks:', error);
      }
    }

    // Default demo tasks for demo projects with categories
    const demoTasks: Task[] = [
      {
        id: `demo-task-1-${projectId}`,
        title: 'Record vocals',
        description: 'Record lead and backing vocals for the chorus',
        status: 'completed',
        priority: 'high',
        due_date: '2025-08-10',
        external_link: 'https://wetransfer.com/demo-vocals',
        project_id: projectId,
        created_at: '2025-08-01T10:00:00Z',
        updated_at: '2025-08-01T10:00:00Z',
        category: 'recording'
      },
      {
        id: `demo-task-2-${projectId}`,
        title: 'Mix instrumental',
        description: 'Balance levels and add effects to the instrumental track',
        status: 'in_progress',
        priority: 'medium',
        due_date: '2025-08-12',
        project_id: projectId,
        created_at: '2025-08-01T11:00:00Z',
        updated_at: '2025-08-01T11:00:00Z',
        category: 'mixing'
      },
      {
        id: `demo-task-3-${projectId}`,
        title: 'Master final track',
        description: 'Final mastering and audio optimization',
        status: 'pending',
        priority: 'high',
        due_date: '2025-08-15',
        project_id: projectId,
        created_at: '2025-08-01T12:00:00Z',
        updated_at: '2025-08-01T12:00:00Z',
        category: 'mastering'
      },
      {
        id: `demo-task-4-${projectId}`,
        title: 'Song arrangement',
        description: 'Finalize song structure and arrangement',
        status: 'completed',
        priority: 'medium',
        due_date: '2025-08-08',
        project_id: projectId,
        created_at: '2025-08-01T09:00:00Z',
        updated_at: '2025-08-01T09:00:00Z',
        category: 'pre-production'
      },
      {
        id: `demo-task-5-${projectId}`,
        title: 'Record bass guitar',
        description: 'Record bass guitar parts for all sections',
        status: 'completed',
        priority: 'medium',
        due_date: '2025-08-09',
        project_id: projectId,
        created_at: '2025-08-01T08:00:00Z',
        updated_at: '2025-08-01T08:00:00Z',
        category: 'recording'
      }
    ];
    setTasks(demoTasks);
    // Save to localStorage for persistence
    localStorage.setItem(`demo-tasks-${projectId}`, JSON.stringify(demoTasks));
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

  const calculateProgress = (tasks: Task[]) => {
    if (tasks.length === 0) return { overall: 0, phases: {} };
    
    const completed = tasks.filter(t => t.status === 'completed').length;
    const overall = Math.round((completed / tasks.length) * 100);
    
    // Calculate progress by phase
    const phases = ['pre-production', 'recording', 'mixing', 'mastering'] as const;
    const phaseProgress: Record<string, number> = {};
    
    phases.forEach(phase => {
      const phaseTasks = tasks.filter(t => t.category === phase);
      if (phaseTasks.length > 0) {
        const phaseCompleted = phaseTasks.filter(t => t.status === 'completed').length;
        phaseProgress[phase] = Math.round((phaseCompleted / phaseTasks.length) * 100);
      } else {
        phaseProgress[phase] = 0;
      }
    });
    
    return { overall, phases: phaseProgress };
  };

  useEffect(() => {
    if (onProgressChange && tasks.length > 0) {
      const progress = calculateProgress(tasks);
      onProgressChange(progress.overall, progress.phases);
    }
  }, [tasks, onProgressChange]);

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    if (user?.id === 'demo-user-id') {
      // Update demo tasks in localStorage
      const updatedTasks = tasks.map(task => 
        task.id === taskId 
          ? { ...task, status: newStatus, updated_at: new Date().toISOString() }
          : task
      );
      setTasks(updatedTasks);
      localStorage.setItem(`demo-tasks-${projectId}`, JSON.stringify(updatedTasks));
      toast.success('Task status updated! (Demo mode)');
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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveTask(null);
      return;
    }

    const taskId = active.id as string;
    const newStatus = over.id as Task['status'];
    
    // Check if the task is actually moving to a different column
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      handleStatusChange(taskId, newStatus);
    }
    
    setActiveTask(null);
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
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
              id={column.status}
              title={column.title}
              tasks={column.tasks}
              onTaskClick={handleEditTask}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <TaskCard
              task={activeTask}
              onClick={() => {}}
              onStatusChange={() => {}}
              isDragging
            />
          )}
        </DragOverlay>

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
              Demo tasks shown. Drag tasks between columns to change status. Sign up to create and manage real project tasks!
            </p>
          </div>
        )}
      </div>
    </DndContext>
  );
}