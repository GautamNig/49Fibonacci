// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Image upload utility - directly to celebrity-images bucket
export const uploadImage = async (file, celebrityName) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${celebrityName.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.${fileExt}`;
    
    const bucketName = 'celebrity-images';
    // Upload directly to bucket root, no profile-images folder
    const filePath = fileName;

    console.log('Uploading directly to celebrity-images bucket:', { fileName, filePath });

    const { error: uploadError, data } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    console.log('Upload successful:', data);

    // Get public URL - directly from bucket root
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    console.log('Generated Public URL:', publicUrl);
    
    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

// List files in bucket - directly from root
export const listFilesInBucket = async () => {
  try {
    const { data, error } = await supabase.storage
      .from('celebrity-images')
      .list(''); // Empty string for root folder
    
    if (error) {
      console.error('Error listing files:', error);
      return [];
    }
    
    console.log('Files in celebrity-images bucket:', data);
    return data;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
};

// Construct image URL - directly from bucket root
export const constructImageUrl = (filePath) => {
  if (!filePath) return null;
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const bucketName = 'celebrity-images';
  
  // If it's already a full URL, return as is
  if (filePath.startsWith('http')) {
    return filePath;
  }
  
  // If it's just a filename, construct URL directly from bucket root
  const fileName = filePath.split('/').pop(); // Extract filename if there's a path
  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${fileName}`;
};

// Alias for backward compatibility
export const fixImageUrl = constructImageUrl;