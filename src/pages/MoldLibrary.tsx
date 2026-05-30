import { useState, useEffect } from 'react';
import {
  getModelFiles,
  createMoldFile,
  updateMoldFile,
  deleteMoldFile,
  uploadMoldFile,
  getLibraryStats,
} from '../lib/moldLibrary';
import { getModel } from '../lib/inventory';
import type { MoldFile, FileType, InventoryModel } from '../lib/types';
import { FILE_TYPE_CONFIG, FILE_TYPE_OPTIONS } from '../lib/types';
import {
  FileText,
  Upload,
  X,
  Save,
  Loader2,
  Trash2,
  Star,
  Download,
  Eye,
  Package,
  FolderOpen,
} from 'lucide-react';

interface MoldLibraryProps {
  modelId?: string;
  onNavigate: (page: string) => void;
}

export default function MoldLibrary({ modelId, onNavigate }: MoldLibraryProps) {
  const [model, setModel] = useState<InventoryModel | null>(null);
  const [files, setFiles] = useState<MoldFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingFile, setEditingFile] = useState<MoldFile | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [form, setForm] = useState({
    file_name: '',
    file_type: 'other' as FileType,
    version: '',
    technical_notes: '',
    is_primary: false,
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileRef = { current: null as HTMLInputElement | null };

  useEffect(() => {
    if (modelId) {
      loadModelData();
    } else {
      loadAllFiles();
    }
  }, [modelId]);

  const loadModelData = async () => {
    setLoading(true);
    try {
      const [modelData, filesData, statsData] = await Promise.all([
        getModel(modelId!),
        getModelFiles(modelId!),
        getLibraryStats(),
      ]);
      setModel(modelData);
      setFiles(filesData);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllFiles = async () => {
    setLoading(true);
    try {
      const statsData = await getLibraryStats();
      setStats(statsData);
      // For library overview, we show stats only
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openNewFile = () => {
    setEditingFile(null);
    setForm({
      file_name: '',
      file_type: 'other',
      version: '',
      technical_notes: '',
      is_primary: false,
    });
    setUploadFile(null);
    setShowModal(true);
  };

  const openEditFile = (file: MoldFile) => {
    setEditingFile(file);
    setForm({
      file_name: file.file_name,
      file_type: file.file_type as FileType,
      version: file.version || '',
      technical_notes: file.technical_notes || '',
      is_primary: file.is_primary,
    });
    setUploadFile(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!modelId) return;
    if (!uploadFile && !editingFile) return;
    setSaving(true);
    try {
      let fileUrl = editingFile?.file_url || '';

      if (uploadFile) {
        fileUrl = await uploadMoldFile(uploadFile, modelId);
      }

      if (editingFile) {
        await updateMoldFile(editingFile.id, {
          ...form,
          file_url: fileUrl,
          file_name: form.file_name || uploadFile?.name || editingFile.file_name,
        });
      } else {
        await createMoldFile({
          model_id: modelId,
          file_name: form.file_name || uploadFile?.name || '',
          file_type: form.file_type,
          file_url: fileUrl,
          version: form.version,
          technical_notes: form.technical_notes,
          is_primary: form.is_primary,
        });
      }
      setShowModal(false);
      loadModelData();
    } catch (err) {
      console.error(err);
      alert('Error al guardar el archivo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMoldFile(id);
      setDeleteConfirm(null);
      loadModelData();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar el archivo');
    }
  };

  // Group files by type
  const filesByType: Record<string, MoldFile[]> = {};
  files.forEach(f => {
    if (!filesByType[f.file_type]) filesByType[f.file_type] = [];
    filesByType[f.file_type].push(f);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If no modelId, show library overview
  if (!modelId) {
    return (
      <div className="max-w-6xl mx-auto space-y-5">
        <h1 className="text-2xl font-bold text-crudo-100">Biblioteca de Moldes</h1>
        <p className="text-sm text-crudo-400">Seleccioná un modelo desde el inventario para ver sus archivos</p>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="bg-crudo-50 dark:bg-slate-800 rounded-lg p-3 border border-petrol-200 dark:border-slate-700">
              <p className="text-xs text-petrol-500 dark:text-petrol-400">Total</p>
              <p className="text-xl font-bold text-petrol-800 dark:text-white">{stats.totalFiles}</p>
            </div>
            <div className="bg-crudo-50 dark:bg-slate-800 rounded-lg p-3 border border-petrol-200 dark:border-slate-700">
              <p className="text-xs text-petrol-500 dark:text-petrol-400">PDF A4</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">{stats.pdfA4}</p>
            </div>
            <div className="bg-crudo-50 dark:bg-slate-800 rounded-lg p-3 border border-petrol-200 dark:border-slate-700">
              <p className="text-xs text-petrol-500 dark:text-petrol-400">PDF Plotter</p>
              <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{stats.pdfPlotter}</p>
            </div>
            <div className="bg-crudo-50 dark:bg-slate-800 rounded-lg p-3 border border-petrol-200 dark:border-slate-700">
              <p className="text-xs text-petrol-500 dark:text-petrol-400">PLT</p>
              <p className="text-lg font-bold text-violet-600 dark:text-violet-400">{stats.plt}</p>
            </div>
            <div className="bg-crudo-50 dark:bg-slate-800 rounded-lg p-3 border border-petrol-200 dark:border-slate-700">
              <p className="text-xs text-petrol-500 dark:text-petrol-400">DXF</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.dxf}</p>
            </div>
            <div className="bg-crudo-50 dark:bg-slate-800 rounded-lg p-3 border border-petrol-200 dark:border-slate-700">
              <p className="text-xs text-petrol-500 dark:text-petrol-400">CDR</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{stats.cdr}</p>
            </div>
            <div className="bg-crudo-50 dark:bg-slate-800 rounded-lg p-3 border border-petrol-200 dark:border-slate-700">
              <p className="text-xs text-petrol-500 dark:text-petrol-400">AI</p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.ai}</p>
            </div>
            <div className="bg-crudo-50 dark:bg-slate-800 rounded-lg p-3 border border-petrol-200 dark:border-slate-700">
              <p className="text-xs text-petrol-500 dark:text-petrol-400">Imágenes</p>
              <p className="text-lg font-bold text-pink-600 dark:text-pink-400">{stats.images}</p>
            </div>
          </div>
        )}

        <div className="bg-crudo-50 dark:bg-slate-800 rounded-xl p-8 border border-petrol-200 dark:border-slate-700 text-center">
          <FolderOpen size={48} className="mx-auto text-petrol-300 mb-4" />
          <p className="text-petrol-500 dark:text-petrol-400 mb-4">
            Para ver y gestionar archivos, navegá al inventario y seleccioná un modelo.
          </p>
          <button
            onClick={() => onNavigate('inventory')}
            className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-semibold"
          >
            Ir al Inventario
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-petrol-400 mb-1">
            <button onClick={() => onNavigate('inventory')} className="hover:text-violet-400 transition-colors">
              Inventario
            </button>
            <span>/</span>
            <span className="text-crudo-200">Biblioteca</span>
          </div>
          <h1 className="text-2xl font-bold text-crudo-100">
            {model ? `${model.code} - ${model.name}` : 'Biblioteca de Moldes'}
          </h1>
        </div>
        <button
          onClick={openNewFile}
          className="px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center gap-2"
        >
          <Upload size={18} /> Subir Archivo
        </button>
      </div>

      {/* Model info card */}
      {model && (
        <div className="bg-crudo-50 dark:bg-slate-800 rounded-xl p-4 border border-petrol-200 dark:border-slate-700 flex items-center gap-4">
          {model.main_photo_url ? (
            <img
              src={model.main_photo_url}
              alt={model.name}
              className="w-16 h-16 rounded-lg object-cover border border-petrol-200 dark:border-slate-600"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-petrol-100 dark:bg-slate-700 flex items-center justify-center border border-petrol-200 dark:border-slate-600">
              <Package size={24} className="text-petrol-300" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-xs text-violet-600 dark:text-violet-400 font-mono">{model.code}</p>
            <p className="font-semibold text-petrol-800 dark:text-white">{model.name}</p>
            <p className="text-xs text-petrol-500 dark:text-petrol-400 mt-0.5">
              {files.length} archivo{files.length !== 1 ? 's' : ''} en biblioteca
            </p>
          </div>
          <button
            onClick={() => onNavigate('inventory')}
            className="px-3 py-2 bg-white dark:bg-slate-700 hover:bg-crudo-100 dark:hover:bg-slate-600 text-petrol-600 dark:text-petrol-300 border border-petrol-200 dark:border-slate-600 rounded-lg text-xs font-medium transition-colors"
          >
            Ver en Inventario
          </button>
        </div>
      )}

      {/* Files by type */}
      {files.length === 0 ? (
        <div className="bg-crudo-50 dark:bg-slate-800 rounded-xl p-12 border border-petrol-200 dark:border-slate-700 text-center">
          <FileText size={40} className="mx-auto text-petrol-300 mb-3" />
          <p className="text-petrol-500 dark:text-petrol-400 text-sm">Sin archivos en la biblioteca</p>
          <button
            onClick={openNewFile}
            className="mt-4 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-medium"
          >
            Subir primer archivo
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {FILE_TYPE_OPTIONS.map(fileType => {
            const typeFiles = filesByType[fileType] || [];
            if (typeFiles.length === 0) return null;

            const config = FILE_TYPE_CONFIG[fileType];

            return (
              <div key={fileType} className="bg-crudo-50 dark:bg-slate-800 rounded-xl border border-petrol-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-2 bg-petrol-100 dark:bg-slate-700/50 border-b border-petrol-200 dark:border-slate-700 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-petrol-600 dark:text-petrol-300 uppercase tracking-wide flex items-center gap-2">
                    <FileText size={14} /> {config.label}
                    <span className="px-1.5 py-0.5 bg-white dark:bg-slate-600 rounded text-petrol-700 dark:text-petrol-300 text-xs">
                      {typeFiles.length}
                    </span>
                  </h3>
                </div>
                <div className="p-3 space-y-2">
                  {typeFiles.map(file => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 bg-white dark:bg-slate-700 rounded-lg border border-petrol-100 dark:border-slate-600"
                    >
                      <div className="flex-shrink-0">
                        {file.is_primary ? (
                          <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                            <Star size={16} className="text-amber-600 dark:text-amber-400" fill="currentColor" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-petrol-100 dark:bg-slate-600 rounded-lg flex items-center justify-center">
                            <FileText size={16} className="text-petrol-500 dark:text-petrol-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-petrol-800 dark:text-white truncate">{file.file_name}</p>
                          {file.is_primary && (
                            <span className="text-xs text-amber-600 dark:text-amber-400">Principal</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-petrol-500 dark:text-petrol-400 mt-0.5">
                          {file.version && <span>Versión: {file.version}</span>}
                          <span>Subido: {new Date(file.created_at).toLocaleDateString('es-AR')}</span>
                        </div>
                        {file.technical_notes && (
                          <p className="text-xs text-petrol-400 dark:text-petrol-500 mt-1 truncate">{file.technical_notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-petrol-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                          title="Ver archivo"
                        >
                          <Eye size={16} />
                        </a>
                        <a
                          href={file.file_url}
                          download
                          className="p-2 text-petrol-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                          title="Descargar"
                        >
                          <Download size={16} />
                        </a>
                        <button
                          onClick={() => openEditFile(file)}
                          className="p-2 text-petrol-400 hover:text-petrol-600 hover:bg-petrol-50 dark:hover:bg-slate-600 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(file.id)}
                          className="p-2 text-petrol-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* File upload modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md bg-crudo-50 dark:bg-slate-800 rounded-xl shadow-xl border border-petrol-200 dark:border-slate-700">
            <div className="p-4 border-b border-petrol-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-petrol-800 dark:text-white">
                {editingFile ? 'Editar Archivo' : 'Subir Archivo'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-petrol-400 hover:text-petrol-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {!editingFile && (
                <div>
                  <label className="block text-xs font-medium text-petrol-600 dark:text-petrol-400 mb-1">Archivo *</label>
                  <input
                    ref={fileRef as any}
                    type="file"
                    accept=".pdf,.plt,.dxf,.cdr,.ai,.zip,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadFile(file);
                        setForm(f => ({ ...f, file_name: f.file_name || file.name }));
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => (fileRef as any)?.current?.click?.()}
                    className="w-full px-3 py-4 border-2 border-dashed border-petrol-300 dark:border-slate-600 rounded-lg text-sm text-petrol-500 dark:text-petrol-400 hover:border-violet-500 transition-colors flex items-center justify-center gap-2"
                  >
                    <Upload size={16} />
                    {uploadFile ? uploadFile.name : 'Seleccionar archivo'}
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-petrol-600 dark:text-petrol-400 mb-1">Nombre</label>
                <input
                  type="text"
                  value={form.file_name}
                  onChange={e => setForm(f => ({ ...f, file_name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm text-petrol-800 dark:text-white focus:ring-2 focus:ring-violet-500"
                  placeholder="Nombre del archivo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-petrol-600 dark:text-petrol-400 mb-1">Tipo</label>
                  <select
                    value={form.file_type}
                    onChange={e => setForm(f => ({ ...f, file_type: e.target.value as FileType }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm text-petrol-800 dark:text-white focus:ring-2 focus:ring-violet-500"
                  >
                    {FILE_TYPE_OPTIONS.map(t => (
                      <option key={t} value={t}>{FILE_TYPE_CONFIG[t].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-petrol-600 dark:text-petrol-400 mb-1">Versión</label>
                  <input
                    type="text"
                    value={form.version}
                    onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm text-petrol-800 dark:text-white focus:ring-2 focus:ring-violet-500"
                    placeholder="v1.0"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_primary}
                    onChange={e => setForm(f => ({ ...f, is_primary: e.target.checked }))}
                    className="w-4 h-4 text-violet-500 border-petrol-300 rounded focus:ring-violet-500"
                  />
                  <span className="text-xs text-petrol-600 dark:text-petrol-400">Archivo principal para este tipo</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-petrol-600 dark:text-petrol-400 mb-1">Observaciones técnicas</label>
                <textarea
                  value={form.technical_notes}
                  onChange={e => setForm(f => ({ ...f, technical_notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm text-petrol-800 dark:text-white focus:ring-2 focus:ring-violet-500 resize-none"
                  placeholder="Notas, diferencias entre versiones..."
                />
              </div>
            </div>
            <div className="p-4 border-t border-petrol-200 dark:border-slate-700 flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-white dark:bg-slate-700 text-petrol-600 dark:text-petrol-300 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm font-medium hover:bg-crudo-100 dark:hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-sm bg-crudo-50 dark:bg-slate-800 rounded-xl shadow-xl border border-petrol-200 dark:border-slate-700 p-5">
            <h3 className="text-lg font-semibold text-petrol-800 dark:text-white mb-2">Eliminar archivo</h3>
            <p className="text-sm text-petrol-600 dark:text-petrol-400 mb-4">
              ¿Estás seguro? El archivo será eliminado permanentemente.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-white dark:bg-slate-700 text-petrol-600 dark:text-petrol-300 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm font-medium hover:bg-crudo-100 dark:hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
