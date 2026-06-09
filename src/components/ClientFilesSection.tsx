import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Eye, FileArchive, FileText, Image as ImageIcon, Loader2, Search, Trash2, Upload, X } from 'lucide-react';
import {
  CLIENT_FILE_CATEGORIES,
  CLIENT_FILE_FILTERS,
  deleteClientFile,
  formatFileSize,
  getClientFiles,
  isPreviewableClientFile,
  MAX_CLIENT_FILE_SIZE_BYTES,
  uploadClientFile,
  createClientFileSignedUrl,
} from '../lib/clientFiles';
import type { ClientFile, ClientFileCategory } from '../lib/types';

interface ClientFilesSectionProps {
  clientId: string;
}

interface UploadStatus {
  fileName: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  message: string;
}

const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'svg'];

function getCategoryLabel(category?: ClientFileCategory | null): string {
  return CLIENT_FILE_CATEGORIES.find(option => option.value === category)?.label || 'Sin categoría';
}

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function getFileIcon(file: ClientFile) {
  const extension = (file.file_extension || '').toLowerCase();

  if (imageExtensions.includes(extension)) return <ImageIcon size={18} className="text-emerald-500" />;
  if (['zip', 'rar'].includes(extension)) return <FileArchive size={18} className="text-amber-500" />;
  return <FileText size={18} className="text-violet-500" />;
}

