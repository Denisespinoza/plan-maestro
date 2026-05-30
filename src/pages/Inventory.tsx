import { useState, useEffect, useMemo } from 'react';
import {
  getModels,
  createModel,
  updateModel,
  deleteModel,
  getModelStats,
  getModelOrders,
  getModelClients,
  uploadModelPhoto,
} from '../lib/inventory';
import { getModelFiles } from '../lib/moldLibrary';
import type { InventoryModel, Category, ModelStatus, Order, MoldFile } from '../lib/types';
import {
  CATEGORY_CONFIG,
  CATEGORY_OPTIONS,
  MODEL_STATUS_CONFIG,
  MODEL_STATUS_OPTIONS,
  STATUS_CONFIG,
} from '../lib/types';
import { Search, Plus, CreditCard as Edit3, Package, FileText, Users, Eye, X, Save, Loader2, Upload, Filter, TrendingUp } from 'lucide-react';

interface InventoryProps {
  onNavigate: (page: string, orderId?: string, clientId?: string, modelId?: string) => void;
}

interface ModelWithFiles extends InventoryModel {
  files?: MoldFile[];
  orderCount?: number;
}

export default function Inventory({ onNavigate }: InventoryProps) {
  const [models, setModels] = useState<ModelWithFiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<Category | ''>('');
  const [filterStatus, setFilterStatus] = useState<ModelStatus | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingModel, setEditingModel] = useState<InventoryModel | null>(null);
  const [showDetail, setShowDetail] = useState<ModelWithFiles | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Detail modal data
  const [modelOrders, setModelOrders] = useState<Order[]>([]);
  const [modelClients, setModelClients] = useState<any[]>([]);
  const [modelFiles, setModelFiles] = useState<MoldFile[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form state
  const [form, setForm] = useState({
    code: '',
    name: '',
    category: 'otros' as Category,
    subcategory: '',
    size_curve: '',
    recommended_fabric: '',
    description: '',
    quantity_available: 0,
    quantity_sold: 0,
    status: 'active' as ModelStatus,
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const photoRef = { current: null as HTMLInputElement | null };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [modelsData, statsData] = await Promise.all([getModels(), getModelStats()]);
      setModels(modelsData);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredModels = useMemo(() => {
    let result = models;
    const q = search.toLowerCase();

    if (search) {
      result = result.filter(m =>
        m.code.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q)
      );
    }

    if (filterCategory) {
      result = result.filter(m => m.category === filterCategory);
    }

    if (filterStatus) {
      result = result.filter(m => m.status === filterStatus);
    }

    return result;
  }, [models, search, filterCategory, filterStatus]);

  const openNewModel = () => {
    setEditingModel(null);
    setForm({
      code: '',
      name: '',
      category: 'otros',
      subcategory: '',
      size_curve: '',
      recommended_fabric: '',
      description: '',
      quantity_available: 0,
      quantity_sold: 0,
      status: 'active',
    });
    setPhotoFile(null);
    setShowModal(true);
  };

  const openEditModel = (model: InventoryModel) => {
    setEditingModel(model);
    setForm({
      code: model.code,
      name: model.name,
      category: model.category as Category,
      subcategory: model.subcategory || '',
      size_curve: model.size_curve || '',
      recommended_fabric: model.recommended_fabric || '',
      description: model.description || '',
      quantity_available: model.quantity_available || 0,
      quantity_sold: model.quantity_sold || 0,
      status: model.status as ModelStatus,
    });
    setPhotoFile(null);
    setShowModal(true);
  };

  const openModelDetail = async (model: ModelWithFiles) => {
    setShowDetail(model);
    setLoadingDetail(true);
    try {
      const [orders, clients, files] = await Promise.all([
        getModelOrders(model.id),
        getModelClients(model.id),
        getModelFiles(model.id),
      ]);
      setModelOrders(orders);
      setModelClients(clients);
      setModelFiles(files);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      let photoUrl = editingModel?.main_photo_url || '';

      if (photoFile) {
        photoUrl = await uploadModelPhoto(photoFile, editingModel?.id || `temp-${Date.now()}`);
      }

      if (editingModel) {
        await updateModel(editingModel.id, {
          ...form,
          main_photo_url: photoUrl,
        });
      } else {
        await createModel({
          ...form,
          main_photo_url: photoUrl,
        });
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error al guardar el modelo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteModel(id);
      setDeleteConfirm(null);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar el modelo');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-crudo-100">Inventario</h1>
          <p className="text-sm text-crudo-400 mt-1">{filteredModels.length} modelos en inventario</p>
        </div>
        <button
          onClick={openNewModel}
          className="px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center gap-2"
        >
          <Plus size={18} /> Nuevo Modelo
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-crudo-50 dark:bg-slate-800 rounded-lg p-3 border border-petrol-200 dark:border-slate-700">
            <p className="text-xs text-petrol-500 dark:text-petrol-400">Total</p>
            <p className="text-xl font-bold text-petrol-800 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-crudo-50 dark:bg-slate-800 rounded-lg p-3 border border-petrol-200 dark:border-slate-700">
            <p className="text-xs text-petrol-500 dark:text-petrol-400">Activos</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</p>
          </div>
          <div className="bg-crudo-50 dark:bg-slate-800 rounded-lg p-3 border border-petrol-200 dark:border-slate-700">
            <p className="text-xs text-petrol-500 dark:text-petrol-400">Ocultos</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.hidden}</p>
          </div>
          <div className="bg-crudo-50 dark:bg-slate-800 rounded-lg p-3 border border-petrol-200 dark:border-slate-700">
            <p className="text-xs text-petrol-500 dark:text-petrol-400">Archivados</p>
            <p className="text-xl font-bold text-gray-600 dark:text-gray-400">{stats.archived}</p>
          </div>
          <div className="bg-crudo-50 dark:bg-slate-800 rounded-lg p-3 border border-petrol-200 dark:border-slate-700">
            <p className="text-xs text-petrol-500 dark:text-petrol-400">Vendidos</p>
            <p className="text-xl font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1">
              <TrendingUp size={14} /> {stats.totalSold}
            </p>
          </div>
          <div className="bg-crudo-50 dark:bg-slate-800 rounded-lg p-3 border border-petrol-200 dark:border-slate-700">
            <p className="text-xs text-petrol-500 dark:text-petrol-400">Disponibles</p>
            <p className="text-xl font-bold text-petrol-700 dark:text-petrol-300">
              {models.reduce((s, m) => s + (m.quantity_available || 0), 0).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-crudo-50 dark:bg-slate-800 rounded-xl p-4 border border-petrol-200 dark:border-slate-700/50 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-petrol-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por código, nombre, categoría..."
              className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-petrol-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1.5 ${
              showFilters || filterCategory || filterStatus
                ? 'bg-violet-100 dark:bg-violet-900/30 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300'
                : 'bg-white dark:bg-slate-700 border-petrol-200 dark:border-slate-600 text-petrol-600 dark:text-petrol-300'
            }`}
          >
            <Filter size={16} /> Filtros
          </button>
        </div>
        {showFilters && (
          <div className="flex flex-wrap gap-2">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value as Category | '')}
              className="px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm text-petrol-800 dark:text-white"
            >
              <option value="">Todas las categorías</option>
              {CATEGORY_OPTIONS.map(c => (
                <option key={c} value={c}>{CATEGORY_CONFIG[c].label}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as ModelStatus | '')}
              className="px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm text-petrol-800 dark:text-white"
            >
              <option value="">Todos los estados</option>
              {MODEL_STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{MODEL_STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Models grid */}
      {filteredModels.length === 0 ? (
        <div className="bg-crudo-50 dark:bg-slate-800 rounded-xl p-12 border border-petrol-200 dark:border-slate-700 text-center">
          <Package size={40} className="mx-auto text-petrol-300 mb-3" />
          <p className="text-petrol-500 dark:text-petrol-400 text-sm">No se encontraron modelos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModels.map(model => (
            <div
              key={model.id}
              className="bg-crudo-50 dark:bg-slate-800 rounded-xl border border-petrol-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all"
            >
              {/* Photo */}
              <div className="h-36 bg-petrol-100 dark:bg-slate-700 relative">
                {model.main_photo_url ? (
                  <img
                    src={model.main_photo_url}
                    alt={model.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package size={32} className="text-petrol-300" />
                  </div>
                )}
                <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full ${MODEL_STATUS_CONFIG[model.status as ModelStatus]?.bgClass} ${MODEL_STATUS_CONFIG[model.status as ModelStatus]?.textClass}`}>
                  {MODEL_STATUS_CONFIG[model.status as ModelStatus]?.label}
                </span>
              </div>

              {/* Info */}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs text-violet-600 dark:text-violet-400 font-mono">{model.code}</span>
                    <h3 className="font-semibold text-petrol-800 dark:text-white text-sm mt-0.5 line-clamp-1">{model.name}</h3>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-0.5 bg-petrol-100 dark:bg-petrol-800 rounded text-petrol-600 dark:text-petrol-300">
                    {CATEGORY_CONFIG[model.category as Category]?.label}
                  </span>
                  {model.size_curve && (
                    <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 rounded text-violet-600 dark:text-violet-400">
                      {model.size_curve}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex justify-between text-xs text-petrol-500 dark:text-petrol-400">
                  <span>Disponibles: <strong className="text-petrol-700 dark:text-white">{model.quantity_available}</strong></span>
                  <span>Vendidos: <strong className="text-violet-600 dark:text-violet-400">{model.quantity_sold || 0}</strong></span>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => openModelDetail(model)}
                    className="flex-1 px-3 py-2 bg-petrol-600 hover:bg-petrol-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <Eye size={14} /> Ver
                  </button>
                  <button
                    onClick={() => openEditModel(model)}
                    className="px-3 py-2 bg-white dark:bg-slate-700 hover:bg-crudo-100 dark:hover:bg-slate-600 text-petrol-600 dark:text-petrol-300 border border-petrol-200 dark:border-slate-600 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => onNavigate('library', undefined, undefined, model.id)}
                    className="px-3 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-xs font-medium transition-colors"
                    title="Biblioteca de moldes"
                  >
                    <FileText size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-lg bg-crudo-50 dark:bg-slate-800 rounded-xl shadow-xl border border-petrol-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-petrol-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-crudo-50 dark:bg-slate-800">
              <h2 className="text-lg font-semibold text-petrol-800 dark:text-white">
                {editingModel ? 'Editar Modelo' : 'Nuevo Modelo'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-petrol-400 hover:text-petrol-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-petrol-600 dark:text-petrol-400 mb-1">Código</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm text-petrol-800 dark:text-white focus:ring-2 focus:ring-violet-500"
                    placeholder="Auto-generado"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-petrol-600 dark:text-petrol-400 mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm text-petrol-800 dark:text-white focus:ring-2 focus:ring-violet-500"
                    placeholder="Nombre del artículo"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-petrol-600 dark:text-petrol-400 mb-1">Categoría</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm text-petrol-800 dark:text-white focus:ring-2 focus:ring-violet-500"
                  >
                    {CATEGORY_OPTIONS.map(c => (
                      <option key={c} value={c}>{CATEGORY_CONFIG[c].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-petrol-600 dark:text-petrol-400 mb-1">Subcategoría</label>
                  <input
                    type="text"
                    value={form.subcategory}
                    onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm text-petrol-800 dark:text-white focus:ring-2 focus:ring-violet-500"
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-petrol-600 dark:text-petrol-400 mb-1">Curva de talles</label>
                  <input
                    type="text"
                    value={form.size_curve}
                    onChange={e => setForm(f => ({ ...f, size_curve: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm text-petrol-800 dark:text-white focus:ring-2 focus:ring-violet-500"
                    placeholder="S-M-L-XL o 36-48"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-petrol-600 dark:text-petrol-400 mb-1">Tela recomendada</label>
                  <input
                    type="text"
                    value={form.recommended_fabric}
                    onChange={e => setForm(f => ({ ...f, recommended_fabric: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm text-petrol-800 dark:text-white focus:ring-2 focus:ring-violet-500"
                    placeholder="Algodón, Jersey..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-petrol-600 dark:text-petrol-400 mb-1">Cantidad disponible</label>
                  <input
                    type="number"
                    min={0}
                    value={form.quantity_available}
                    onChange={e => setForm(f => ({ ...f, quantity_available: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm text-petrol-800 dark:text-white focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-petrol-600 dark:text-petrol-400 mb-1">Estado</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as ModelStatus }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm text-petrol-800 dark:text-white focus:ring-2 focus:ring-violet-500"
                  >
                    {MODEL_STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{MODEL_STATUS_CONFIG[s].label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-petrol-600 dark:text-petrol-400 mb-1">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm text-petrol-800 dark:text-white focus:ring-2 focus:ring-violet-500 resize-none"
                  placeholder="Descripción del modelo..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-petrol-600 dark:text-petrol-400 mb-1">Foto principal</label>
                <input
                  ref={photoRef as any}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => setPhotoFile(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  onClick={() => (photoRef as any)?.current?.click?.()}
                  className="w-full px-3 py-3 border-2 border-dashed border-petrol-300 dark:border-slate-600 rounded-lg text-sm text-petrol-500 dark:text-petrol-400 hover:border-violet-500 transition-colors flex items-center justify-center gap-2"
                >
                  <Upload size={16} />
                  {photoFile ? photoFile.name : 'Subir foto'}
                </button>
                {editingModel?.main_photo_url && !photoFile && (
                  <img
                    src={editingModel.main_photo_url}
                    alt="Actual"
                    className="mt-2 h-20 w-full object-cover rounded-lg border border-petrol-200 dark:border-slate-600"
                  />
                )}
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
                disabled={saving || !form.name.trim()}
                className="px-4 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Model Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-2xl bg-crudo-50 dark:bg-slate-800 rounded-xl shadow-xl border border-petrol-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-petrol-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-crudo-50 dark:bg-slate-800 z-10">
              <div>
                <span className="text-xs text-violet-600 dark:text-violet-400 font-mono">{showDetail.code}</span>
                <h2 className="text-lg font-semibold text-petrol-800 dark:text-white">{showDetail.name}</h2>
              </div>
              <button onClick={() => setShowDetail(null)} className="text-petrol-400 hover:text-petrol-600">
                <X size={20} />
              </button>
            </div>

            {loadingDetail ? (
              <div className="p-8 flex justify-center">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Photo */}
                {showDetail.main_photo_url && (
                  <img
                    src={showDetail.main_photo_url}
                    alt={showDetail.name}
                    className="w-full h-48 object-cover rounded-lg border border-petrol-200 dark:border-slate-600"
                  />
                )}

                {/* Info */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-petrol-500 dark:text-petrol-400">Categoría</p>
                    <p className="font-medium text-petrol-800 dark:text-white">{CATEGORY_CONFIG[showDetail.category as Category]?.label}</p>
                  </div>
                  <div>
                    <p className="text-xs text-petrol-500 dark:text-petrol-400">Curva de talles</p>
                    <p className="font-medium text-petrol-800 dark:text-white">{showDetail.size_curve || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-petrol-500 dark:text-petrol-400">Tela recomendada</p>
                    <p className="font-medium text-petrol-800 dark:text-white">{showDetail.recommended_fabric || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-petrol-500 dark:text-petrol-400">Disponibles</p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{showDetail.quantity_available}</p>
                  </div>
                  <div>
                    <p className="text-xs text-petrol-500 dark:text-petrol-400">Vendidos</p>
                    <p className="font-bold text-violet-600 dark:text-violet-400">{showDetail.quantity_sold || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-petrol-500 dark:text-petrol-400">Estado</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${MODEL_STATUS_CONFIG[showDetail.status as ModelStatus]?.bgClass} ${MODEL_STATUS_CONFIG[showDetail.status as ModelStatus]?.textClass}`}>
                      {MODEL_STATUS_CONFIG[showDetail.status as ModelStatus]?.label}
                    </span>
                  </div>
                </div>

                {showDetail.description && (
                  <div className="text-sm">
                    <p className="text-xs text-petrol-500 dark:text-petrol-400">Descripción</p>
                    <p className="text-petrol-800 dark:text-white whitespace-pre-wrap">{showDetail.description}</p>
                  </div>
                )}

                {/* Files */}
                <div>
                  <h3 className="text-sm font-semibold text-petrol-700 dark:text-petrol-300 mb-2 flex items-center gap-2">
                    <FileText size={14} /> Archivos ({modelFiles.length})
                  </h3>
                  {modelFiles.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {modelFiles.slice(0, 6).map(file => (
                        <a
                          key={file.id}
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-white dark:bg-slate-700 rounded-lg border border-petrol-200 dark:border-slate-600 text-xs hover:border-violet-400 transition-colors"
                        >
                          <p className="font-medium text-violet-600 dark:text-violet-400 truncate">{file.file_name}</p>
                          <p className="text-petrol-400 text-xs">{file.file_type.toUpperCase()}</p>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-petrol-400">Sin archivos</p>
                  )}
                </div>

                {/* Orders */}
                <div>
                  <h3 className="text-sm font-semibold text-petrol-700 dark:text-petrol-300 mb-2 flex items-center gap-2">
                    <Package size={14} /> Pedidos ({modelOrders.length})
                  </h3>
                  {modelOrders.length > 0 ? (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {modelOrders.slice(0, 5).map(order => (
                        <button
                          key={order.id}
                          onClick={() => { setShowDetail(null); onNavigate('order-detail', order.id); }}
                          className="w-full text-left px-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg text-xs border border-petrol-200 dark:border-slate-600 hover:border-violet-400 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-violet-600 dark:text-violet-400">{order.order_number}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG]?.bgClass} ${STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG]?.textClass}`}>
                              {STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG]?.label}
                            </span>
                          </div>
                          <p className="text-petrol-400 text-xs">{order.customer_name} - {order.quantity} uds</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-petrol-400">Sin pedidos asociados</p>
                  )}
                </div>

                {/* Clients */}
                <div>
                  <h3 className="text-sm font-semibold text-petrol-700 dark:text-petrol-300 mb-2 flex items-center gap-2">
                    <Users size={14} /> Clientes ({modelClients.length})
                  </h3>
                  {modelClients.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {modelClients.slice(0, 8).map(client => (
                        <span key={client.id} className="px-2 py-1 bg-white dark:bg-slate-700 rounded-lg text-xs text-petrol-700 dark:text-petrol-300 border border-petrol-200 dark:border-slate-600">
                          {client.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-petrol-400">Sin clientes asociados</p>
                  )}
                </div>
              </div>
            )}

            <div className="p-4 border-t border-petrol-200 dark:border-slate-700 flex gap-3 justify-end">
              <button
                onClick={() => onNavigate('library', undefined, undefined, showDetail.id)}
                className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <FileText size={16} /> Ver Biblioteca
              </button>
              <button
                onClick={() => { setShowDetail(null); openEditModel(showDetail); }}
                className="px-4 py-2 bg-petrol-600 hover:bg-petrol-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Edit3 size={16} /> Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-sm bg-crudo-50 dark:bg-slate-800 rounded-xl shadow-xl border border-petrol-200 dark:border-slate-700 p-5">
            <h3 className="text-lg font-semibold text-petrol-800 dark:text-white mb-2">Eliminar modelo</h3>
            <p className="text-sm text-petrol-600 dark:text-petrol-400 mb-4">
              ¿Estás seguro? Se eliminarán también todos los archivos asociados.
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
