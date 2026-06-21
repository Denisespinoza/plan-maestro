import { useEffect, useMemo, useState } from 'react';
import {
  Target, FolderKanban, TrendingUp, AlertTriangle, CheckCircle2,
  Loader2, Calendar, ListChecks, Pause, AlertCircle,
} from 'lucide-react';
import {
  type Goal, type Project, type Task,
  AREA_CONFIG, PRIORITY_CONFIG, PROJECT_STATUS_CONFIG,
  getGoalsWithProgress, getProjects, getTasks,
} from '../lib/planMaestro';
import Metas from './Metas';
import Proyectos from './Proyectos';

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'proyectos' | 'metas' | 'tareas' | 'avance' | 'atrasados' | 'finalizados' | 'en_pausa';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'proyectos',   label: 'Proyectos',   icon: <FolderKanban size={13} /> },
  { key: 'metas',       label: 'Metas',       icon: <Target size={13} /> },
  { key: 'tareas',      label: 'Tareas',      icon: <ListChecks size={13} /> },
  { key: 'avance',      label: 'Avance',      icon: <TrendingUp size={13} /> },
  { key: 'atrasados',   label: 'Atrasados',   icon: <AlertTriangle size={13} /> },
  { key: 'finalizados', label: 'Finalizados', icon: <CheckCircle2 size={13} /> },
  { key: 'en_pausa',    label: 'En pausa',    icon: <Pause size={13} /> },
];

const TODAY = new Date().toISOString().split('T')[0];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function goalProgress(g: Goal): number {
  if (g.task_count && g.task_count > 0) return Math.round((g.done_task_count! / g.task_count) * 100);
  return g.progress_manual ?? 0;
}

function daysOverdue(date: string): number {
  const d = new Date(date + 'T00:00:00');
  const t = new Date(TODAY + 'T00:00:00');
  return Math.floor((t.getTime() - d.getTime()) / 86400000);
}

function safeProjectStatus(p: Project) { return p.status ?? 'activo'; }

function isProjectOverdue(p: Project): boolean {
  if (!p.target_date) return false;
  if (['finalizado', 'cancelado'].includes(safeProjectStatus(p))) return false;
  return p.target_date < TODAY;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Objetivos() {
  const [tab, setTab] = useState<Tab>('proyectos');

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-dorado-500/30 bg-plata-900/80 p-5 shadow-pm-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(184,146,42,0.15),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(139,26,46,0.10),transparent_40%)]" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-widest text-dorado-400/80">CEO DENIS</p>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target size={22} className="text-dorado-400" /> Objetivos
          </h1>
          <p className="text-sm text-plata-400 mt-0.5">Proyectos → Metas → Tareas → Avance</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-plata-700/50 pb-px">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-t-lg transition-colors -mb-px border-b-2 ${
              tab === t.key
                ? 'text-dorado-300 border-dorado-400'
                : 'text-plata-400 border-transparent hover:text-white'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'proyectos'   && <Proyectos />}
      {tab === 'metas'       && <Metas />}
      {tab === 'tareas'      && <TareasTab />}
      {tab === 'avance'      && <AvanceTab />}
      {tab === 'atrasados'   && <AtrasadosTab />}
      {tab === 'finalizados' && <FinalizadosTab />}
      {tab === 'en_pausa'    && <EnPausaTab />}
    </div>
  );
}

// ─── DATA HOOK ────────────────────────────────────────────────────────────────

function useObjetivosData() {
  const [goals, setGoals]       = useState<Goal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [g, p, t] = await Promise.all([getGoalsWithProgress(), getProjects(), getTasks()]);
        setGoals(g); setProjects(p); setTasks(t);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  return { goals, projects, tasks, loading };
}

// ─── TAB TAREAS ───────────────────────────────────────────────────────────────

