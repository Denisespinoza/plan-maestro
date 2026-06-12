import { useEffect, useState } from 'react';
import { FolderKanban, Plus, Trash2, Pencil, Loader2, X, Save, Target, CheckSquare } from 'lucide-react';
import {
  type Project,
  type Goal,
  type Task,
  type Area,
  AREA_CONFIG,
  TIMEFRAME_CONFIG,
  getProjects,
  getGoalsWithProgress,
  getTasks,
  createProject,
  updateProject,
  deleteProject,
} from '../lib/planMaestro';

interface ProjectFormData {
  name: string;
  area: Area;
  description: string;
}

const EMPTY_FORM: ProjectFormData = { name: '', area: 'modeltex', description: '' };

export default function Proyectos() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProjectFormData>(EMPTY_FORM);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [p, g, t] = await Promise.all([getProjects(), getGoalsWithProgress(), getTasks()]);
      setProjects(p);
      setGoals(g);
      setTasks(t);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const p = await createProject({ name: form.name.trim(), area: form.area, description: form.description.trim() || null, color: null });
      setProjects(prev => [...prev, p]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editProject) return;
    setSaving(true);
    try {
      await updateProject(editProject.id, { name: editProject.name, area: editProject.area, description: editProject.description });
      setProjects(prev => prev.map(p => p.id === editProject.id ? editProject : p));
      setEditProject(null);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este proyecto? Las metas y tareas vinculadas no se eliminarán.')) return;
    await deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
  }

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 size={32} className="animate-spin text-dorado-400" /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-bordo-500/30 bg-plata-900/80 p-5 shadow-pm-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,26,46,0.18),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(184,146,42,0.10),transparent_40%)]" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-dorado-400/80">Plan Maestro</p>
            <h1 className="text-2xl font-bold text-white">Proyectos</h1>
            <p className="text-sm text-plata-400 mt-0.5">{projects.length} proyectos · {goals.length} metas · {tasks.filter(t => t.status !== 'hecho').length} tareas activas</p>
          </div>
          <button
            onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 px-4 py-2 bg-bordo-600 hover:bg-bordo-500 text-white rounded-xl font-medium text-sm transition-colors shadow-pm"
          >
            <Plus size={16} /> Nuevo proyecto
          </button>
        </div>
      </div>

      {/* Quick form */}
      {showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-dorado-500/30 bg-plata-900/90 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-dorado-300">Nuevo proyecto</h3>
            <button type="button" onClick={() => setShowForm(false)} className="p-1 text-plata-400 hover:text-white rounded">
              <X size={16} />
            </button>
          </div>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre del proyecto" className="pm-input" required autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value as Area }))} className="pm-input">
              {(Object.keys(AREA_CONFIG) as Area[]).map(a => <option key={a} value={a}>{AREA_CONFIG[a].label}</option>)}
            </select>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción breve" className="pm-input" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-plata-300 rounded-lg border border-plata-700 hover:bg-plata-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-bordo-600 hover:bg-bordo-500 text-white rounded-lg transition-colors disabled:opacity-60">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Crear
            </button>
          </div>
        </form>
      )}

      {/* Projects grid */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <FolderKanban size={36} className="text-plata-600" />
          <p className="text-plata-400 font-medium">No hay proyectos definidos.</p>
          <p className="text-plata-500 text-sm">Creá los grandes contenedores de tu trabajo (ej: CEO ModelTex, Moldey, Sistemas & IA).</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map(p => {
            const area = AREA_CONFIG[p.area];
            const projectGoals = goals.filter(g => g.project_id === p.id);
            const projectTasks = tasks.filter(t => t.project_id === p.id);
            const activeTasks = projectTasks.filter(t => t.status !== 'hecho').length;
            const doneTasks = projectTasks.filter(t => t.status === 'hecho').length;
            return (
              <div key={p.id} className="group rounded-2xl border border-plata-700/60 bg-plata-900/80 p-5 hover:border-dorado-500/30 hover:shadow-pm transition-all flex flex-col gap-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${area.bg} ${area.color} ${area.border}`}>
                        {area.label}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white">{p.name}</h3>
                    {p.description && <p className="text-xs text-plata-400 mt-0.5">{p.description}</p>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => setEditProject({ ...p })} className="p-1.5 text-plata-500 hover:text-dorado-300 rounded transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 text-plata-500 hover:text-red-400 rounded transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <Target size={13} className="text-dorado-400" />
                    <span className="text-xs text-plata-300">{projectGoals.length} metas</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckSquare size={13} className="text-bordo-400" />
                    <span className="text-xs text-plata-300">{activeTasks} activas · {doneTasks} hechas</span>
                  </div>
                </div>

                {/* Goals list */}
                {projectGoals.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-plata-500">Metas</p>
                    {projectGoals.slice(0, 3).map(g => {
                      const tf = TIMEFRAME_CONFIG[g.timeframe];
                      const progress = g.task_count && g.task_count > 0
                        ? Math.round((g.done_task_count! / g.task_count) * 100)
                        : g.progress_manual ?? 0;
                      return (
                        <div key={g.id} className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate">{g.title}</p>
                            <div className="h-1 bg-plata-800 rounded-full mt-1 overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-bordo-600 to-dorado-500 rounded-full" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                          <span className={`text-[9px] font-medium shrink-0 ${tf.color}`}>{tf.label.split(' ')[0]}</span>
                        </div>
                      );
                    })}
                    {projectGoals.length > 3 && (
                      <p className="text-[10px] text-plata-500">+{projectGoals.length - 3} más</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      {editProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleSaveEdit} className="w-full max-w-md rounded-2xl border border-plata-700/60 bg-plata-900 shadow-pm-lg p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Editar proyecto</h3>
              <button type="button" onClick={() => setEditProject(null)} className="p-1 text-plata-400 hover:text-white rounded-lg">
                <X size={18} />
              </button>
            </div>
            <input value={editProject.name} onChange={e => setEditProject(p => p ? { ...p, name: e.target.value } : p)} className="pm-input" required autoFocus />
            <div>
              <label className="text-xs text-plata-400 mb-1 block">Área</label>
              <select value={editProject.area} onChange={e => setEditProject(p => p ? { ...p, area: e.target.value as Area } : p)} className="pm-input">
                {(Object.keys(AREA_CONFIG) as Area[]).map(a => <option key={a} value={a}>{AREA_CONFIG[a].label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-plata-400 mb-1 block">Descripción</label>
              <input value={editProject.description ?? ''} onChange={e => setEditProject(p => p ? { ...p, description: e.target.value } : p)} className="pm-input" />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => setEditProject(null)} className="px-4 py-2 text-sm text-plata-300 rounded-lg border border-plata-700 hover:bg-plata-800 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-bordo-600 hover:bg-bordo-500 text-white rounded-lg transition-colors disabled:opacity-60">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
