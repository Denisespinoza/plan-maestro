import { useEffect, useMemo, useState } from 'react';
import {
  BrainCircuit, Plus, Pencil, Trash2, Loader2, X, Save, Eye, EyeOff, Star,
} from 'lucide-react';
import {
  type AiMemory, type MemoryCategory,
  MEMORY_CATEGORIES,
  getAiMemories, createAiMemory, updateAiMemory, setAiMemoryActive, deleteAiMemory,
} from '../lib/planMaestro';

interface MemoryFormData {
  category: MemoryCategory;
  title: string;
  content: string;
  importance: number;
  source: string;
  is_active: boolean;
}

const EMPTY_FORM: MemoryFormData = {
  category: 'general', title: '', content: '', importance: 3, source: '', is_active: true,
};

const CATEGORY_LABEL = (k: string) => MEMORY_CATEGORIES.find(c => c.key === k)?.label ?? k;

export default function MemoriaIA() {
  const [memories, setMemories] = useState<AiMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editMem, setEditMem] = useState<AiMemory | null>(null);
  const [filterCat, setFilterCat] = useState<string>('todas');
  const [filterActive, setFilterActive] = useState<'todas' | 'activas' | 'inactivas'>('todas');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setMemories(await getAiMemories()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const visible = useMemo(() => {
    return memories.filter(m => {
      if (filterCat !== 'todas' && m.category !== filterCat) return false;
      if (filterActive === 'activas' && !m.is_active) return false;
      if (filterActive === 'inactivas' && m.is_active) return false;
      return true;
    });
  }, [memories, filterCat, filterActive]);

  const activeCount = memories.filter(m => m.is_active).length;

  async function handleSave(data: MemoryFormData) {
    if (editMem) {
      await updateAiMemory(editMem.id, {
        category: data.category, title: data.title.trim(), content: data.content.trim(),
        importance: data.importance, source: data.source.trim() || null, is_active: data.is_active,
      });
      setMemories(prev => prev.map(m => m.id === editMem.id ? { ...m, ...data, title: data.title.trim(), content: data.content.trim(), source: data.source.trim() || null } : m));
      setEditMem(null);
    } else {
      const created = await createAiMemory({
        category: data.category, title: data.title.trim(), content: data.content.trim(),
        importance: data.importance, source: data.source.trim() || null, is_active: data.is_active,
      });
      setMemories(prev => [created, ...prev]);
      setShowForm(false);
    }
  }

  async function toggleActive(m: AiMemory) {
    await setAiMemoryActive(m.id, !m.is_active);
    setMemories(prev => prev.map(x => x.id === m.id ? { ...x, is_active: !x.is_active } : x));
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta memoria? Esta acción no se puede deshacer.')) return;
    await deleteAiMemory(id);
    setMemories(prev => prev.filter(m => m.id !== id));
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-dorado-500/30 bg-plata-900/80 p-5 shadow-pm-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(184,146,42,0.15),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(139,26,46,0.10),transparent_40%)]" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-dorado-400/80">CEO DENIS</p>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2"><BrainCircuit size={22} className="text-dorado-400" /> Memoria IA</h1>
            <p className="text-sm text-plata-400 mt-0.5">Lo que el Asistente IA recuerda sobre vos · {activeCount} activas de {memories.length}</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-dorado-600 hover:bg-dorado-500 text-plata-900 rounded-xl font-semibold text-sm transition-colors shadow-pm">
            <Plus size={16} /> Nueva memoria
          </button>
        </div>
      </div>

      {/* Filtros */}
      {memories.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={() => setFilterCat('todas')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${filterCat === 'todas' ? 'bg-dorado-500/25 text-dorado-200 border-dorado-500/50' : 'text-plata-400 border-plata-700/50 hover:text-white'}`}>Todas</button>
          {MEMORY_CATEGORIES.map(c => (
            <button key={c.key} onClick={() => setFilterCat(c.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${filterCat === c.key ? 'bg-dorado-500/25 text-dorado-200 border-dorado-500/50' : 'text-plata-400 border-plata-700/50 hover:text-white'}`}>{c.label}</button>
          ))}
          <div className="w-px h-5 bg-plata-700/50 mx-1" />
          {(['todas', 'activas', 'inactivas'] as const).map(f => (
            <button key={f} onClick={() => setFilterActive(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize ${filterActive === f ? 'bg-plata-700/60 text-white border-plata-500/50' : 'text-plata-400 border-plata-700/50 hover:text-white'}`}>{f}</button>
          ))}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-dorado-400" /></div>
      ) : memories.length === 0 ? (
        <EmptyState onNew={() => setShowForm(true)} />
      ) : visible.length === 0 ? (
        <div className="text-center py-12 text-plata-500 text-sm">Sin memorias con estos filtros.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map(m => (
            <MemoryCard key={m.id} mem={m} onEdit={() => setEditMem(m)} onToggle={() => toggleActive(m)} onDelete={() => handleDelete(m.id)} />
          ))}
        </div>
      )}

      {(showForm || editMem) && (
        <MemoryModal
          initial={editMem ? {
            category: editMem.category as MemoryCategory, title: editMem.title, content: editMem.content,
            importance: editMem.importance, source: editMem.source ?? '', is_active: editMem.is_active,
          } : EMPTY_FORM}
          isEdit={!!editMem}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditMem(null); }}
        />
      )}
    </div>
  );
}

function MemoryCard({ mem, onEdit, onToggle, onDelete }: { mem: AiMemory; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  return (
    <div className={`group rounded-xl border p-4 flex items-start gap-3 transition-all ${mem.is_active ? 'border-plata-700/60 bg-plata-900/80' : 'border-plata-800/40 bg-plata-900/40 opacity-60'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-dorado-500/15 text-dorado-300 border border-dorado-500/30">{CATEGORY_LABEL(mem.category)}</span>
          <span className="flex items-center gap-0.5 text-[10px] text-dorado-400">
            {Array.from({ length: mem.importance }).map((_, i) => <Star key={i} size={9} className="fill-dorado-400 text-dorado-400" />)}
          </span>
          {!mem.is_active && <span className="text-[10px] text-plata-500">· inactiva</span>}
          {mem.source && <span className="text-[10px] text-plata-500">· {mem.source}</span>}
        </div>
        <p className="text-sm font-semibold text-white">{mem.title}</p>
        <p className="text-xs text-plata-400 mt-0.5 leading-relaxed">{mem.content}</p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={onToggle} className="p-1.5 text-plata-500 hover:text-dorado-300 rounded transition-colors" title={mem.is_active ? 'Desactivar' : 'Activar'}>
          {mem.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
        <button onClick={onEdit} className="p-1.5 text-plata-500 hover:text-dorado-300 rounded transition-colors"><Pencil size={13} /></button>
        <button onClick={onDelete} className="p-1.5 text-plata-500 hover:text-red-400 rounded transition-colors"><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <div className="w-16 h-16 rounded-2xl border border-dorado-500/20 bg-dorado-900/20 flex items-center justify-center">
        <BrainCircuit size={32} className="text-dorado-400/50" />
      </div>
      <p className="text-plata-300 font-semibold text-base">Todavía no hay memorias.</p>
      <p className="text-plata-500 text-sm max-w-md">Guardá hechos, preferencias y reglas sobre vos para que el Asistente IA los tenga en cuenta siempre.</p>
      <button onClick={onNew} className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-dorado-600 hover:bg-dorado-500 text-plata-900 rounded-xl font-semibold text-sm transition-colors shadow-pm">
        <Plus size={16} /> Crear primera memoria
      </button>
    </div>
  );
}

function MemoryModal({ initial, isEdit, onSave, onClose }: {
  initial: MemoryFormData; isEdit: boolean;
  onSave: (d: MemoryFormData) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState<MemoryFormData>(initial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof MemoryFormData>(k: K, v: MemoryFormData[K]) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try { await onSave(form); }
    catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-plata-700/60 bg-plata-900 shadow-pm-lg p-5 flex flex-col gap-4 mb-8">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2"><BrainCircuit size={16} className="text-dorado-400" /> {isEdit ? 'Editar memoria' : 'Nueva memoria'}</h3>
          <button type="button" onClick={onClose} className="p-1 text-plata-400 hover:text-white rounded-lg"><X size={18} /></button>
        </div>

        <div>
          <label className="text-xs text-plata-400 mb-1 block">Título *</label>
          <input autoFocus value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ej: Trabajo mejor de noche" className="pm-input" required />
        </div>

        <div>
          <label className="text-xs text-plata-400 mb-1 block">Contenido *</label>
          <textarea value={form.content} onChange={e => set('content', e.target.value)} placeholder="El hecho, preferencia o regla que la IA debe recordar..." rows={3} className="pm-input resize-none" required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-plata-400 mb-1 block">Categoría</label>
            <select value={form.category} onChange={e => set('category', e.target.value as MemoryCategory)} className="pm-input">
              {MEMORY_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-plata-400 mb-1 block">Importancia ({form.importance}/5)</label>
            <input type="range" min={1} max={5} value={form.importance} onChange={e => set('importance', parseInt(e.target.value))} className="w-full accent-dorado-500 mt-2" />
          </div>
        </div>

        <div>
          <label className="text-xs text-plata-400 mb-1 block">Fuente (opcional)</label>
          <input value={form.source} onChange={e => set('source', e.target.value)} placeholder="Ej: conversación, decisión propia..." className="pm-input" />
        </div>

        <label className="flex items-center gap-2 text-sm text-plata-300 cursor-pointer">
          <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="accent-dorado-500" />
          Activa (la IA la tiene en cuenta)
        </label>

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-plata-300 rounded-lg border border-plata-700 hover:bg-plata-800 transition-colors">Cancelar</button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-dorado-600 hover:bg-dorado-500 text-plata-900 rounded-lg disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
