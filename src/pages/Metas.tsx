import { useEffect, useState } from 'react';
import { Target, Plus, Trash2, Pencil, Loader2, X, Save, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import {
  type Goal,
  type Area,
  type Timeframe,
  AREA_CONFIG,
  TIMEFRAME_CONFIG,
  getGoalsWithProgress,
  createGoal,
  updateGoal,
  deleteGoal,
} from '../lib/planMaestro';

const TODAY = new Date().toISOString().split('T')[0];

interface GoalFormData {
  title: string;
  area: Area;
  timeframe: Timeframe;
  deadline: string;
  next_step: string;
  progress_manual: string;
  notes: string;
}

const EMPTY_FORM: GoalFormData = {
  title: '', area: 'modeltex', timeframe: 'corto',
  deadline: '', next_step: '', progress_manual: '', notes: '',
};

export default function Metas() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<GoalFormData>(EMPTY_FORM);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<Timeframe, boolean>>({ corto: false, mediano: false, largo: false });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setGoals(await getGoalsWithProgress()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const byTimeframe = (tf: Timeframe) => goals.filter(g => g.timeframe === tf);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const g = await createGoal({
        title: form.title.trim(),
        area: form.area,
        timeframe: form.timeframe,
        deadline: form.deadline || null,
        next_step: form.next_step.trim() || null,
        progress_manual: form.progress_manual ? parseInt(form.progress_manual) : null,
        notes: form.notes.trim() || null,
        project_id: null,
      });
      setGoals(prev => [g, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editGoal) return;
    setSaving(true);
    try {
      await updateGoal(editGoal.id, {
        title: editGoal.title,
        area: editGoal.area,
        timeframe: editGoal.timeframe,
        deadline: editGoal.deadline,
        next_step: editGoal.next_step,
        progress_manual: editGoal.progress_manual,
        notes: editGoal.notes,
      });
      setGoals(prev => prev.map(g => g.id === editGoal.id ? { ...g, ...editGoal } : g));
      setEditGoal(null);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta meta?')) return;
    await deleteGoal(id);
    setGoals(prev => prev.filter(g => g.id !== id));
  }

  const toggleCollapse = (tf: Timeframe) => setCollapsed(c => ({ ...c, [tf]: !c[tf] }));

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-bordo-500/30 bg-plata-900/80 p-5 shadow-pm-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,26,46,0.18),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(184,146,42,0.10),transparent_40%)]" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-dorado-400/80">Centro de Operaciones</p>
            <h1 className="text-2xl font-bold text-white">Metas</h1>
            <p className="text-sm text-plata-400 mt-0.5">{goals.filter(g => g.timeframe === 'corto').length} corto · {goals.filter(g => g.timeframe === 'mediano').length} mediano · {goals.filter(g => g.timeframe === 'largo').length} largo plazo</p>
          </div>
          <button
            onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 px-4 py-2 bg-bordo-600 hover:bg-bordo-500 text-white rounded-xl font-medium text-sm transition-colors shadow-pm"
          >
            <Plus size={16} /> Nueva meta
          </button>
        </div>
      </div>

      {/* New goal form */}
      {showForm && (
        <GoalForm
          form={form}
          setForm={setForm}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          saving={saving}
          title="Nueva meta"
        />
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-dorado-400" />
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Target size={36} className="text-plata-600" />
          <p className="text-plata-400 font-medium">No hay metas definidas todavía.</p>
          <p className="text-plata-500 text-sm">Definí tus metas por plazo para tener foco estratégico.</p>
        </div>
      ) : (
        (['corto', 'mediano', 'largo'] as Timeframe[]).map(tf => {
          const tfGoals = byTimeframe(tf);
          const cfg = TIMEFRAME_CONFIG[tf];
          const isCollapsed = collapsed[tf];
          return (
            <section key={tf}>
              <button
                onClick={() => toggleCollapse(tf)}
                className="w-full flex items-center gap-3 mb-3 group"
              >
                <div className={`flex items-center gap-2`}>
                  <Target size={15} className={cfg.color} />
                  <span className={`text-sm font-bold uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
                  <span className="text-xs text-plata-500 bg-plata-800/60 px-1.5 py-0.5 rounded-full">{tfGoals.length}</span>
                </div>
                <div className="flex-1 h-px bg-plata-700/40" />
                {isCollapsed ? <ChevronDown size={14} className="text-plata-500" /> : <ChevronUp size={14} className="text-plata-500" />}
              </button>

              {!isCollapsed && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {tfGoals.map(g => (
                    <GoalCard key={g.id} goal={g} onEdit={() => setEditGoal({ ...g })} onDelete={() => handleDelete(g.id)} />
                  ))}
                  {tfGoals.length === 0 && (
                    <div className="col-span-full rounded-xl border border-dashed border-plata-700/40 p-6 text-center text-sm text-plata-500">
                      Sin metas en esta categoría
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })
      )}

      {/* Edit modal */}
      {editGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <GoalForm
            form={{
              title: editGoal.title,
              area: editGoal.area,
              timeframe: editGoal.timeframe,
              deadline: editGoal.deadline ?? '',
              next_step: editGoal.next_step ?? '',
              progress_manual: editGoal.progress_manual?.toString() ?? '',
              notes: editGoal.notes ?? '',
            }}
            setForm={f => setEditGoal(prev => prev ? {
              ...prev,
              title: f.title, area: f.area, timeframe: f.timeframe,
              deadline: f.deadline || null, next_step: f.next_step || null,
              progress_manual: f.progress_manual ? parseInt(f.progress_manual) : null,
              notes: f.notes || null,
            } : prev)}
            onSubmit={handleSaveEdit}
            onCancel={() => setEditGoal(null)}
            saving={saving}
            title="Editar meta"
            modal
          />
        </div>
      )}
    </div>
  );
}

function GoalCard({ goal, onEdit, onDelete }: { goal: Goal; onEdit: () => void; onDelete: () => void }) {
  const area = AREA_CONFIG[goal.area];
  const overdue = goal.deadline && goal.deadline < TODAY;
  const progress = goal.task_count && goal.task_count > 0
    ? Math.round((goal.done_task_count! / goal.task_count) * 100)
    : goal.progress_manual ?? 0;

  return (
    <div className="group rounded-2xl border border-plata-700/60 bg-plata-900/80 p-4 hover:border-dorado-500/30 transition-all hover:shadow-pm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-white leading-snug flex-1">{goal.title}</h3>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEdit} className="p-1 text-plata-500 hover:text-dorado-300 rounded transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete} className="p-1 text-plata-500 hover:text-red-400 rounded transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${area.bg} ${area.color} ${area.border}`}>
          {area.label}
        </span>
        {overdue && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-red-400">
            <AlertCircle size={10} /> Atrasada
          </span>
        )}
        {goal.deadline && (
          <span className={`text-[10px] font-medium ${overdue ? 'text-red-400' : 'text-plata-400'}`}>
            Límite: {goal.deadline}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-[10px] text-plata-500 mb-1">
          <span>Progreso</span>
          <span className="text-dorado-400 font-medium">{progress}%</span>
        </div>
        <div className="h-1.5 bg-plata-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-bordo-600 to-dorado-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {goal.task_count !== undefined && goal.task_count > 0 && (
          <p className="text-[10px] text-plata-500 mt-0.5">{goal.done_task_count}/{goal.task_count} tareas</p>
        )}
      </div>

      {goal.next_step && (
        <div className="rounded-lg bg-dorado-900/20 border border-dorado-500/20 px-2.5 py-1.5">
          <p className="text-[10px] text-dorado-300/60 font-semibold uppercase tracking-wider mb-0.5">Próximo paso</p>
          <p className="text-xs text-dorado-200">{goal.next_step}</p>
        </div>
      )}
    </div>
  );
}

function GoalForm({
  form, setForm, onSubmit, onCancel, saving, title, modal,
}: {
  form: GoalFormData;
  setForm: (f: GoalFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  title: string;
  modal?: boolean;
}) {
  const content = (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-dorado-300">{title}</h3>
        <button type="button" onClick={onCancel} className="p-1 text-plata-400 hover:text-white rounded-lg">
          <X size={16} />
        </button>
      </div>
      <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Título de la meta" className="pm-input" required autoFocus />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-plata-400 mb-1 block">Área</label>
          <select value={form.area} onChange={e => setForm({ ...form, area: e.target.value as Area })} className="pm-input">
            {(Object.keys(AREA_CONFIG) as Area[]).map(a => <option key={a} value={a}>{AREA_CONFIG[a].label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-plata-400 mb-1 block">Plazo</label>
          <select value={form.timeframe} onChange={e => setForm({ ...form, timeframe: e.target.value as Timeframe })} className="pm-input">
            <option value="corto">Corto</option>
            <option value="mediano">Mediano</option>
            <option value="largo">Largo</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-plata-400 mb-1 block">Fecha límite</label>
          <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="pm-input" />
        </div>
        <div>
          <label className="text-xs text-plata-400 mb-1 block">Progreso manual (%)</label>
          <input type="number" min="0" max="100" value={form.progress_manual} onChange={e => setForm({ ...form, progress_manual: e.target.value })} placeholder="0-100" className="pm-input" />
        </div>
      </div>
      <div>
        <label className="text-xs text-plata-400 mb-1 block">Próximo paso</label>
        <input value={form.next_step} onChange={e => setForm({ ...form, next_step: e.target.value })} placeholder="¿Qué hay que hacer ahora?" className="pm-input" />
      </div>
      <div>
        <label className="text-xs text-plata-400 mb-1 block">Notas</label>
        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="pm-input resize-none" />
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-plata-300 rounded-lg border border-plata-700 hover:bg-plata-800 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-bordo-600 hover:bg-bordo-500 text-white rounded-lg transition-colors disabled:opacity-60">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar
        </button>
      </div>
    </form>
  );

  if (modal) {
    return (
      <div className="w-full max-w-lg rounded-2xl border border-plata-700/60 bg-plata-900 shadow-pm-lg p-5">
        {content}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dorado-500/30 bg-plata-900/90 p-4">
      {content}
    </div>
  );
}
