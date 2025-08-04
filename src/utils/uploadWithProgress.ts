import { supabase } from '@/integrations/supabase/client';

export async function uploadWithProgress(
  bucket: string,
  path: string,
  file: File,
  onProgress: (pct: number) => void
) {
  console.log('Upload with progress starting:', { bucket, path, fileSize: file.size });
  
  // Try direct upload first - this should work better for large files
  return new Promise(async (resolve, reject) => {
    try {
      // Use the standard Supabase upload with monitoring
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/octet-stream'
        });

      if (error) {
        console.error('Direct upload failed:', error);
        reject(error);
        return;
      }

      console.log('Direct upload successful:', data);
      onProgress(100);
      resolve(data);
    } catch (error) {
      console.error('Upload error:', error);
      reject(error);
    }
  });
}