export default function ClientFilesSection({ clientId }: ClientFilesSectionProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ClientFileCategory | 'todos' | 'imagen'>('todos');
  const [category, setCategory] = useState<ClientFileCategory | ''>('');
  const [notes, setNotes] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getClientFiles(clientId);
      setFiles(data);
    } catch (err) {
      const message = getErrorMessage(err, 'No se pudieron cargar los archivos del cliente.');
      console.error('Error loading client files in section:', { clientId, error: err });
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const filteredFiles = useMemo(() => {
    const q = search.trim().toLowerCase();

    return files.filter(file => {
      const extension = (file.file_extension || '').toLowerCase();
      const matchesSearch = !q ||
        file.original_file_name.toLowerCase().includes(q) ||
        extension.includes(q) ||
        (file.notes || '').toLowerCase().includes(q) ||
        getCategoryLabel(file.category).toLowerCase().includes(q);

      const matchesFilter = filter === 'todos' ||
        (filter === 'imagen' && imageExtensions.includes(extension)) ||
        file.category === filter ||
        (filter === 'pdf' && extension === 'pdf');

      return matchesSearch && matchesFilter;
    });
  }, [files, filter, search]);

  const updateUploadStatus = (fileName: string, patch: Partial<UploadStatus>) => {
    setUploadStatuses(current => current.map(item => (
      item.fileName === fileName ? { ...item, ...patch } : item
    )));
  };

  const handleFiles = async (fileList: FileList | File[]) => {
    const selectedFiles = Array.from(fileList);
    if (selectedFiles.length === 0) return;

    if (!clientId?.trim()) {
      const message = 'El cliente no tiene ID válido. Cerrá el detalle y volvé a abrir el cliente.';
      console.error('Error selecting client files:', { clientId, message });
      setUploadStatuses([{ fileName: 'Cliente', status: 'error', message }]);
      return;
    }

    setUploading(true);
    setUploadStatuses(selectedFiles.map(file => ({ fileName: file.name, status: 'pending', message: 'En espera' })));

    try {
      for (const file of selectedFiles) {
        updateUploadStatus(file.name, { status: 'uploading', message: 'Subiendo...' });

        try {
          await uploadClientFile(clientId, file, category, notes);
          updateUploadStatus(file.name, { status: 'success', message: 'Subido correctamente' });
        } catch (err) {
          const message = getErrorMessage(err, 'Error desconocido al subir archivo.');
          console.error('Error uploading selected client file:', { clientId, fileName: file.name, error: err });
          updateUploadStatus(file.name, { status: 'error', message });
        }
      }

      await loadFiles();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  const handlePreview = async (file: ClientFile) => {
    try {
      const url = await createClientFileSignedUrl(file);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      const message = getErrorMessage(err, 'No se pudo abrir la vista previa del archivo.');
      console.error('Error previewing client file:', { file, error: err });
      alert(message);
    }
  };

  const handleDownload = async (file: ClientFile) => {
    try {
      const url = await createClientFileSignedUrl(file, { download: true });
      const link = document.createElement('a');
      link.href = url;
      link.download = file.original_file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      const message = getErrorMessage(err, 'No se pudo descargar el archivo.');
      console.error('Error downloading client file:', { file, error: err });
      alert(message);
    }
  };

  const handleDelete = async (file: ClientFile) => {
    const confirmed = window.confirm(`¿Eliminar "${file.original_file_name}" de la biblioteca del cliente?`);
    if (!confirmed) return;

    setDeletingId(file.id);
    try {
      await deleteClientFile(file);
      setFiles(current => current.filter(item => item.id !== file.id));
    } catch (err) {
      const message = getErrorMessage(err, 'No se pudo eliminar el archivo.');
      console.error('Error deleting client file:', { file, error: err });
      alert(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="rounded-xl border border-petrol-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/40">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-petrol-800 dark:text-white">Archivos del cliente</h3>
          <p className="mt-1 text-xs text-petrol-500 dark:text-petrol-400">
            Biblioteca privada para moldes, tizados, PDFs, PLT, CDR, imágenes y documentación del cliente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-600 disabled:opacity-60"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Subir archivos
        </button>
      </div>

      <div
        onDragOver={event => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
          dragging
            ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20'
            : 'border-petrol-200 bg-crudo-50/80 dark:border-slate-700 dark:bg-slate-800/70'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={event => event.target.files && handleFiles(event.target.files)}
          accept=".pdf,.pds,.mrk,.plt,.cdr,.dxf,.ai,.svg,.jpg,.jpeg,.png,.webp,.xls,.xlsx,.doc,.docx,.zip,.rar,.txt,.csv"
        />
        <Upload size={22} className="mx-auto mb-2 text-violet-500" />
        <p className="text-sm font-medium text-petrol-800 dark:text-white">Arrastrá archivos acá o seleccioná varios desde tu PC</p>
        <p className="mt-1 text-xs text-petrol-500 dark:text-petrol-400">
          Se guardan intactos en Supabase Storage. Máximo recomendado: {formatFileSize(MAX_CLIENT_FILE_SIZE_BYTES)} por archivo.
        </p>
      </div>

      {loadError && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
          {loadError}
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-petrol-600 dark:text-petrol-400">Categoría para nuevos archivos</label>
          <select
            value={category}
            onChange={event => setCategory(event.target.value as ClientFileCategory | '')}
            className="w-full rounded-lg border border-petrol-200 bg-white px-3 py-2 text-sm text-petrol-800 focus:ring-2 focus:ring-violet-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          >
            {CLIENT_FILE_CATEGORIES.map(option => (
              <option key={option.value || 'none'} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-petrol-600 dark:text-petrol-400">Nota breve para nuevos archivos</label>
          <input
            type="text"
            value={notes}
            onChange={event => setNotes(event.target.value)}
            className="w-full rounded-lg border border-petrol-200 bg-white px-3 py-2 text-sm text-petrol-800 focus:ring-2 focus:ring-violet-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            placeholder="Ej: Molde aprobado por cliente"
          />
        </div>
      </div>

      {uploadStatuses.length > 0 && (
        <div className="mt-3 space-y-2">
          {uploadStatuses.map(item => (
            <div key={item.fileName} className="flex items-center justify-between gap-3 rounded-lg border border-petrol-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
              <span className="truncate text-petrol-700 dark:text-slate-200">{item.fileName}</span>
              <span className={`shrink-0 font-medium ${
                item.status === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
                item.status === 'error' ? 'text-red-600 dark:text-red-400' :
                'text-violet-600 dark:text-violet-400'
              }`}>
                {item.message}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-petrol-400" />
          <input
            type="text"
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="w-full rounded-lg border border-petrol-200 bg-white py-2 pl-9 pr-3 text-sm text-petrol-800 focus:ring-2 focus:ring-violet-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            placeholder="Buscar por nombre, extensión, categoría o nota..."
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CLIENT_FILE_FILTERS.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === option.value
                  ? 'bg-violet-500 text-white'
                  : 'bg-white text-petrol-600 hover:bg-petrol-50 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-petrol-200 dark:border-slate-700">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-6 text-sm text-petrol-500 dark:text-petrol-400">
            <Loader2 size={16} className="animate-spin" /> Cargando archivos...
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="p-6 text-center text-sm text-petrol-500 dark:text-petrol-400">
            {files.length === 0 ? 'Este cliente todavía no tiene archivos cargados.' : 'No hay archivos que coincidan con la búsqueda.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-petrol-200 text-sm dark:divide-slate-700">
              <thead className="bg-petrol-50 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-petrol-500 dark:text-slate-400">Archivo</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-petrol-500 dark:text-slate-400">Tipo</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-petrol-500 dark:text-slate-400">Tamaño</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-petrol-500 dark:text-slate-400">Fecha</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-petrol-500 dark:text-slate-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-petrol-100 bg-white dark:divide-slate-700 dark:bg-slate-800/80">
                {filteredFiles.map(file => (
                  <tr key={file.id}>
                    <td className="max-w-xs px-3 py-3">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5">{getFileIcon(file)}</span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-petrol-800 dark:text-white" title={file.original_file_name}>{file.original_file_name}</p>
                          <p className="text-xs text-petrol-500 dark:text-slate-400">{getCategoryLabel(file.category)}</p>
                          {file.notes && <p className="mt-1 line-clamp-2 text-xs text-petrol-500 dark:text-slate-400">{file.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-petrol-600 dark:text-slate-300">{(file.file_extension || '-').toUpperCase()}</td>
                    <td className="px-3 py-3 text-petrol-600 dark:text-slate-300">{formatFileSize(file.file_size)}</td>
                    <td className="px-3 py-3 text-petrol-600 dark:text-slate-300">{new Date(file.uploaded_at).toLocaleDateString('es-AR')}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        {isPreviewableClientFile(file) && (
                          <button
                            type="button"
                            onClick={() => handlePreview(file)}
                            className="rounded-lg bg-petrol-100 p-2 text-petrol-700 transition-colors hover:bg-petrol-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                            title="Ver / abrir"
                          >
                            <Eye size={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDownload(file)}
                          className="rounded-lg bg-violet-100 p-2 text-violet-700 transition-colors hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:hover:bg-violet-900/70"
                          title="Descargar"
                        >
                          <Download size={15} />
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === file.id}
                          onClick={() => handleDelete(file)}
                          className="rounded-lg bg-red-100 p-2 text-red-700 transition-colors hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/60"
                          title="Eliminar"
                        >
                          {deletingId === file.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {uploadStatuses.length > 0 && !uploading && (
        <button
          type="button"
          onClick={() => setUploadStatuses([])}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-petrol-500 hover:text-petrol-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <X size={13} /> Limpiar mensajes de subida
        </button>
      )}
    </section>
  );
}
