import { useEffect, useState } from 'react';
import {
  Target, Plus, Trash2, Pencil, Loader2, X, Save,
  AlertCircle, FolderKanban,
} from 'lucide-react';
import {
  type Goal, type Project, type Area, type Timeframe,
  AREA_CONFIG, TIMEFRAME_CONFIG,
  getGoalsWithProgress, getProjects,
  createGoal, updateGoal, deleteGoal, createProject,
} from '../lib/planMaestro';

const TODAY = new Date().toISOString().split('T')[0];

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoalFormData {
  title: string;
  project_id: string;     // '' = sin seleccionar (inválido para guardar)
  area: Area;
  timeframe: Timeframe;
  deadline: string;
  next_step: string;
  progress_manual: string;
  notes: string;
}

const EMPTY_FORM: GoalFormData = {
  title: '', project_id: '', area: 'modeltex', timeframe: 'corto',
  deadline: '', next_step: '', progress_manual: '', notes: '',
};

function formFromGoal(g: Goal): GoalFormData {
  return {
    title: g.title,
    project_id: g.project_id ?? '',
    area: g.area,
    timeframe: g.timeframe,
    deadline: g.deadline ?? '',
    next_step: g.next_step ?? '',
    progress_manual: g.progress_manual?.toString() ?? '',
    notes: g.notes ?? '',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Metas() {
  const [goals, setGoals]       = useState<Goal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState<GoalFormData>(EMPTY_FORM);
  const [editGoalId, setEditGoalId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<GoalFormData>(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [g, p] = await Promise.all([getGoalsWithProgress(), getProjects()]);
      setGoals(g);
      setProjects(p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  // ── Create ──────────────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.project_id) return;
    setSaving(true);
    try {
      const g = await createGoal({
        title: form.title.trim(),
        project_id: form.project_id,
        area: form.area,
        timeframe: form.timeframe,
        deadline: form.deadline || null,
        next_step: form.next_step.trim() || null,
        progress_manual: form.progress_manual ? parseInt(form.progress_manual) : null,
        notes: form.notes.trim() || null,
      });
      setGoals(prev => [g, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  // ── Edit ────────────────────────────────────────────────────────────────────

  function openEdit(g: Goal) {
    setEditGoalId(g.id);
    setEditForm(formFromGoal(g));
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editGoalId || !editForm.project_id) return;
    setSaving(true);
    try {
      const patch = {
        title: editForm.title.trim(),
        project_id: editForm.project_id,
        area: editForm.area,
        timeframe: editForm.timeframe,
        deadline: editForm.deadline || null,
        next_step: editForm.next_step.trim() || null,
        progress_manual: editForm.progress_manual ? parseInt(editForm.progress_manual) : null,
        notes: editForm.notes.trim() || null,
      };
      await updateGoal(editGoalId, patch);
      setGoals(prev => prev.map(g => g.id === editGoalId ? { ...g, ...patch } : g));
      setEditGoalId(null);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta meta?')) return;
    await deleteGoal(id);
    setGoals(prev => prev.filter(g => g.id !== id));
  }

  // ── Project created from quick form ─────────────────────────────────────────

  function handleProjectCreated(p: Project, target: 'create' | 'edit') {
    setProjects(prev => [...prev, p]);
    if (target === 'create') setForm(f => ({ ...f, project_id: p.id }));
    else                     setEditForm(f => ({ ...f, project_id: p.id }));
  }

  // ── Group goals ─────────────────────────────────────────────────────────────

  const withProject    = goals.filter(g => g.project_id);
  const withoutProject = goals.filter(g => !g.project_id);

  // Only projects that actually have goals
  const projectsWithGoals = projects.filter(p => withProject.some(g => g.project_id === p.id));

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-bordo-500/30 bg-plata-900/80 p-5 shadow-pm-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,26,46,0.18),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(184,146,42,0.10),transparent_40%)]" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-dorado-400/80">CEO DENIS</p>
            <h1 className="text-2xl font-bold text-white">Metas</h1>
            <p className="text-sm text-plata-400 mt-0.5">
              {goals.length} metas · {projects.length} proyectos
            </p>
          </div>
          <button
            onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 px-4 py-2 bg-bordo-600 hover:bg-bordo-500 text-white rounded-xl font-medium text-sm transition-colors shadow-pm"
          >
            <Plus size={16} /> Nueva meta
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <GoalForm
          form={form}
          setForm={setForm}
          projects={projects}
          onSubmit={handleCreate}
          onCancel={() => { setShowForm(false); setForm(EMPTY_FORM); }}
          onProjectCreated={p => handleProjectCreated(p, 'create')}
          saving={saving}
          title="Nueva meta"
        />
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-dorado-400" />
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Target size={36} className="text-plata-600" />
          <p className="text-plata-400 font-medium">No hay metas definidas todavía.</p>
          <p className="text-plata-500 text-sm">Creá una meta y asignala a un proyecto.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* ── Agrupadas por proyecto ── */}
          {projectsWithGoals.map(p => {
            const projectGoals = withProject.filter(g => g.project_id === p.id);
            const area = AREA_CONFIG[p.area] ?? AREA_CONFIG['personal'];
            return (
              <section key={p.id}>
                <div className="flex items-center gap-2 mb-3">
                  <FolderKanban size={14} className="text-dorado-400 shrink-0" />
                  <span className="text-sm font-bold text-white">{p.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${area.bg} ${area.color} ${area.border}`}>
                    {area.label}
                  </span>
                  <span className="text-[10px] text-plata-500 bg-plata-800/60 px-1.5 py-0.5 rounded-full shrink-0">
                    {projectGoals.length}
                  </span>
                  <div className="flex-1 h-px bg-plata-700/40" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {projectGoals.map(g => (
                    <GoalCard key={g.id} goal={g} onEdit={() => openEdit(g)} onDelete={() => handleDelete(g.id)} />
                  ))}
                </div>
              </section>
            );
          })}

          {/* ── Sin proyecto (legado) ── */}
          {withoutProject.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={14} className="text-amber-400 shrink-0" />
                <span className="text-sm font-bold text-amber-300">Sin proyecto</span>
                <span className="text-[10px] text-plata-500 bg-plata-800/60 px-1.5 py-0.5 rounded-full shrink-0">
                  {withoutProject.length}
                </span>
                <div className="flex-1 h-px bg-plata-700/40" />
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-900/10 px-3 py-2 mb-3 text-xs text-amber-300">
                Estas metas no tienen proyecto asignado. Editálas para relacionarlas.
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {withoutProject.map(g => (
                  <GoalCard key={g.id} goal={g} onEdit={() => openEdit(g)} onDelete={() => handleDelete(g.id)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editGoalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <GoalForm
            form={editForm}
            setForm={setEditForm}
            projects={projects}
            onSubmit={handleSaveEdit}
            onCancel={() => setEditGoalId(null)}
            onProjectCreated={p => handleProjectCreated(p, 'edit')}
            saving={saving}
            title="Editar meta"
            modal
          />
        </div>
      )}
    </div>
  );
}

// ─── GoalCard ─────────────────────────────────────────────────────────────────

function GoalCard({ goal, onEdit, onDelete }: { goal: Goal; onEdit: () => void; onDelete: () => void }) {
  const area    = AREA_CONFIG[goal.area] ?? AREA_CONFIG['personal'];
  const tf      = TIMEFRAME_CONFIG[goal.timeframe];
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
        <span className={`text-[10px] font-medium ${tf.color}`}>{tf.label}</span>
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

// ─── GoalForm ─────────────────────────────────────────────────────────────────

function GoalForm({
  form, setForm, projects, onSubmit, onCancel, onProjectCreated, saving, title, modal,
}: {
  form: GoalFormData;
  setForm: (f: GoalFormData) => void;
  projects: Project[];
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onProjectCreated: (p: Project) => void;
  saving: boolean;
  title: string;
  modal?: boolean;
}) {
  const [showQuick, setShowQuick] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickArea, setQuickArea] = useState<Area>('modeltex');
  const [quickSaving, setQuickSaving] = useState(false);

  async function handleQuickCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!quickName.trim()) return;
    setQuickSaving(true);
    try {
      const p = await createProject({
        name: quickName.trim(),
        area: quickArea,
        description: null,
        color: null,
        status: 'activo',
        priority: 'media',
        start_date: null,
        target_date: null,
        progress: 0,
        next_step: null,
        notes: null,
      });
      onProjectCreated(p);
      setShowQuick(false);
      setQuickName('');
    } catch (e) { console.error(e); }
    finally { setQuickSaving(false); }
  }

  const canSave = form.title.trim() && form.project_id;

  const content = (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-dorado-300">{title}</h3>
        <button type="button" onClick={onCancel} className="p-1 text-plata-400 hover:text-white rounded-lg">
          <X size={16} />
        </button>
      </div>

      {/* Título */}
      <input
        value={form.title}
        onChange={e => setForm({ ...form, title: e.target.value })}
        placeholder="Título de la meta *"
        className="pm-input"
        required
        autoFocus
      />

      {/* Proyecto relacionado — obligatorio */}
      <div>
        <label className="text-xs text-plata-400 mb-1 block">
          Proyecto relacionado <span className="text-red-400">*</span>
        </label>
        {projects.length === 0 ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-900/10 px-3 py-2 text-xs text-amber-300">
            Primero necesitás crear un proyecto.
          </div>
        ) : (
          <select
            value={form.project_id}
            onChange={e => setForm({ ...form, project_id: e.target.value })}
            className="pm-input"
            required
          >
            <option value="">— Seleccioná un proyecto —</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        {/* Quick create project */}
        {!showQuick ? (
          <button
            type="button"
            onClick={() => setShowQuick(true)}
            className="mt-1.5 flex items-center gap-1 text-[11px] text-dorado-400 hover:text-dorado-300 transition-colors"
          >
            <Plus size={11} /> Crear nuevo proyecto
          </button>
        ) : (
          <div className="mt-2 rounded-xl border border-dorado-500/30 bg-plata-900/90 p-3 flex flex-col gap-2">
            <p className="text-[11px] font-semibold text-dorado-300">Nuevo proyecto rápido</p>
            <input
              value={quickName}
              onChange={e => setQuickName(e.target.value)}
              placeholder="Nombre del proyecto"
              className="pm-input text-sm"
              autoFocus
            />
            <select
              value={quickArea}
              onChange={e => setQuickArea(e.target.value as Area)}
              className="pm-input text-sm"
            >
              <option value="modeltex">MODELTEX</option>
              <option value="moldey">MOLDEY</option>
              <option value="personal">Personal</option>
              <option value="sistemas">Sistemas</option>
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowQuick(false); setQuickName(''); }}
                className="flex-1 py-1.5 text-xs text-plata-400 border border-plata-700 rounded-lg hover:bg-plata-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleQuickCreate}
                disabled={quickSaving || !quickName.trim()}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold bg-bordo-600 hover:bg-bordo-500 text-white rounded-lg transition-colors disabled:opacity-60"
              >
                {quickSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Crear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Área + Plazo */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-plata-400 mb-1 block">Área</label>
          <select value={form.area} onChange={e => setForm({ ...form, area: e.target.value as Area })} className="pm-input">
            {(Object.keys(AREA_CONFIG) as Area[]).map(a => (
              <option key={a} value={a}>{AREA_CONFIG[a].label}</option>
            ))}
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

      {/* Fechas + Progreso */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-plata-400 mb-1 block">Fecha límite</label>
          <input
            type="date"
            value={form.deadline}
            onChange={e => setForm({ ...form, deadline: e.target.value })}
            className="pm-input"
          />
        </div>
        <div>
          <label className="text-xs text-plata-400 mb-1 block">Progreso manual (%)</label>
          <input
            type="number" min="0" max="100"
            value={form.progress_manual}
            onChange={e => setForm({ ...form, progress_manual: e.target.value })}
            placeholder="0-100"
            className="pm-input"
          />
        </div>
      </div>

      {/* Próximo paso */}
      <div>
        <label className="text-xs text-plata-400 mb-1 block">Próximo paso</label>
        <input
          value={form.next_step}
          onChange={e => setForm({ ...form, next_step: e.target.value })}
          placeholder="¿Qué hay que hacer ahora?"
          className="pm-input"
        />
      </div>

      {/* Notas */}
      <div>
        <label className="text-xs text-plata-400 mb-1 block">Notas</label>
        <textarea
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          rows={2}
          className="pm-input resize-none"
        />
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-plata-300 rounded-lg border border-plata-700 hover:bg-plata-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || !canSave}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-bordo-600 hover:bg-bordo-500 text-white rounded-lg transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar
        </button>
      </div>
    </form>
  );

  if (modal) {
    return (
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-plata-700/60 bg-plata-900 shadow-pm-lg p-5">
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
