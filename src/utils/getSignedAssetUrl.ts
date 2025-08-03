import { supabase } from '@/integrations/supabase/client';

export async function getSignedAssetUrl(fileKey: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('project-files')
    .createSignedUrl(fileKey, 3600); // 1-hour URL
  
  if (error) throw error;
  return data.signedUrl;
}