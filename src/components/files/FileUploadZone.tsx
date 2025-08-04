import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { File, Download, Trash2, MoreHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { AudioPlayer } from './AudioPlayer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Database } from '@/integrations/supabase/types';

import Uppy from '@uppy/core';
import Tus from '@uppy/tus';
import { Dashboard } from '@uppy/react';

import '@uppy/core/dist/style.min.css';
import '@uppy/dashboard/dist/style.min.css';

type FileUpload = Database['public']['Tables']['file_uploads']['Row'];

interface FileUploadZoneProps {
  projectId: string;
  category: Database['public']['Enums']['file_category'];
  title: string;
  allowedTypes?: string[];
  maxSize?: number; // in MB
}

export function FileUploadZone({ 
  projectId, 
  category, 
  title,
  allowedTypes = ['*'],
  maxSize = 100 
}: FileUploadZoneProps) {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [currentUploadFile, setCurrentUploadFile] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const uppyRef = useRef<Uppy | null>(null);

  // Allow all users to upload for now
  const canUpload = true;

  useEffect(() => {
    fetchFiles();
  }, [projectId, category]);

  useEffect(() => {
    if (!user || !canUpload) return;

    const getNextVersion = async () => {
      const { data: versionData } = await supabase
        .rpc('get_next_file_version', {
          p_project_id: projectId,
          p_category: category
        });
      return versionData || 1;
    };

    const uppy = new Uppy({
      autoProceed: false,
      restrictions: {
        maxFileSize: maxSize * 1024 * 1024,
        allowedFileTypes: allowedTypes.includes('*') ? null : allowedTypes,
      }
    }).use(Tus, {
      endpoint: `https://ayqvnclmnepqyhvjqxjy.supabase.co/storage/v1/upload/resumable`,
      headers: {
        'x-upsert': 'false'
      },
      onBeforeRequest: async (req) => {
        const { data: session } = await supabase.auth.getSession();
        req.setHeader('authorization', `Bearer ${session.session?.access_token || ''}`);
        req.setHeader('bucketName', category === 'sessions' ? 'sessions' : 'project-files');
        req.setHeader('objectName', `${projectId}/${category}/${Date.now()}-${crypto.randomUUID()}`);
        req.setHeader('contentType', 'application/octet-stream');
        req.setHeader('cacheControl', '3600');
      },
      retryDelays: [0, 1000, 3000, 5000],
      limit: 1
    });

    uppy.on('upload-progress', (file, progress) => {
      if (file && progress) {
        setCurrentUploadFile(file.name);
        setUploadProgress(progress.percentage || 0);
      }
    });

    uppy.on('upload-success', async (file, response) => {
      try {
        console.log('Upload successful:', file?.name, response);
        
        if (!file || !response?.uploadURL) {
          throw new Error('Invalid upload response');
        }

        // Extract file path from upload URL
        const url = new URL(response.uploadURL);
        const filePath = url.pathname.replace('/storage/v1/object/', '');
        
        // Get next version number
        const { data: versionData } = await supabase
          .rpc('get_next_file_version', {
            p_project_id: projectId,
            p_category: category
          });

        const nextVersion = versionData || 1;
        
        // Get description from meta data
        const description = file.meta?.description || null;

        // Save metadata to database
        const { error: dbError } = await supabase
          .from('file_uploads')
          .insert({
            project_id: projectId,
            uploaded_by: user.id,
            filename: filePath,
            original_filename: file.name,
            file_path: filePath,
            file_size: file.size || 0,
            mime_type: file.type || 'application/octet-stream',
            category,
            version: nextVersion,
            description: description as string | null
          });

        if (dbError) {
          console.error('Database insert error:', dbError);
          throw dbError;
        }

        toast({
          title: "Upload successful",
          description: `${file.name} uploaded successfully`
        });

      } catch (error) {
        console.error('Post-upload error:', error);
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "Failed to save file metadata",
          variant: "destructive"
        });
      }
    });

    uppy.on('upload-error', (file, error) => {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: `Failed to upload ${file?.name || 'file'}`,
        variant: "destructive"
      });
    });

    uppy.on('complete', (result) => {
      console.log('Upload complete:', result);
      setCurrentUploadFile('');
      setUploadProgress(0);
      fetchFiles();
    });

    uppyRef.current = uppy;

    return () => {
      uppy.destroy();
    };
  }, [user, projectId, category, maxSize, allowedTypes, canUpload, toast]);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('file_uploads')
        .select('*')
        .eq('project_id', projectId)
        .eq('category', category)
        .order('version', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive"
      });
    }
  };

  const downloadFile = async (file: FileUpload) => {
    try {
      const bucketName = file.category === 'sessions' ? 'sessions' : 'project-files';
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Failed to download file",
        variant: "destructive"
      });
    }
  };

  const deleteFile = async (file: FileUpload) => {
    try {
      // Delete from storage
      const bucketName = file.category === 'sessions' ? 'sessions' : 'project-files';
      const { error: storageError } = await supabase.storage
        .from(bucketName)
        .remove([file.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('file_uploads')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      toast({
        title: "File deleted",
        description: "File has been removed successfully"
      });

      fetchFiles();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete file",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Badge variant="outline">
          {files.length} file{files.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Upload Zone */}
      {canUpload && uppyRef.current && (
        <Card>
          <CardContent className="p-6">
            <Dashboard 
              uppy={uppyRef.current}
              proudlyDisplayPoweredByUppy={false}
              note={`Max file size: ${maxSize}MB ${category === 'sessions' ? '(resumable uploads)' : ''}`}
              height={320}
              metaFields={[
                { 
                  id: 'description', 
                  name: 'Description', 
                  placeholder: category === 'sessions' 
                    ? "Optional notes (e.g., 'Full session copy-in')" 
                    : "Add a description for this upload (optional)"
                }
              ]}
            />
          </CardContent>
        </Card>
      )}

      {/* Premium Upgrade Notice */}
      {!canUpload && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6 text-center">
            <File className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-orange-900 mb-2">
              Premium Feature
            </p>
            <p className="text-sm text-orange-700">
              File uploads are available with a premium account. 
              Contact your administrator to upgrade.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => {
            const isAudioFile = file.mime_type.startsWith('audio/');
            const isAudioExtension = /\.(wav|aiff|flac|mp3|aac)$/i.test(file.original_filename);
            const shouldShowAudioPlayer = (category === 'mixes' || category === 'stems') && 
                                        (isAudioFile || isAudioExtension);
            const fileSizeMB = file.file_size / (1024 * 1024);

            return (
              <Card key={file.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <File className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{file.original_filename}</p>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span>v{file.version}</span>
                          <span>•</span>
                          <span>{formatFileSize(file.file_size)}</span>
                          <span>•</span>
                          <span>{new Date(file.created_at).toLocaleDateString()}</span>
                        </div>
                        {file.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {file.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {shouldShowAudioPlayer ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => downloadFile(file)}>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteFile(file)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadFile(file)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteFile(file)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Audio Player for mixes and stems only */}
                  {shouldShowAudioPlayer && (
                    <AudioPlayer 
                      fileKey={file.file_path}
                      sizeMb={fileSizeMB}
                      fileName={file.original_filename}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}