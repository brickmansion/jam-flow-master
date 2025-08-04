import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Upload, File, Download, Trash2, MoreHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { uploadWithProgressResumable } from '@/utils/uploadWithProgress';
import { AudioPlayer } from './AudioPlayer';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Database } from '@/integrations/supabase/types';

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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadFile, setCurrentUploadFile] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const [description, setDescription] = useState('');
  const [serverLimitMb, setServerLimitMb] = useState<number>();
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { workspace } = useWorkspace();

  // Allow all users to upload for now
  const canUpload = true;

  useEffect(() => {
    fetchFiles();
    
    // Fetch real server limits
    (async () => {
      const bucketName = category === 'sessions' ? 'sessions' : 'project-files';
      const { data } = await supabase.storage.getBucket(bucketName);
      if (data?.file_size_limit) {
        setServerLimitMb(data.file_size_limit / (1024 * 1024));
      }
    })();
  }, [projectId, category]);

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

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (!canUpload) {
      toast({
        title: "Premium feature",
        description: "File uploads require a premium account",
        variant: "destructive"
      });
      return;
    }

    const droppedFiles = Array.from(e.dataTransfer.files);
    uploadFiles(droppedFiles);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUpload) {
      toast({
        title: "Premium feature",
        description: "File uploads require a premium account",
        variant: "destructive"
      });
      return;
    }

    const selectedFiles = Array.from(e.target.files || []);
    uploadFiles(selectedFiles);
  };

  const uploadFiles = async (filesToUpload: File[]) => {
    if (!user) {
      console.log('No user found, cannot upload');
      return;
    }

    console.log('Starting upload process for files:', filesToUpload.map(f => f.name));
    setUploading(true);
    setUploadProgress(0);
    setCurrentUploadFile('');

    try {
      // Get next version number
      const { data: versionData, error: versionError } = await supabase
        .rpc('get_next_file_version', {
          p_project_id: projectId,
          p_category: category
        });

      if (versionError) {
        console.error('Version error:', versionError);
        throw versionError;
      }

      const nextVersion = versionData || 1;
      console.log('Next version:', nextVersion);

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        console.log('Processing file:', file.name);
        setCurrentUploadFile(file.name);
        
        // Basic client-side validation
        if (file.size > maxSize * 1024 * 1024) {
          console.log('File too large:', file.name, file.size);
          toast({
            title: "File too large",
            description: `${file.name} exceeds ${maxSize}MB limit`,
            variant: "destructive"
          });
          continue;
        }

        // Generate secure file path with UUID prefix
        const secureFileName = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const fileName = `${projectId}/${category}/${nextVersion}-${secureFileName}`;
        const bucketName = category === 'sessions' ? 'sessions' : 'project-files';
        
        console.log('Uploading to storage:', { bucketName, fileName, fileSize: file.size });
        console.log('File size in MB:', (file.size / (1024 * 1024)).toFixed(2));
        
        // Upload with resumable progress tracking
        await uploadWithProgressResumable(bucketName, fileName, file, (pct) => {
          setUploadProgress(
            ((i + pct / 100) / filesToUpload.length) * 100
          );
        });

        console.log('Storage upload successful, saving to database...');

        // Save metadata to database
        const { error: dbError } = await supabase
          .from('file_uploads')
          .insert({
            project_id: projectId,
            workspace_id: workspace?.id, // Add workspace_id for RLS
            uploaded_by: user.id,
            filename: fileName,
            original_filename: file.name,
            file_path: fileName,
            file_size: file.size,
            mime_type: file.type,
            category,
            version: nextVersion,
            description: description || null
          });

        if (dbError) {
          console.error('Database insert error:', dbError);
          throw dbError;
        }

        console.log('File processed successfully:', file.name);
      }

      console.log('All files uploaded successfully');
      toast({
        title: "Upload successful",
        description: `${filesToUpload.length} file(s) uploaded as version ${nextVersion}`
      });

      setDescription('');
      fetchFiles();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload files. Please try again.",
        variant: "destructive"
      });
    } finally {
      console.log('Upload process completed, setting uploading to false');
      setTimeout(() => {
        setUploadProgress(0);
        setCurrentUploadFile('');
        setUploading(false);
      }, 1000);
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
      {canUpload && (
        <Card>
          <CardContent className="p-6">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">
                {category === 'sessions' 
                  ? 'Upload or drag-and-drop Pro Tools sessions' 
                  : 'Drop files here or click to browse'
                }
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {category === 'sessions' 
                  ? `Files are resumable up to ${Math.floor((serverLimitMb ?? maxSize)/1000)}GB` 
                  : `Maximum file size: ${serverLimitMb ?? maxSize}MB`
                }
                {allowedTypes.length > 0 && !allowedTypes.includes('*') && (
                  <span className="block">
                    Allowed types: {allowedTypes.join(', ')}
                  </span>
                )}
              </p>
              
              <div className="space-y-4">
                <Textarea
                  placeholder={category === 'sessions' 
                    ? "Optional notes (e.g., 'Full session copy-in')" 
                    : "Add a description for this upload (optional)"
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="max-w-md mx-auto"
                />
                
                {uploading && (
                  <div className="max-w-md mx-auto space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading: {currentUploadFile}</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}
                
                <Button asChild disabled={uploading}>
                  <label className="cursor-pointer">
                    {uploading ? 'Uploading...' : 
                     category === 'sessions' ? 'Select Session File' : 'Select Files'}
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileInput}
                      accept={allowedTypes.includes('*') ? undefined : allowedTypes.join(',')}
                    />
                  </label>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Premium Upgrade Notice */}
      {!canUpload && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6 text-center">
            <Upload className="h-12 w-12 text-orange-500 mx-auto mb-4" />
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