function TareasTab() {
  const { tasks, projects, loading } = useObjetivosData();

  const activeTasks = useMemo(() =>
    tasks
      .filter(t => t.status !== 'hecho')
      .sort((a, b) => {
        if (a.is_mit !== b.is_mit) return a.is_mit ? -1 : 1;
        const priOrder = { alta: 0, media: 1, baja: 2 };
        return priOrder[a.priority] - priOrder[b.priority];
      }),
    [tasks]
  );

  if (loading) return <Loading />;
  if (activeTasks.length === 0) return <Empty text="No hay tareas activas." sub="Las tareas de tus proyectos aparecerán acá." />;

  // Group by project
  const withProject    = activeTasks.filter(t => t.project_id);
  const withoutProject = activeTasks.filter(t => !t.project_id);
  const projectsWithTasks = projects.filter(p => withProject.some(t => t.project_id === p.id));

  return (
    <div className="flex flex-col gap-5">
      {projectsWithTasks.map(p => {
        const ptasks = withProject.filter(t => t.project_id === p.id);
        const area   = AREA_CONFIG[p.area] ?? AREA_CONFIG['personal'];
        return (
          <section key={p.id}>
            <div className="flex items-center gap-2 mb-2">
              <FolderKanban size={13} className="text-dorado-400 shrink-0" />
              <span className="text-sm font-bold text-white">{p.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${area.bg} ${area.color} ${area.border}`}>{area.label}</span>
              <span className="text-[10px] text-plata-500 bg-plata-800/60 px-1.5 py-0.5 rounded-full shrink-0">{ptasks.length}</span>
              <div className="flex-1 h-px bg-plata-700/40" />
            </div>
            <div className="flex flex-col gap-1.5">
              {ptasks.map(t => <TaskRow key={t.id} task={t} />)}
            </div>
          </section>
        );
      })}

      {withoutProject.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={13} className="text-amber-400 shrink-0" />
            <span className="text-sm font-bold text-amber-300">Sin proyecto</span>
            <span className="text-[10px] text-plata-500 bg-plata-800/60 px-1.5 py-0.5 rounded-full shrink-0">{withoutProject.length}</span>
            <div className="flex-1 h-px bg-plata-700/40" />
          </div>
          <div className="flex flex-col gap-1.5">
            {withoutProject.slice(0, 20).map(t => <TaskRow key={t.id} task={t} />)}
            {withoutProject.length > 20 && (
              <p className="text-xs text-plata-500 pl-2">+{withoutProject.length - 20} más sin proyecto</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const area    = AREA_CONFIG[task.area] ?? AREA_CONFIG['personal'];
  const pri     = PRIORITY_CONFIG[task.priority];
  const overdue = task.due_date && task.due_date < TODAY;
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${
      overdue ? 'border-red-500/20 bg-red-900/10' : 'border-plata-700/50 bg-plata-900/60'
    }`}>
      {task.is_mit && (
        <span className="text-[9px] font-bold text-dorado-300 bg-dorado-900/40 border border-dorado-500/30 px-1.5 py-0.5 rounded shrink-0">MIT</span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{task.title}</p>
        <div className="flex gap-1.5 flex-wrap mt-0.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${area.bg} ${area.color} ${area.border}`}>{area.label}</span>
          <span className={`text-[10px] font-medium ${pri.color}`}>● {pri.label}</span>
          {task.due_date && (
            <span className={`text-[10px] ${overdue ? 'text-red-400' : 'text-plata-500'}`}>
              {overdue ? '⚠' : '📅'} {task.due_date}
            </span>
          )}
        </div>
      </div>
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
        task.status === 'hoy'      ? 'bg-dorado-900/40 text-dorado-300' :
        task.status === 'en_curso' ? 'bg-bordo-900/40 text-bordo-300' :
        task.status === 'esperando'? 'bg-amber-900/30 text-amber-300' :
                                     'bg-plata-700/40 text-plata-300'
      }`}>
        {task.status === 'hoy' ? 'Hoy' : task.status === 'en_curso' ? 'En curso' : task.status === 'esperando' ? 'Esperando' : 'Inbox'}
      </span>
    </div>
  );
}

// ─── TAB AVANCE ───────────────────────────────────────────────────────────────

function AvanceTab() {
  const { goals, projects, tasks, loading } = useObjetivosData();

  if (loading) return <Loading />;
  if (projects.length === 0) return <Empty text="No hay proyectos todavía." sub="Creá un proyecto para ver el avance acá." />;

  const totalPending = tasks.filter(t => t.status !== 'hecho').length;
  const projAvg = projects.length > 0
    ? Math.round(projects.reduce((s, p) => s + (p.progress ?? 0), 0) / projects.length)
    : 0;

  const upcoming: Array<{ name: string; date: string; type: string }> = [
    ...projects
      .filter(p => p.target_date && p.target_date >= TODAY && !['finalizado','cancelado'].includes(safeProjectStatus(p)))
      .map(p => ({ name: p.name, date: p.target_date!, type: 'Proyecto' })),
    ...goals
      .filter(g => g.deadline && g.deadline >= TODAY && goalProgress(g) < 100)
      .map(g => ({ name: g.title, date: g.deadline!, type: 'Meta' })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      {/* Resumen rápido */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metric icon={<FolderKanban size={15} className="text-dorado-400" />} label="Proyectos" value={projects.length} />
        <Metric icon={<Target size={15} className="text-bordo-400" />} label="Metas" value={goals.length} />
        <Metric icon={<ListChecks size={15} className="text-plata-400" />} label="Tareas activas" value={totalPending} />
        <Metric icon={<TrendingUp size={15} className="text-dorado-400" />} label="Avance promedio" value={`${projAvg}%`} />
      </div>

      {/* Tarjeta por proyecto */}
      <div className="flex flex-col gap-3">
        {projects.map(p => {
          const area         = AREA_CONFIG[p.area] ?? AREA_CONFIG['personal'];
          const statusCfg    = PROJECT_STATUS_CONFIG[safeProjectStatus(p)];
          const projGoals    = goals.filter(g => g.project_id === p.id);
          const completedGoals = projGoals.filter(g => goalProgress(g) >= 100);
          const projTasks    = tasks.filter(t => t.project_id === p.id);
          const doneTasks    = projTasks.filter(t => t.status === 'hecho');
          const overdue      = isProjectOverdue(p);

          // Progreso efectivo: manual si existe, sino promedio de metas
          const progress = (p.progress ?? 0) > 0
            ? (p.progress ?? 0)
            : projGoals.length > 0
              ? Math.round(projGoals.reduce((s, g) => s + goalProgress(g), 0) / projGoals.length)
              : 0;

          return (
            <div key={p.id} className={`rounded-2xl border bg-plata-900/80 p-4 flex flex-col gap-3 ${
              overdue ? 'border-red-500/20' : 'border-plata-700/50'
            }`}>
              {/* Header del proyecto */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${area.bg} ${area.color} ${area.border}`}>{area.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>{statusCfg.label}</span>
                    <span className={`text-[10px] font-medium ${PRIORITY_CONFIG[p.priority ?? 'media'].color}`}>
                      ● {PRIORITY_CONFIG[p.priority ?? 'media'].label}
                    </span>
                    {overdue && (
                      <span className="text-[10px] text-red-400 font-medium">⚠ Atrasado {daysOverdue(p.target_date!)}d</span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white">{p.name}</h3>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-dorado-300">{progress}%</p>
                  {p.target_date && <p className="text-[10px] text-plata-500">Obj: {p.target_date}</p>}
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="h-2 bg-plata-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-bordo-600 to-dorado-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Stats metas + tareas */}
              <div className="flex gap-4 text-xs text-plata-400 flex-wrap">
                <span>
                  <span className="text-white font-medium">{completedGoals.length}/{projGoals.length}</span> metas
                </span>
                {projTasks.length > 0 && (
                  <span>
                    <span className="text-white font-medium">{doneTasks.length}/{projTasks.length}</span> tareas
                  </span>
                )}
                {p.next_step && (
                  <span className="text-dorado-300 truncate max-w-xs">→ {p.next_step}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Próximos vencimientos */}
      {upcoming.length > 0 && (
        <div className="rounded-xl border border-plata-700/60 bg-plata-900/70 p-4">
          <p className="text-sm font-semibold text-plata-200 mb-3 flex items-center gap-2">
            <Calendar size={14} className="text-dorado-400" /> Próximas fechas
          </p>
          <div className="flex flex-col gap-2">
            {upcoming.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-plata-800/60 text-plata-400 shrink-0">{item.type}</span>
                  <span className="text-white truncate">{item.name}</span>
                </div>
                <span className="text-xs text-dorado-300 shrink-0">{item.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TAB ATRASADOS ────────────────────────────────────────────────────────────

function AtrasadosTab() {
  const { goals, projects, tasks, loading } = useObjetivosData();

  type OverdueItem = { id: string; type: 'Proyecto' | 'Meta' | 'Tarea'; name: string; date: string; dias: number; priority: string };

  const { byProject, orphans } = useMemo(() => {
    // Proyectos atrasados (siempre van al nivel raíz)
    const overdueProjects = projects.filter(isProjectOverdue).map(p => ({
      project: p,
      items: [] as OverdueItem[],
    }));

    // Metas atrasadas
    const overdueGoals = goals.filter(g => g.deadline && g.deadline < TODAY && goalProgress(g) < 100);

    // Tareas atrasadas
    const overdueTasks = tasks.filter(t => t.due_date && t.due_date < TODAY && t.status !== 'hecho');

    // Agrupar por proyecto
    const map = new Map<string, { project: Project; items: OverdueItem[] }>();

    // Primero inicializar con proyectos atrasados
    for (const p of projects.filter(isProjectOverdue)) {
      map.set(p.id, { project: p, items: [] });
    }

    // Metas con proyecto
    for (const g of overdueGoals) {
      if (g.project_id) {
        if (!map.has(g.project_id)) {
          const proj = projects.find(p => p.id === g.project_id);
          if (proj) map.set(g.project_id, { project: proj, items: [] });
        }
        map.get(g.project_id)?.items.push({
          id: g.id, type: 'Meta', name: g.title,
          date: g.deadline!, dias: daysOverdue(g.deadline!), priority: '',
        });
      }
    }

    // Tareas con proyecto
    for (const t of overdueTasks) {
      if (t.project_id) {
        if (!map.has(t.project_id)) {
          const proj = projects.find(p => p.id === t.project_id);
          if (proj) map.set(t.project_id, { project: proj, items: [] });
        }
        map.get(t.project_id)?.items.push({
          id: t.id, type: 'Tarea', name: t.title,
          date: t.due_date!, dias: daysOverdue(t.due_date!), priority: t.priority,
        });
      }
    }

    // Huérfanos (sin proyecto)
    const orphanGoals: OverdueItem[] = overdueGoals.filter(g => !g.project_id).map(g => ({
      id: g.id, type: 'Meta' as const, name: g.title,
      date: g.deadline!, dias: daysOverdue(g.deadline!), priority: '',
    }));
    const orphanTasks: OverdueItem[] = overdueTasks.filter(t => !t.project_id).map(t => ({
      id: t.id, type: 'Tarea' as const, name: t.title,
      date: t.due_date!, dias: daysOverdue(t.due_date!), priority: t.priority,
    }));

    return {
      byProject: Array.from(map.values()),
      orphans: [...orphanGoals, ...orphanTasks].sort((a, b) => b.dias - a.dias),
    };
  }, [goals, projects, tasks]);

  if (loading) return <Loading />;
  if (byProject.length === 0 && orphans.length === 0) {
    return <Empty text="No hay ítems atrasados." sub="¡Todo al día!" />;
  }

  return (
    <div className="flex flex-col gap-5">
      {byProject.map(({ project, items }) => {
        const area      = AREA_CONFIG[project.area] ?? AREA_CONFIG['personal'];
        const overdue   = isProjectOverdue(project);
        return (
          <section key={project.id}>
            {/* Proyecto header */}
            <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 mb-2 ${
              overdue ? 'border-red-500/30 bg-red-900/10' : 'border-plata-700/50 bg-plata-900/60'
            }`}>
              <FolderKanban size={15} className={overdue ? 'text-red-400' : 'text-dorado-400'} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{project.name}</p>
                <div className="flex gap-2 mt-0.5 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${area.bg} ${area.color} ${area.border}`}>{area.label}</span>
                  {overdue && (
                    <span className="text-[10px] text-red-400">⚠ Proyecto atrasado {daysOverdue(project.target_date!)}d · venció {project.target_date}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Items del proyecto */}
            {items.length > 0 && (
              <div className="flex flex-col gap-1.5 pl-4">
                {items.map(item => (
                  <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-900/10 px-3 py-2">
                    <AlertTriangle size={13} className="text-red-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{item.name}</p>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-[10px] bg-plata-800/60 text-plata-300 px-1.5 py-0.5 rounded-full">{item.type}</span>
                        {item.priority && (
                          <span className={`text-[10px] font-medium ${PRIORITY_CONFIG[item.priority as 'alta'|'media'|'baja']?.color ?? 'text-plata-400'}`}>
                            ● {PRIORITY_CONFIG[item.priority as 'alta'|'media'|'baja']?.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-red-300 font-bold">{item.dias}d</p>
                      <p className="text-[10px] text-plata-500">venció {item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {/* Huérfanos */}
      {orphans.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={13} className="text-amber-400" />
            <span className="text-sm font-bold text-amber-300">Sin proyecto</span>
            <span className="text-[10px] text-plata-500 bg-plata-800/60 px-1.5 py-0.5 rounded-full">{orphans.length}</span>
            <div className="flex-1 h-px bg-plata-700/40" />
          </div>
          <div className="flex flex-col gap-1.5">
            {orphans.map(item => (
              <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-900/10 px-4 py-2.5">
                <AlertTriangle size={13} className="text-red-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{item.name}</p>
                  <span className="text-[10px] bg-plata-800/60 text-plata-300 px-1.5 py-0.5 rounded-full">{item.type}</span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-red-300 font-bold">{item.dias}d</p>
                  <p className="text-[10px] text-plata-500">venció {item.date}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── TAB FINALIZADOS ──────────────────────────────────────────────────────────

function FinalizadosTab() {
  const { goals, projects, tasks, loading } = useObjetivosData();

  const { byProject, orphans } = useMemo(() => {
    const doneGoals    = goals.filter(g => goalProgress(g) >= 100);
    const doneTasks    = tasks.filter(t => t.status === 'hecho').slice(0, 50);
    const doneProjects = projects.filter(p => safeProjectStatus(p) === 'finalizado');

    type DoneItem = { id: string; type: 'Meta' | 'Tarea'; name: string; date: string | null };

    const map = new Map<string, { project: Project; items: DoneItem[]; isProjectDone: boolean }>();

    for (const p of doneProjects) {
      map.set(p.id, { project: p, items: [], isProjectDone: true });
    }

    for (const g of doneGoals) {
      if (g.project_id) {
        if (!map.has(g.project_id)) {
          const proj = projects.find(p => p.id === g.project_id);
          if (proj) map.set(g.project_id, { project: proj, items: [], isProjectDone: false });
        }
        map.get(g.project_id)?.items.push({ id: g.id, type: 'Meta', name: g.title, date: g.deadline });
      }
    }

    for (const t of doneTasks) {
      if (t.project_id) {
        if (!map.has(t.project_id)) {
          const proj = projects.find(p => p.id === t.project_id);
          if (proj) map.set(t.project_id, { project: proj, items: [], isProjectDone: false });
        }
        map.get(t.project_id)?.items.push({ id: t.id, type: 'Tarea', name: t.title, date: t.due_date });
      }
    }

    const orphanItems: DoneItem[] = [
      ...doneGoals.filter(g => !g.project_id).map(g => ({ id: g.id, type: 'Meta' as const, name: g.title, date: g.deadline })),
      ...doneTasks.filter(t => !t.project_id).map(t => ({ id: t.id, type: 'Tarea' as const, name: t.title, date: t.due_date })),
    ];

    return { byProject: Array.from(map.values()), orphans: orphanItems };
  }, [goals, projects, tasks]);

  if (loading) return <Loading />;
  if (byProject.length === 0 && orphans.length === 0) {
    return <Empty text="Todavía no hay ítems finalizados." sub="Los proyectos, metas y tareas completadas aparecerán acá." />;
  }

  return (
    <div className="flex flex-col gap-5">
      {byProject.map(({ project, items, isProjectDone }) => {
        const area = AREA_CONFIG[project.area] ?? AREA_CONFIG['personal'];
        return (
          <section key={project.id}>
            <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 mb-2 ${
              isProjectDone ? 'border-emerald-500/30 bg-emerald-900/10' : 'border-plata-700/50 bg-plata-900/60'
            }`}>
              {isProjectDone
                ? <CheckCircle2 size={15} className="text-emerald-400" />
                : <FolderKanban size={15} className="text-dorado-400" />
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{project.name}</p>
                <div className="flex gap-2 mt-0.5 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${area.bg} ${area.color} ${area.border}`}>{area.label}</span>
                  {isProjectDone && <span className="text-[10px] text-emerald-300">Proyecto finalizado</span>}
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-300 shrink-0">{project.progress ?? 0}%</span>
            </div>
            {items.length > 0 && (
              <div className="flex flex-col gap-1.5 pl-4">
                {items.map(item => (
                  <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-900/10 px-3 py-2">
                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{item.name}</p>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-[10px] bg-plata-800/60 text-plata-300 px-1.5 py-0.5 rounded-full">{item.type}</span>
                        {item.date && <span className="text-[10px] text-plata-500">{item.date}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-emerald-300 font-bold shrink-0">✓</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {orphans.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={13} className="text-amber-400" />
            <span className="text-sm font-bold text-amber-300">Sin proyecto</span>
            <span className="text-[10px] text-plata-500 bg-plata-800/60 px-1.5 py-0.5 rounded-full">{orphans.length}</span>
            <div className="flex-1 h-px bg-plata-700/40" />
          </div>
          <div className="flex flex-col gap-1.5">
            {orphans.map(item => (
              <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-900/10 px-4 py-2.5">
                <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{item.name}</p>
                  <span className="text-[10px] bg-plata-800/60 text-plata-300 px-1.5 py-0.5 rounded-full">{item.type}</span>
                </div>
                <span className="text-xs text-emerald-300 font-bold shrink-0">✓</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── TAB EN PAUSA ─────────────────────────────────────────────────────────────

function EnPausaTab() {
  const { projects, goals, loading } = useObjetivosData();
  const pausedProjects = useMemo(() => projects.filter(p => safeProjectStatus(p) === 'en_pausa'), [projects]);

  if (loading) return <Loading />;
  if (pausedProjects.length === 0) return <Empty text="No hay proyectos en pausa." sub="Los proyectos pausados aparecerán acá." />;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-plata-500">
        Para reactivar un proyecto, entrá a <span className="text-dorado-400">Proyectos</span> y usá "Reactivar".
      </p>
      {pausedProjects.map(p => {
        const area      = AREA_CONFIG[p.area] ?? AREA_CONFIG['personal'];
        const pri       = PRIORITY_CONFIG[p.priority ?? 'media'];
        const projGoals = goals.filter(g => g.project_id === p.id);
        return (
          <div key={p.id} className="rounded-2xl border border-amber-500/20 bg-amber-900/10 p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <Pause size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{p.name}</p>
                <div className="flex gap-2 flex-wrap mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${area.bg} ${area.color} ${area.border}`}>{area.label}</span>
                  <span className={`text-[10px] font-medium ${pri.color}`}>● {pri.label}</span>
                  {projGoals.length > 0 && (
                    <span className="text-[10px] text-plata-400">{projGoals.length} metas</span>
                  )}
                  {p.notes && <span className="text-[10px] text-plata-500 truncate max-w-[200px]">{p.notes}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-dorado-300">{p.progress ?? 0}%</p>
                {p.target_date && <p className="text-[10px] text-plata-500">Obj: {p.target_date}</p>}
              </div>
            </div>
            {projGoals.length > 0 && (
              <div className="pl-7 flex flex-col gap-1">
                {projGoals.slice(0, 3).map(g => (
                  <p key={g.id} className="text-xs text-plata-400 truncate">· {g.title}</p>
                ))}
                {projGoals.length > 3 && <p className="text-xs text-plata-500">+{projGoals.length - 3} metas más</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── SHARED ───────────────────────────────────────────────────────────────────

function Metric({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-xl border border-plata-700/50 bg-plata-900/60 p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-plata-400">{icon}<span className="text-[10px] uppercase tracking-wider">{label}</span></div>
      <p className={`text-xl font-bold ${color ?? 'text-white'}`}>{value}</p>
    </div>
  );
}

function Loading() {
  return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-dorado-400" /></div>;
}

function Empty({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <Target size={28} className="text-plata-600" />
      <p className="text-plata-300 font-medium">{text}</p>
      <p className="text-plata-500 text-sm max-w-sm">{sub}</p>
    </div>
  );
}
