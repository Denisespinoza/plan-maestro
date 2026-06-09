import { supabase } from './supabase';
import { getCurrentUser } from './auth';
import type { ClientFile, ClientFileCategory } from './types';


export const CLIENT_FILES_BUCKET = 'client-files';
export const MAX_CLIENT_FILE_SIZE_BYTES = 100 * 1024 * 1024;

export const CLIENT_FILE_CATEGORIES: Array<{ value: ClientFileCategory | ''; label: string }> = [
  { value: '', label: 'Sin categoría' },
  { value: 'molde', label: 'Molde' },
  { value: 'tizado', label: 'Tizado' },
  { value: 'pdf', label: 'PDF' },
  { value: 'imagen_referencia', label: 'Imagen referencia' },
  { value: 'ficha_tecnica', label: 'Ficha técnica' },
  { value: 'diseno', label: 'Diseño' },
  { value: 'otro', label: 'Otro' },
];

export const CLIENT_FILE_FILTERS: Array<{ value: ClientFileCategory | 'todos' | 'imagen'; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'molde', label: 'Molde' },
  { value: 'tizado', label: 'Tizado' },
  { value: 'pdf', label: 'PDF' },
  { value: 'imagen', label: 'Imagen' },
  { value: 'diseno', label: 'Diseño' },
  { value: 'otro', label: 'Otro' },
];

export const ALLOWED_CLIENT_FILE_EXTENSIONS = [
  'pdf',
  'pds',
  'mrk',
  'plt',
  'cdr',
  'dxf',
  'ai',
  'svg',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'xls',
  'xlsx',
  'doc',
  'docx',
  'zip',
  'rar',
  'txt',
  'csv',
];

export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

export function isPreviewableClientFile(file: Pick<ClientFile, 'file_extension' | 'mime_type'>): boolean {
  const extension = (file.file_extension || '').toLowerCase();
  return ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'svg', 'txt', 'csv'].includes(extension) ||
    Boolean(file.mime_type?.startsWith('image/')) ||
    file.mime_type === 'application/pdf' ||
    Boolean(file.mime_type?.startsWith('text/'));
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[\\/]+/g, '-').replace(/\s+/g, ' ').trim();
}

function buildStoragePath(clientId: string, fileName: string): string {
  return `${clientId}/${Date.now()}-${sanitizePathSegment(fileName)}`;
}

export async function getClientFiles(clientId: string): Promise<ClientFile[]> {
  const { data, error } = await supabase
    .from('client_files')
    .select('*')
    .eq('client_id', clientId)
    .order('uploaded_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function uploadClientFile(
  clientId: string,
  file: File,
  category?: ClientFileCategory | '',
  notes?: string
): Promise<ClientFile> {
  const extension = getFileExtension(file.name);

  if (!ALLOWED_CLIENT_FILE_EXTENSIONS.includes(extension)) {
    throw new Error(`Formato .${extension || 'sin extensión'} no permitido.`);
  }

  if (file.size > MAX_CLIENT_FILE_SIZE_BYTES) {
    throw new Error(`El archivo supera el máximo permitido de ${formatFileSize(MAX_CLIENT_FILE_SIZE_BYTES)}.`);
  }

  const user = await getCurrentUser();
  const filePath = buildStoragePath(clientId, file.name);
  const contentType = file.type || 'application/octet-stream';

  const { error: uploadError } = await supabase.storage
    .from(CLIENT_FILES_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      contentType,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data, error: insertError } = await supabase
    .from('client_files')
    .insert({
      client_id: clientId,
      file_name: filePath.split('/').pop() || file.name,
      original_file_name: file.name,
      file_path: filePath,
      file_type: file.type || null,
      file_extension: extension,
      file_size: file.size,
      mime_type: contentType,
      category: category || null,
      notes: notes?.trim() || null,
      uploaded_by: user?.id || null,
    } as never)
    .select()
    .maybeSingle();

  if (insertError) {
    await supabase.storage.from(CLIENT_FILES_BUCKET).remove([filePath]);
    throw insertError;
  }

  return data as unknown as ClientFile;
}

export async function createClientFileSignedUrl(
  file: ClientFile,
  options?: { download?: boolean }
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(CLIENT_FILES_BUCKET)
    .createSignedUrl(file.file_path, 60, {
      download: options?.download ? file.original_file_name : false,
    });

  if (error) throw error;
  return data.signedUrl;
}

export async function deleteClientFile(file: ClientFile): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(CLIENT_FILES_BUCKET)
    .remove([file.file_path]);

  if (storageError) throw storageError;

  const { error: dbError } = await supabase
    .from('client_files')
    .delete()
    .eq('id', file.id);

  if (dbError) throw dbError;
}
