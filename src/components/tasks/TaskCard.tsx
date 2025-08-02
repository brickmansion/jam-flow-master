import { Task } from './TaskBoard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onStatusChange: (taskId: string, status: Task['status']) => void;
  isDragging?: boolean;
}

export function TaskCard({ task, onClick, onStatusChange, isDragging = false }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isBeingDragged,
  } = useDraggable({
    id: task.id,
    disabled: isDragging, // Disable dragging for the overlay
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };
  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const handleExternalLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.external_link) {
      window.open(task.external_link, '_blank');
    }
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-background rounded-lg p-3 shadow-sm border cursor-pointer hover:shadow-md transition-shadow ${
        isBeingDragged ? 'opacity-50' : ''
      } ${isDragging ? 'rotate-3 scale-105' : ''}`}
      onClick={onClick}
    >
      <div className="space-y-2">
        <div className="flex justify-between items-start gap-2">
          <h5 className="font-medium text-sm leading-tight">{task.title}</h5>
          {task.external_link && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 flex-shrink-0"
              onClick={handleExternalLinkClick}
              title="Open external link"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}
        
        <div className="flex justify-between items-center">
          <Badge variant={getPriorityColor(task.priority)} className="text-xs">
            {task.priority}
          </Badge>
          
          {task.due_date && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(task.due_date), 'MMM d')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}