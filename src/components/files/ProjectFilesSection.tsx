import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUploadZone } from './FileUploadZone';

interface ProjectFilesSectionProps {
  projectId: string;
}

export function ProjectFilesSection({ projectId }: ProjectFilesSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Project Files</h2>
        <p className="text-muted-foreground">
          Upload and manage stems, mixes, references, and notes for this project.
          Files are automatically versioned and secure.
        </p>
      </div>

      <Tabs defaultValue="stems" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="stems">Stems</TabsTrigger>
          <TabsTrigger value="mixes">Mixes</TabsTrigger>
          <TabsTrigger value="references">References</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="stems" className="space-y-4">
          <FileUploadZone
            projectId={projectId}
            category="stems"
            title="Stems"
            allowedTypes={['.wav', '.aiff', '.flac', '.mp3']}
            maxSize={500}
          />
        </TabsContent>

        <TabsContent value="mixes" className="space-y-4">
          <FileUploadZone
            projectId={projectId}
            category="mixes"
            title="Mixes"
            allowedTypes={['.wav', '.aiff', '.flac', '.mp3']}
            maxSize={200}
          />
        </TabsContent>

        <TabsContent value="references" className="space-y-4">
          <FileUploadZone
            projectId={projectId}
            category="references"
            title="References"
            allowedTypes={['.wav', '.aiff', '.flac', '.mp3', '.mp4', '.mov']}
            maxSize={100}
          />
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <FileUploadZone
            projectId={projectId}
            category="notes"
            title="Notes & Documents"
            allowedTypes={['.pdf', '.doc', '.docx', '.txt', '.md']}
            maxSize={50}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}