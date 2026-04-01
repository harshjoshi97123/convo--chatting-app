import { getSupabaseClient } from './client';

/**
 * Uploads a file to Supabase Storage and returns the public URL.
 * Standardizes on the 'chat-media' bucket.
 */
export async function uploadFile(file: File, bucketName: string = 'chat-media'): Promise<string> {
  const supabase = getSupabaseClient();
  
  // Create a unique file path with original name sanitized
  const fileExt = file.name.split('.').pop();
  const originalName = file.name.split('.').slice(0, -1).join('.').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const fileName = `${originalName}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
  const filePath = fileName;

  try {
    // 1. Try to upload the file to the specified bucket
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error(`[Storage] Upload failed for bucket '${bucketName}':`, error);
      throw error;
    }

    // 2. Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error: any) {
    console.error('[Storage Error]:', error);
    throw new Error(`Upload failed: ${error.message || 'Unknown storage error'}`);
  }
}
