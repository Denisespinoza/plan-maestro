import { useEffect, useRef, useState } from 'react';
import { GripVertical, Plus, Trash2, Star, Loader2, X, Save, Pencil, Columns3 } from 'lucide-react';
import {
  type Task,
  type TaskStatus,
  type Area,
  type Priority,
  type KanbanColumn,
  AREA_CONFIG,
  PRIORITY_CONFIG,
  SYSTEM_COLUMNS,
  DEFAULT_BUSINESSES,
  businessBadge,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getKanbanColumns,
  createKanbanColumn,
  updateKanbanColumn,
  deleteKanbanColumn,
  moveTaskToSystemColumn,
  moveTaskToCustomColumn,
} from '../lib/planMaestro';

// Columna unificada para render (sistema o custom)
interface BoardColumn {
  key: string;
  label: string;
  color: string;
  isSystem: boolean;
  customId?: string;
}

interface TaskFormData {
  title: string;
  area: Area;
  priority: Priority;
  notes: string;
  is_mit: boolean;
  due_date: string;
  business: string;
}

const EMPTY_FORM: TaskFormData = {
  title: '', area: 'modeltex', priority: 'media', notes: '',
  is_mit: false, due_date: '', business: '',
};

const COLUMN_COLORS = ['#868E96', '#B8922A', '#8B1A2E', '#D97706', '#16A34A', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4'];

// Columna efectiva de una tarea: custom si tiene column_key, si no su status base
function effectiveKey(t: Task): string {
  return t.column_key || t.status;
}

export default function Kanban() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [customColumns, setCustomColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<BoardColumn | null>(null);
  const [form, setForm] = useState<TaskFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [filterBusiness, setFilterBusiness] = useState<string>(() => {
    const pending = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('kanban_business_filter') : null;
    if (pending) { sessionStorage.removeItem('kanban_business_filter'); return pending; }
    return 'all';
  });
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [editColumn, setEditColumn] = useState<KanbanColumn | null>(null);
  const dragRef = useRef<string | null>(null);

  useEffect(() => { load(); }, []);

  // "Ver tareas" desde Mis negocios cuando ya estamos en Kanban
  useEffect(() => {
    function onFilterEvent() {
      const pending = sessionStorage.getItem('kanban_business_filter');
      if (pending) { sessionStorage.removeItem('kanban_business_filter'); setFilterBusiness(pending); }
    }
    window.addEventListener('kanban-filter', onFilterEvent);
    return () => window.removeEventListener('kanban-filter', onFilterEvent);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [t, c] = await Promise.all([getTasks(), getKanbanColumns()]);
      setTasks(t);
      setCustomColumns(c);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  // Columnas a mostrar: sistema + custom
  const boardColumns: BoardColumn[] = [
    ...SYSTEM_COLUMNS.map(c => ({ key: c.key, label: c.label, color: c.color, isSystem: true })),
    ...customColumns.map(c => ({ key: c.key, label: c.name, color: c.color ?? '#868E96', isSystem: false, customId: c.id })),
  ];

  const byColumn = (colKey: string) => tasks.filter(t => {
    if (effectiveKey(t) !== colKey) return false;
    if (filterBusiness === 'all') return true;
    if (filterBusiness === 'none') return !t.business_key;
    return t.business_key === filterBusiness;
  });

  // ── Drag & drop ──
  function onDragStart(e: React.DragEvent, id: string) {
    dragRef.current = id;
    setDragging(id);
    e.dataTransfer.effectAllowed = 'move';
  }
  function onDragEnd() { setDragging(null); setDragOver(null); dragRef.current = null; }

  async function onDrop(e: React.DragEvent, col: BoardColumn) {
    e.preventDefault();
    const id = dragRef.current;
    setDragOver(null); setDragging(null); dragRef.current = null;
    if (!id) return;
    const task = tasks.find(t => t.id === id);
    if (!task || effectiveKey(task) === col.key) return;

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id
      ? { ...t, status: col.isSystem ? (col.key as TaskStatus) : 'inbox', column_key: col.isSystem ? null : col.key }
      : t));

    try {
      if (col.isSystem) await moveTaskToSystemColumn(id, col.key as TaskStatus);
      else await moveTaskToCustomColumn(id, col.key);
    } catch (err) { console.error(err); load(); }
  }

  // ── Crear tarea ──
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !showForm) return;
    setSaving(true);
    try {
      const t = await createTask({
        title: form.title.trim(),
        area: form.area,
        priority: form.priority,
        notes: form.notes.trim() || null,
        is_mit: form.is_mit,
        status: showForm.isSystem ? (showForm.key as TaskStatus) : 'inbox',
        due_date: form.due_date || null,
        position: 0,
        project_id: null,
        goal_id: null,
        business_key: form.business || null,
        column_key: showForm.isSystem ? null : showForm.key,
      });
      setTasks(prev => [t, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(null);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTask) return;
    setSaving(true);
    try {
      await updateTask(editTask.id, {
        title: editTask.title,
        area: editTask.area,
        priority: editTask.priority,
        notes: editTask.notes,
        is_mit: editTask.is_mit,
        due_date: editTask.due_date,
        business_key: editTask.business_key,
      });
      setTasks(prev => prev.map(t => t.id === editTask.id ? editTask : t));
      setEditTask(null);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar tarea?')) return;
    await deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  // ── Columnas custom ──
  async function handleCreateColumn(name: string, color: string) {
    const dup = boardColumns.some(c => c.label.toLowerCase() === name.trim().toLowerCase());
    if (dup) { alert('Ya existe una columna con ese nombre.'); return; }
    const col = await createKanbanColumn(name, color, customColumns.length);
    setCustomColumns(prev => [...prev, col]);
    setShowColumnModal(false);
  }

  async function handleEditColumn(name: string, color: string) {
    if (!editColumn) return;
    await updateKanbanColumn(editColumn.id, { name: name.trim(), color });
    setCustomColumns(prev => prev.map(c => c.id === editColumn.id ? { ...c, name: name.trim(), color } : c));
    setEditColumn(null);
  }

  async function handleDeleteColumn(col: KanbanColumn) {
    const count = tasks.filter(t => t.column_key === col.key).length;
    if (count > 0) {
      alert(`Mové las ${count} tarea(s) antes de eliminar esta columna.`);
      return;
    }
    if (!confirm(`¿Eliminar la columna "${col.name}"?`)) return;
    await deleteKanbanColumn(col.id);
    setCustomColumns(prev => prev.filter(c => c.id !== col.id));
  }

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 size={32} className="animate-spin text-dorado-400" /></div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-bordo-500/30 bg-plata-900/80 p-4 shadow-pm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,26,46,0.15),transparent_40%)]" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-dorado-400/80">CEO DENIS</p>
            <h1 className="text-xl font-bold text-white">Kanban</h1>
            <p className="text-sm text-plata-400">{tasks.filter(t => t.status !== 'hecho' || t.column_key).length} tareas activas · {tasks.filter(t => effectiveKey(t) === 'hecho').length} completadas</p>
          </div>
          <button
            onClick={() => setShowColumnModal(true)}
            className="flex items-center gap-2 px-3 py-2 border border-dorado-500/40 text-dorado-300 hover:bg-dorado-900/30 rounded-xl text-sm font-medium transition-colors"
          >
            <Columns3 size={15} /> Nueva columna
          </button>
        </div>
      </div>

      {/* Filtro por negocio */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {([['all', 'Todas'], ['none', 'Sin negocio']] as [string, string][]).map(([val, lbl]) => (
          <button key={val} onClick={() => setFilterBusiness(val)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              filterBusiness === val ? 'bg-plata-700/60 text-white border-plata-500/50' : 'text-plata-400 border-plata-700/50 hover:text-white'
            }`}>{lbl}</button>
        ))}
        {DEFAULT_BUSINESSES.map(b => (
          <button key={b.key} onClick={() => setFilterBusiness(b.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border flex items-center gap-1.5 ${
              filterBusiness === b.key ? 'text-white border-current' : 'text-plata-400 border-plata-700/50 hover:text-white'
            }`}
            style={filterBusiness === b.key ? { backgroundColor: `${b.color}33`, borderColor: b.color } : undefined}>
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: b.color }} />{b.name}
          </button>
        ))}
      </div>

      {/* Board */}
      <div className="overflow-x-auto pb-3">
        <div className="flex gap-2.5 min-w-max items-start">
          {boardColumns.map(col => {
            const colTasks = byColumn(col.key);
            const isDragTarget = dragOver === col.key;
            return (
              <div
                key={col.key}
                className={`w-[250px] flex flex-col rounded-xl border bg-plata-900/60 transition-all h-[calc(100vh-15rem)] ${
                  isDragTarget ? 'border-dorado-400/60 ring-2 ring-dorado-400/20' : 'border-plata-700/50'
                }`}
                onDragOver={e => { e.preventDefault(); setDragOver(col.key); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => onDrop(e, col)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-plata-700/50 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: col.color }} />
                    <span className="text-xs font-bold uppercase tracking-wider text-plata-200 truncate" style={{ color: col.color }}>{col.label}</span>
                    <span className="text-[10px] text-plata-500 bg-plata-800/60 px-1.5 py-0.5 rounded-full shrink-0">{colTasks.length}</span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {!col.isSystem && (
                      <>
                        <button onClick={() => { const cc = customColumns.find(c => c.id === col.customId); if (cc) setEditColumn(cc); }}
                          className="p-1 rounded text-plata-600 hover:text-dorado-300 transition-colors" title="Editar columna">
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => { const cc = customColumns.find(c => c.id === col.customId); if (cc) handleDeleteColumn(cc); }}
                          className="p-1 rounded text-plata-600 hover:text-red-400 transition-colors" title="Eliminar columna">
                          <Trash2 size={11} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => { setShowForm(col); setForm(EMPTY_FORM); }}
                      className="p-1 rounded text-plata-500 hover:text-dorado-300 hover:bg-dorado-900/30 transition-colors" title="Nueva tarea"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Quick create form */}
                {showForm?.key === col.key && (
                  <form onSubmit={handleCreate} className="p-2.5 border-b border-plata-700/50 flex flex-col gap-2 shrink-0">
                    <input autoFocus value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Título de la tarea" className="pm-input text-xs" required />
                    <div className="flex gap-2">
                      <select value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value as Area }))} className="pm-input text-xs flex-1">
                        {(Object.keys(AREA_CONFIG) as Area[]).map(a => <option key={a} value={a}>{AREA_CONFIG[a].label}</option>)}
                      </select>
                      <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))} className="pm-input text-xs flex-1">
                        {(Object.keys(PRIORITY_CONFIG) as Priority[]).map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
                      </select>
                    </div>
                    <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="pm-input text-xs" />
                    <select value={form.business} onChange={e => setForm(f => ({ ...f, business: e.target.value }))} className="pm-input text-xs">
                      <option value="">Sin negocio</option>
                      {DEFAULT_BUSINESSES.map(b => <option key={b.key} value={b.key}>{b.name}</option>)}
                    </select>
                    <label className="flex items-center gap-1.5 text-xs text-plata-300 cursor-pointer">
                      <input type="checkbox" checked={form.is_mit} onChange={e => setForm(f => ({ ...f, is_mit: e.target.checked }))} className="accent-dorado-500" />
                      <Star size={11} className="text-dorado-400" /> MIT
                    </label>
                    <div className="flex gap-1.5">
                      <button type="submit" disabled={saving} className="flex-1 py-1.5 text-xs font-semibold bg-bordo-600 hover:bg-bordo-500 text-white rounded-lg transition-colors disabled:opacity-60">
                        {saving ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Agregar'}
                      </button>
                      <button type="button" onClick={() => setShowForm(null)} className="p-1.5 text-plata-400 hover:text-white rounded-lg border border-plata-700 transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  </form>
                )}

                {/* Cards (scroll interno) */}
                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
                  {colTasks.map(t => (
                    <KanbanCard key={t.id} task={t} isDragging={dragging === t.id}
                      onDragStart={onDragStart} onDragEnd={onDragEnd}
                      onEdit={() => setEditTask({ ...t })} onDelete={() => handleDelete(t.id)} />
                  ))}
                  {colTasks.length === 0 && (
                    <p className="text-[10px] text-plata-600 text-center py-4">Sin tareas</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit task modal */}
      {editTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleSaveEdit} className="w-full max-w-md rounded-2xl border border-plata-700/60 bg-plata-900 shadow-pm-lg p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Editar tarea</h3>
              <button type="button" onClick={() => setEditTask(null)} className="p-1 text-plata-400 hover:text-white rounded-lg"><X size={18} /></button>
            </div>
            <input value={editTask.title} onChange={e => setEditTask(t => t ? { ...t, title: e.target.value } : t)} className="pm-input" required />
            <textarea value={editTask.notes ?? ''} onChange={e => setEditTask(t => t ? { ...t, notes: e.target.value } : t)} placeholder="Notas" rows={2} className="pm-input resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-plata-400 mb-1 block">Área</label>
                <select value={editTask.area} onChange={e => setEditTask(t => t ? { ...t, area: e.target.value as Area } : t)} className="pm-input">
                  {(Object.keys(AREA_CONFIG) as Area[]).map(a => <option key={a} value={a}>{AREA_CONFIG[a].label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-plata-400 mb-1 block">Prioridad</label>
                <select value={editTask.priority} onChange={e => setEditTask(t => t ? { ...t, priority: e.target.value as Priority } : t)} className="pm-input">
                  {(Object.keys(PRIORITY_CONFIG) as Priority[]).map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-plata-400 mb-1 block">Fecha límite</label>
                <input type="date" value={editTask.due_date ?? ''} onChange={e => setEditTask(t => t ? { ...t, due_date: e.target.value || null } : t)} className="pm-input" />
              </div>
              <div>
                <label className="text-xs text-plata-400 mb-1 block">Negocio</label>
                <select value={editTask.business_key ?? ''} onChange={e => setEditTask(t => t ? { ...t, business_key: e.target.value || null } : t)} className="pm-input">
                  <option value="">Ninguno</option>
                  {DEFAULT_BUSINESSES.map(b => <option key={b.key} value={b.key}>{b.name}</option>)}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-plata-300 cursor-pointer">
              <input type="checkbox" checked={editTask.is_mit} onChange={e => setEditTask(t => t ? { ...t, is_mit: e.target.checked } : t)} className="accent-dorado-500" />
              <Star size={14} className="text-dorado-400" /> Marcar como MIT
            </label>
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => setEditTask(null)} className="px-4 py-2 text-sm text-plata-300 rounded-lg border border-plata-700 hover:bg-plata-800 transition-colors">Cancelar</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-bordo-600 hover:bg-bordo-500 text-white rounded-lg transition-colors disabled:opacity-60">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create/Edit column modal */}
      {(showColumnModal || editColumn) && (
        <ColumnModal
          initial={editColumn ? { name: editColumn.name, color: editColumn.color ?? COLUMN_COLORS[0] } : { name: '', color: COLUMN_COLORS[0] }}
          title={editColumn ? 'Editar columna' : 'Nueva columna'}
          onSave={editColumn ? handleEditColumn : handleCreateColumn}
          onClose={() => { setShowColumnModal(false); setEditColumn(null); }}
        />
      )}
    </div>
  );
}

// ─── COLUMN MODAL ──────────────────────────────────────────────────────────────

function ColumnModal({ initial, title, onSave, onClose }: {
  initial: { name: string; color: string };
  title: string;
  onSave: (name: string, color: string) => Promise<void> | void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try { await onSave(name, color); }
    catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-plata-700/60 bg-plata-900 shadow-pm-lg p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2"><Columns3 size={16} className="text-dorado-400" /> {title}</h3>
          <button type="button" onClick={onClose} className="p-1 text-plata-400 hover:text-white rounded-lg"><X size={18} /></button>
        </div>
        <div>
          <label className="text-xs text-plata-400 mb-1 block">Nombre de la columna *</label>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Ej: ENFOQUE, IDEAS, BLOQUEADO..." className="pm-input" required />
        </div>
        <div>
          <label className="text-xs text-plata-400 mb-1.5 block">Color / acento</label>
          <div className="flex flex-wrap gap-2">
            {COLUMN_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-lg transition-all ${color === c ? 'ring-2 ring-white/60 scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-plata-300 rounded-lg border border-plata-700 hover:bg-plata-800 transition-colors">Cancelar</button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-bordo-600 hover:bg-bordo-500 text-white rounded-lg transition-colors disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── KANBAN CARD ───────────────────────────────────────────────────────────────

function KanbanCard({ task, isDragging, onDragStart, onDragEnd, onEdit, onDelete }: {
  task: Task;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const area = AREA_CONFIG[task.area];
  const prio = PRIORITY_CONFIG[task.priority];
  const biz = businessBadge(task.business_key);
  const today = new Date().toISOString().split('T')[0];
  const overdue = task.due_date && task.due_date < today && effectiveKey(task) !== 'hecho';

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
      className={`group rounded-lg border bg-plata-900 p-2.5 cursor-grab active:cursor-grabbing transition-all select-none ${
        isDragging ? 'opacity-40 border-dorado-400/60 shadow-pm' : 'border-plata-700/60 hover:border-dorado-500/40'
      }`}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical size={12} className="text-plata-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1 justify-between">
            <p className="text-xs font-medium text-white leading-snug line-clamp-2 flex-1">{task.title}</p>
            {task.is_mit && <Star size={11} className="text-dorado-400 shrink-0 mt-0.5" />}
          </div>
          {task.notes && <p className="text-[10px] text-plata-500 mt-0.5 line-clamp-1">{task.notes}</p>}
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${area.bg} ${area.color} ${area.border} border`}>
              {area.label}
            </span>
            {biz && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold border"
                style={{ color: biz.color, borderColor: `${biz.color}66`, backgroundColor: `${biz.color}22` }}>
                {biz.name}
              </span>
            )}
            <span className={`text-[9px] font-medium flex items-center gap-0.5 ${prio.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />{prio.label}
            </span>
            {task.due_date && (
              <span className={`text-[9px] font-medium ${overdue ? 'text-red-400' : 'text-plata-500'}`}>
                {overdue ? '⚠ ' : ''}{task.due_date}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-1 mt-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1 text-plata-500 hover:text-dorado-300 rounded transition-colors"><Pencil size={11} /></button>
        <button onClick={onDelete} className="p-1 text-plata-500 hover:text-red-400 rounded transition-colors"><Trash2 size={11} /></button>
      </div>
    </div>
  );
}
