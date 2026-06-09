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

interface SupabaseLikeError {
  message?: string;
  error?: string;
  code?: string;
  statusCode?: string | number;
  status?: string | number;
  details?: string;
  hint?: string;
}

export class ClientFileError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ClientFileError';
  }
}

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

function getErrorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const supabaseError = error as SupabaseLikeError;
    return supabaseError.message || supabaseError.error || supabaseError.details || JSON.stringify(error);
  }
  return 'Error desconocido';
}

function getErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const supabaseError = error as SupabaseLikeError;
  return String(supabaseError.code || supabaseError.statusCode || supabaseError.status || '').toLowerCase();
}

function mapSupabaseError(error: unknown, context: 'list' | 'upload' | 'metadata' | 'download' | 'delete-storage' | 'delete-metadata'): ClientFileError {
  const text = getErrorText(error);
  const normalized = text.toLowerCase();
  const code = getErrorCode(error);

  if (normalized.includes('bucket') && (normalized.includes('not found') || normalized.includes('does not exist'))) {
    return new ClientFileError(`No existe el bucket ${CLIENT_FILES_BUCKET} en Supabase Storage. Ejecutá la migración de client_files.`, error);
  }

  if (normalized.includes('client_files') && (normalized.includes('does not exist') || normalized.includes('schema cache') || code === '42p01')) {
    return new ClientFileError('No existe la tabla client_files o Supabase no actualizó el schema cache. Ejecutá la migración y refrescá el proyecto.', error);
  }

  if (normalized.includes('row-level security') || normalized.includes('rls') || normalized.includes('policy') || code === '401' || code === '403') {
    if (context === 'upload' || context === 'download' || context === 'delete-storage') {
      return new ClientFileError(`No tenés permisos para usar el bucket ${CLIENT_FILES_BUCKET}. Revisá las políticas RLS de storage.objects.`, error);
    }
    return new ClientFileError('No tenés permisos para leer o guardar metadata en client_files. Revisá las políticas RLS de la tabla.', error);
  }

  if (normalized.includes('duplicate') || code === '23505') {
    return new ClientFileError('Ya existe un archivo registrado con esa misma ruta. Intentá subirlo nuevamente.', error);
  }

  if (normalized.includes('foreign key') || code === '23503') {
    return new ClientFileError('El client_id no corresponde a un cliente existente o la relación de la tabla client_files está mal configurada.', error);
  }

  if (normalized.includes('payload too large') || normalized.includes('exceeded') || code === '413') {
    return new ClientFileError(`El archivo supera el tamaño máximo permitido por Supabase Storage o por la app (${formatFileSize(MAX_CLIENT_FILE_SIZE_BYTES)}).`, error);
  }

  if (context === 'metadata') {
    return new ClientFileError(`El archivo se subió, pero no se pudo guardar la información en la base de datos: ${text}`, error);
  }

  if (context === 'list') {
    return new ClientFileError(`No se pudieron cargar los archivos del cliente: ${text}`, error);
  }

  if (context === 'download') {
    return new ClientFileError(`No se pudo generar el enlace de descarga: ${text}`, error);
  }

  if (context === 'delete-storage' || context === 'delete-metadata') {
    return new ClientFileError(`No se pudo eliminar el archivo: ${text}`, error);
  }

  return new ClientFileError(`Error desconocido al subir archivo: ${text}`, error);
}

function assertClientId(clientId: string): void {
  if (!clientId || !clientId.trim()) {
    throw new ClientFileError('El cliente no tiene ID válido. Cerrá el detalle y volvé a abrir el cliente.');
  }
}

function sanitizePathSegment(value: string): string {
  const trimmed = value.trim() || 'archivo';
  return trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/?%*:|"<>]+/g, '-')
    .replace(/[^a-zA-Z0-9._ -]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/-+/g, '-')
    .slice(0, 180);
}

function buildStoragePath(clientId: string, fileName: string): string {
  return `${clientId}/${Date.now()}-${sanitizePathSegment(fileName)}`;
}

export async function getClientFiles(clientId: string): Promise<ClientFile[]> {
  assertClientId(clientId);

  const { data, error } = await supabase
    .from('client_files')
    .select('*')
    .eq('client_id', clientId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    console.error('Error loading client files:', { clientId, error });
    throw mapSupabaseError(error, 'list');
  }

  return (data || []) as unknown as ClientFile[];
}

export async function uploadClientFile(
  clientId: string,
  file: File,
  category?: ClientFileCategory | '',
  notes?: string
): Promise<ClientFile> {
  assertClientId(clientId);

  const originalFileName = file.name;
  const extension = getFileExtension(originalFileName);

  if (!extension) {
    throw new ClientFileError('El archivo no tiene extensión.');
  }

  if (!ALLOWED_CLIENT_FILE_EXTENSIONS.includes(extension)) {
    throw new ClientFileError(`Formato .${extension} no permitido.`);
  }

  if (file.size > MAX_CLIENT_FILE_SIZE_BYTES) {
    throw new ClientFileError(`El archivo supera el tamaño máximo permitido de ${formatFileSize(MAX_CLIENT_FILE_SIZE_BYTES)}.`);
  }

  const user = await getCurrentUser();
  const filePath = buildStoragePath(clientId, originalFileName);
  const contentType = file.type || 'application/octet-stream';

  console.info('Uploading client file:', {
    bucket: CLIENT_FILES_BUCKET,
    clientId,
    originalFileName,
    filePath,
    size: file.size,
    contentType,
  });

  const { error: uploadError } = await supabase.storage
    .from(CLIENT_FILES_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      contentType,
      upsert: false,
    });

  if (uploadError) {
    console.error('Error uploading client file:', { clientId, originalFileName, filePath, error: uploadError });
    throw mapSupabaseError(uploadError, 'upload');
  }

  const metadata = {
    client_id: clientId,
    file_name: filePath.split('/').pop() || originalFileName,
    original_file_name: originalFileName,
    file_path: filePath,
    file_type: contentType,
    file_extension: extension,
    file_size: file.size,
    mime_type: contentType,
    category: category || null,
    notes: notes?.trim() || null,
    uploaded_by: user?.id || null,
  };

  const { data, error: insertError } = await supabase
    .from('client_files')
    .insert(metadata as never)
    .select()
    .maybeSingle();

  if (insertError) {
    console.error('Error saving client file metadata:', { clientId, originalFileName, filePath, metadata, error: insertError });
    const { error: cleanupError } = await supabase.storage.from(CLIENT_FILES_BUCKET).remove([filePath]);
    if (cleanupError) {
      console.error('Error cleaning uploaded client file after metadata failure:', { filePath, error: cleanupError });
    }
    throw mapSupabaseError(insertError, 'metadata');
  }

  console.info('Client file uploaded successfully:', { clientId, originalFileName, filePath, metadataId: (data as { id?: string } | null)?.id });
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

  if (error) {
    console.error('Error creating signed URL for client file:', { file, error });
    throw mapSupabaseError(error, 'download');
  }

  return data.signedUrl;
}

export async function deleteClientFile(file: ClientFile): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(CLIENT_FILES_BUCKET)
    .remove([file.file_path]);

  if (storageError) {
    console.error('Error deleting client file from storage:', { file, error: storageError });
    throw mapSupabaseError(storageError, 'delete-storage');
  }

  const { error: dbError } = await supabase
    .from('client_files')
    .delete()
    .eq('id', file.id);

  if (dbError) {
    console.error('Error deleting client file metadata:', { file, error: dbError });
    throw mapSupabaseError(dbError, 'delete-metadata');
  }
}
