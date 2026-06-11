import { supabase } from './supabase';
import type { CatalogItem, CatalogStatus, Category } from './types';

// Generate unique code for catalog item
export async function generateCatalogCode(): Promise<string> {
  const { data } = await supabase
    .from('internal_catalog')
    .select('code')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return 'CAT-001';
  const num = parseInt(data.code.replace('CAT-', ''), 10);
  return `CAT-${String(num + 1).padStart(3, '0')}`;
}

// Create catalog item
export async function createCatalogItem(item: Partial<CatalogItem>): Promise<CatalogItem> {
  const code = item.code || await generateCatalogCode();

  const { data, error } = await supabase
    .from('internal_catalog')
    .insert({
      code,
      model_id: item.model_id || null,
      name: item.name || '',
      category: item.category || 'HOMBRE',
      size_curve: item.size_curve || '',
      season: item.season || '',
      photo_url: item.photo_url || '',
      status: item.status || 'active',
      internal_notes: item.internal_notes || '',
      tags: item.tags || [],
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data!;
}

// Update catalog item
export async function updateCatalogItem(id: string, updates: Partial<CatalogItem>): Promise<CatalogItem> {
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('internal_catalog')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data!;
}

// Delete catalog item
export async function deleteCatalogItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('internal_catalog')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Get all catalog items
export async function getCatalogItems(): Promise<CatalogItem[]> {
  const { data, error } = await supabase
    .from('internal_catalog')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Get single catalog item
export async function getCatalogItem(id: string): Promise<CatalogItem | null> {
  const { data, error } = await supabase
    .from('internal_catalog')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Search catalog items
export async function searchCatalogItems(query: string): Promise<CatalogItem[]> {
  const q = query.toLowerCase();
  const { data, error } = await supabase
    .from('internal_catalog')
    .select('*')
    .or(`code.ilike.%${q},name.ilike.%${q},category.ilike.%${q},internal_notes.ilike.%${q}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Filter catalog items
export async function filterCatalogItems(filters: {
  category?: Category;
  status?: CatalogStatus;
  season?: string;
  withPhoto?: boolean;
  tags?: string[];
}): Promise<CatalogItem[]> {
  let query = supabase.from('internal_catalog').select('*');

  if (filters.category) query = query.eq('category', filters.category);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.season) query = query.eq('season', filters.season);
  if (filters.withPhoto === true) query = query.not('photo_url', 'eq', '');
  if (filters.withPhoto === false) query = query.eq('photo_url', '');

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;

  // Filter by tags in JS ( Postgres array contains )
  let result = data || [];
  if (filters.tags && filters.tags.length > 0) {
    result = result.filter(item =>
      filters.tags!.some(tag => item.tags?.includes(tag))
    );
  }

  return result;
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB
const TARGET_SIZE_BYTES = 500 * 1024;     // 500KB
const MAX_DIMENSION = 1920;

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);

      // Try quality levels until under TARGET_SIZE_BYTES
      const tryCompress = (quality: number) => {
        canvas.toBlob(
          blob => {
            if (!blob) { reject(new Error('Error al comprimir imagen')); return; }
            if (blob.size <= TARGET_SIZE_BYTES || quality <= 0.3) {
              resolve(blob);
            } else {
              tryCompress(Math.round((quality - 0.1) * 10) / 10);
            }
          },
          'image/jpeg',
          quality,
        );
      };
      tryCompress(0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}

// Upload catalog image — compresses to ≤500KB then uploads to Cloudflare R2
export async function uploadCatalogImage(file: File, itemId: string): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)}MB. El máximo permitido es 5MB.`);
  }

  const compressed = await compressImage(file);
  const path = `catalog/${itemId}/${Date.now()}.jpg`;

  // Subir vía API server-side (credenciales R2 nunca se exponen al browser)
  const formData = new FormData();
  formData.append('file', new Blob([compressed], { type: 'image/jpeg' }), 'image.jpg');
  formData.append('path', path);

  const response = await fetch('/api/r2-upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Error al subir imagen (HTTP ${response.status})`);
  }

  const { url } = await response.json();
  return url;
}

// Migrate catalog images from Supabase to Cloudflare R2 (runs client-side)
export async function migrateCatalogImagesToR2(): Promise<{ total: number; migrated: number; skipped: number; failed: number }> {
  const { data: items, error } = await supabase
    .from('internal_catalog')
    .select('id, name, photo_url')
    .not('photo_url', 'eq', '')
    .not('photo_url', 'is', null);

  if (error) throw error;

  let migrated = 0, skipped = 0, failed = 0;
  const r2Endpoint = import.meta.env.VITE_R2_PUBLIC_URL || '';

  for (const item of items || []) {
    const url = item.photo_url as string;

    // Already in R2 or not from Supabase
    if (!url.includes('supabase.co') || (r2Endpoint && url.includes(r2Endpoint))) {
      skipped++;
      continue;
    }

    try {
      // Download from Supabase
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const ext = blob.type.includes('png') ? 'png' : 'jpg';
      const fileName = `${Date.now()}_${item.id}.${ext}`;
      const path = `catalog/${item.id}/${fileName}`;
      const file = new File([blob], fileName, { type: blob.type });

      // Upload to Supabase Storage (will use R2 if configured via Storage settings)
      // Actually upload as new file and update URL
      const { error: uploadError } = await supabase.storage
        .from('catalog-images')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('catalog-images').getPublicUrl(path);

      await supabase
        .from('internal_catalog')
        .update({ photo_url: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq('id', item.id);

      migrated++;
    } catch {
      failed++;
    }
  }

  return { total: (items || []).length, migrated, skipped, failed };
}

// Get catalog stats
export async function getCatalogStats() {
  const { data: items } = await supabase
    .from('internal_catalog')
    .select('id, status, category, tags, photo_url');

  const all = items || [];

  const tagCounts: Record<string, number> = {};
  all.forEach(item => {
    (item.tags || []).forEach((tag: string) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  return {
    total: all.length,
    active: all.filter(i => i.status === 'active').length,
    hidden: all.filter(i => i.status === 'hidden').length,
    archived: all.filter(i => i.status === 'archived').length,
    noPublish: all.filter(i => i.status === 'no_publish').length,
    clientSpecific: all.filter(i => i.status === 'client_specific').length,
    withPhoto: all.filter(i => i.photo_url && i.photo_url.length > 0).length,
    withoutPhoto: all.filter(i => !i.photo_url || i.photo_url.length === 0).length,
    tags: Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count })),
  };
}
