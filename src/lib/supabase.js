// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Image upload utility
export const uploadImage = async (file, celebrityName) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${celebrityName.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;
    const filePath = `profile-images/${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('celebrity-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('celebrity-images')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Create storage bucket (run this once in Supabase dashboard)
export const createStorageBucket = async () => {
  // This would typically be done in Supabase dashboard
  console.log('Please create a storage bucket called "celebrity-images" in your Supabase dashboard');
};