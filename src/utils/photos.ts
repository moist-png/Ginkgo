import { supabase } from './supabase';
import type { Photo } from './supabase';

// Compress image before upload to save storage
export const compressImage = (file: File, maxWidth = 1600, quality = 0.82): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to compress image'));
      }, 'image/jpeg', quality);
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

export const uploadPhoto = async (
  file: File,
  options: {
    reportId?: string;
    siteId?: string;
    caption?: string;
    category?: Photo['category'];
    treeTag?: string;
  }
): Promise<Photo> => {
  // Compress the image
  const compressed = await compressImage(file);

  // Generate unique storage path
  const ext = 'jpg';
  const folder = options.siteId || options.reportId || 'general';
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).substr(2)}.${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(path, compressed, { contentType: 'image/jpeg', upsert: false });

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path);

  // Save metadata to database
  const photoData = {
    storage_path: path,
    url: urlData.publicUrl,
    report_id: options.reportId || null,
    site_id: options.siteId || null,
    caption: options.caption || '',
    category: options.category || 'other',
    tree_tag: options.treeTag || '',
    taken_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('photos').insert(photoData).select().single();
  if (error) throw error;

  return data;
};

export const deletePhoto = async (photo: Photo): Promise<void> => {
  // Delete from storage
  await supabase.storage.from('photos').remove([photo.storage_path]);
  // Delete from database
  await supabase.from('photos').delete().eq('id', photo.id);
};

export const getPhotosForSite = async (siteId: string): Promise<Photo[]> => {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('site_id', siteId)
    .order('taken_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const getPhotosForReport = async (reportId: string): Promise<Photo[]> => {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('report_id', reportId)
    .order('taken_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

// Open device camera or file picker
export const openCamera = (): Promise<File | null> => {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use rear camera on mobile
    input.onchange = () => {
      const file = input.files?.[0] || null;
      resolve(file);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
};

// Open file picker (for uploading existing photos)
export const openFilePicker = (multiple = false): Promise<File[]> => {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = multiple;
    input.onchange = () => {
      resolve(input.files ? Array.from(input.files) : []);
    };
    input.oncancel = () => resolve([]);
    input.click();
  });
};
