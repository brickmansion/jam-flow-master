import { Task } from './TaskBoard';
import { TaskCard } from './TaskCard';
import { useDroppable } from '@dnd-kit/core';

interface TaskColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, status: Task['status']) => void;
}

export function TaskColumn({ id, title, tasks, onTaskClick, onStatusChange }: TaskColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });
  return (
    <div 
      ref={setNodeRef}
      className={`bg-muted/50 rounded-lg p-4 transition-colors ${
        isOver ? 'bg-muted/80 ring-2 ring-primary/50' : ''
      }`}
    >
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          {title}
        </h4>
        <span className="bg-background rounded-full px-2 py-1 text-xs font-medium">
          {tasks.length}
        </span>
      </div>
      
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
            onStatusChange={onStatusChange}
          />
        ))}
        
        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}