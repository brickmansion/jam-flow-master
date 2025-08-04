import { supabase } from '@/integrations/supabase/client';

export async function uploadWithProgress(
  bucket: string,
  path: string,
  file: File,
  onProgress: (pct: number) => void
) {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) throw new Error('Not authenticated');

  // Build signed URL for PUT
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error) throw error;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', data.signedUrl, true);
    xhr.setRequestHeader('authorization', `Bearer ${session.access_token}`);
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };
    xhr.onload = () => (xhr.status < 300 ? resolve(true) : reject(xhr.response));
    xhr.onerror = reject;
    xhr.send(file);
  });
}