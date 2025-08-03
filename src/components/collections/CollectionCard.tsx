import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Folder } from 'lucide-react';
import { format } from 'date-fns';

interface Collection {
  id: string;
  title: string;
  artist?: string;
  release_type: 'Single' | 'EP' | 'Album';
  due_date?: string;
  project_count: number;
  average_progress: number;
}

interface CollectionCardProps {
  collection: Collection;
  onClick: () => void;
}

export const CollectionCard = ({ collection, onClick }: CollectionCardProps) => {
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

  const getReleaseTypeColor = (type: string) => {
    switch (type) {
      case 'Single': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'EP': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'Album': return 'bg-green-500/10 text-green-600 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold text-lg leading-tight">{collection.title}</h3>
              {collection.artist && (
                <p className="text-sm text-muted-foreground">{collection.artist}</p>
              )}
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={getReleaseTypeColor(collection.release_type)}
          >
            {collection.release_type}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(collection.average_progress)}%
              </span>
            </div>
            <Progress value={collection.average_progress} className="h-2" />
          </div>

          {/* Project count */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {collection.project_count} {collection.project_count === 1 ? 'track' : 'tracks'}
            </span>
            
            {collection.due_date && (
              <Badge variant={getDueBadgeVariant(collection.due_date)} className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {format(new Date(collection.due_date), 'MMM dd')}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};