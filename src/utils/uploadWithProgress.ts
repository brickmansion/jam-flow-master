import { supabase } from '@/integrations/supabase/client';
import { Upload } from 'tus-js-client';

export async function uploadWithProgressResumable(
  bucket: string,
  path: string,
  file: File,
  onProgress: (pct: number) => void
) {
  console.log('Resumable upload starting:', { bucket, path, fileSize: file.size });
  
  // Get Supabase project details
  const SUPABASE_URL = "https://ayqvnclmnepqyhvjqxjy.supabase.co";
  const tusEndpoint = `${SUPABASE_URL}/storage/v1/upload/resumable`;
  
  // Get session token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('User not authenticated');
  }

  // 2. Stream file in chunks using TUS
  return new Promise((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: tusEndpoint,
      chunkSize: 5 * 1024 * 1024,      // 5MB chunks
      retryDelays: [0, 1000, 3000],    // Retry on failure
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600'
      },
      headers: {
        authorization: `Bearer ${session.access_token}`,
        'x-upsert': 'false'
      },
      onProgress: (sent, total) => {
        const pct = (sent / total) * 100;
        console.log(`Upload progress: ${pct.toFixed(1)}%`);
        onProgress(pct);
      },
      onSuccess: () => {
        console.log('Resumable upload successful');
        resolve({ path });
      },
      onError: (error) => {
        console.error('Resumable upload failed:', error);
        reject(error);
      },
    });
    upload.start();
  });
}