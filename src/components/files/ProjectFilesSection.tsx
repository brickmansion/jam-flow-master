import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FileUploadZone } from './FileUploadZone';
import { useWorkspace } from '@/hooks/useWorkspace';
import { UpgradeModal } from '@/components/UpgradeModal';

interface ProjectFilesSectionProps {
  projectId: string;
}

export function ProjectFilesSection({ projectId }: ProjectFilesSectionProps) {
  const { isProAccess } = useWorkspace();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

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
          <TabsTrigger value="sessions">🎛️ Sessions</TabsTrigger>
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

        <TabsContent value="sessions" className="space-y-4">
          {isProAccess ? (
            <FileUploadZone
              projectId={projectId}
              category="sessions"
              title="Pro Tools Sessions"
              allowedTypes={['.ptx', '.ptf', '.zip', '.rar', '.7z', '.wav', '.aiff']}
              maxSize={60000}
            />
          ) : (
            <div className="bg-muted/40 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Session uploads are a Pro feature</h3>
              <p className="text-sm mb-4 text-muted-foreground">
                Store full Pro Tools sessions up to 60 GB each.
              </p>
              <Button onClick={() => setUpgradeModalOpen(true)}>
                Upgrade to Pro – $19/mo
              </Button>
            </div>
          )}
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
      
      <UpgradeModal open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen} />
    </div>
  );
}