import { useEffect, useMemo, useState } from 'react';
import {
  Sun, LayoutDashboard, CalendarDays, Calendar, Inbox as InboxIcon,
  FolderKanban, AlertTriangle, CheckCircle2, Loader2, Target,
  Star, ChevronLeft, ChevronRight, Plus, ArrowRight,
} from 'lucide-react';
import Hoy from './Hoy';
import Kanban from './Kanban';
import SemanaTab from './Semana';
import {
  type Task, type Project,
  AREA_CONFIG, PRIORITY_CONFIG, businessBadge,
  getTasks, getProjects, updateTask, createTask,
} from '../lib/planMaestro';

// ─── Types ────────────────────────────────────────────────────────────────────

type AgendaTab = 'hoy' | 'kanban' | 'semana' | 'calendario' | 'inbox' | 'por_proyecto' | 'atrasadas' | 'completadas';

interface AgendaProps {
  onCerrarDia: () => void;
  defaultTab?: AgendaTab;
}

const TABS: { key: AgendaTab; label: string; icon: React.ReactNode }[] = [
  { key: 'hoy',          label: 'Hoy',          icon: <Sun size={13} /> },
  { key: 'kanban',       label: 'Kanban',        icon: <LayoutDashboard size={13} /> },
  { key: 'semana',       label: 'Semana',        icon: <CalendarDays size={13} /> },
  { key: 'calendario',   label: 'Calendario',    icon: <Calendar size={13} /> },
  { key: 'inbox',        label: 'Inbox',         icon: <InboxIcon size={13} /> },
  { key: 'por_proyecto', label: 'Por proyecto',  icon: <FolderKanban size={13} /> },
  { key: 'atrasadas',    label: 'Atrasadas',     icon: <AlertTriangle size={13} /> },
  { key: 'completadas',  label: 'Completadas',   icon: <CheckCircle2 size={13} /> },
];

const TODAY_ISO = new Date().toISOString().split('T')[0];

// ─── Main component ───────────────────────────────────────────────────────────

export default function Agenda({ onCerrarDia, defaultTab = 'kanban' }: AgendaProps) {
  const [tab, setTab] = useState<AgendaTab>(defaultTab);

  return (
    <div className="flex flex-col gap-5">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-plata-700/50 pb-px">
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
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'hoy'          && <Hoy onCerrarDia={onCerrarDia} />}
      {tab === 'kanban'       && <Kanban />}
      {tab === 'semana'       && <SemanaTab />}
      {tab === 'calendario'   && <CalendarioTab />}
      {tab === 'inbox'        && <InboxTab />}
      {tab === 'por_proyecto' && <PorProyectoTab />}
      {tab === 'atrasadas'    && <AtrasadasTab />}
      {tab === 'completadas'  && <CompletadasTab />}
    </div>
  );
}

// ─── DATA HOOK ────────────────────────────────────────────────────────────────

function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getTasks()
      .then(t => setTasks(t))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);
  return { tasks, setTasks, loading };
}

function useTasksAndProjects() {
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  useEffect(() => {
    Promise.all([getTasks(), getProjects()])
      .then(([t, p]) => { setTasks(t); setProjects(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);
  return { tasks, setTasks, projects, loading };
}

// ─── TAB CALENDARIO ───────────────────────────────────────────────────────────

function CalendarioTab() {
  const { tasks, loading } = useTasks();
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(TODAY_ISO);

  const todayStr      = TODAY_ISO;
  const daysInMonth   = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = ((new Date(year, month, 1).getDay() + 6) % 7); // 0=Lun

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.due_date) continue;
      if (!map.has(t.due_date)) map.set(t.due_date, []);
      map.get(t.due_date)!.push(t);
    }
    return map;
  }, [tasks]);

  const selectedTasks = useMemo(() =>
    selected ? (tasksByDay.get(selected) ?? []) : [],
    [tasksByDay, selected]
  );

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }

  const monthLabel = new Date(year, month).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-dorado-500/20 bg-plata-900/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-dorado-400/80">AGENDA</p>
        <h2 className="text-xl font-bold text-white">Calendario</h2>
        <p className="text-sm text-plata-400 mt-0.5">Tareas por fecha</p>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between px-1">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-plata-800 transition-colors text-plata-300 hover:text-white">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-bold text-white capitalize">{monthLabel}</span>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-plata-800 transition-colors text-plata-300 hover:text-white">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-plata-700/50 bg-plata-900/60 p-3">
        <div className="grid grid-cols-7 mb-2">
          {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => (
            <div key={d} className="text-[10px] font-semibold text-plata-500 text-center py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }, (_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTasks = tasksByDay.get(dateStr) ?? [];
            const pending  = dayTasks.filter(t => t.status !== 'hecho').length;
            const done     = dayTasks.filter(t => t.status === 'hecho').length;
            const isToday  = dateStr === todayStr;
            const isSel    = dateStr === selected;
            const isPast   = dateStr < todayStr;

            return (
              <button
                key={day}
                onClick={() => setSelected(isSel ? null : dateStr)}
                className={`relative flex flex-col items-center rounded-lg py-2 px-1 text-sm transition-all min-h-[48px] ${
                  isSel    ? 'bg-dorado-500/30 border border-dorado-400/60 text-dorado-300 font-bold' :
                  isToday  ? 'bg-bordo-600/30 border border-bordo-400/40 text-white font-bold' :
                  isPast   ? 'text-plata-600 hover:bg-plata-800/40' :
                             'text-plata-300 hover:bg-plata-800/40'
                }`}
              >
                <span>{day}</span>
                {(pending > 0 || done > 0) && (
                  <div className="flex gap-0.5 mt-1">
                    {pending > 0 && (
                      <span className="text-[8px] font-bold px-1 rounded-full bg-bordo-600 text-white">{pending}</span>
                    )}
                    {done > 0 && (
                      <span className="text-[8px] font-bold px-1 rounded-full bg-emerald-700 text-white">{done}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selected && (
        <div className="rounded-xl border border-plata-700/60 bg-plata-900/70 p-4">
          <p className="text-sm font-semibold text-white mb-3 capitalize">
            {new Date(selected + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          {selectedTasks.length === 0 ? (
            <p className="text-xs text-plata-500">Sin tareas para este día.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedTasks.map(t => <MiniTaskRow key={t.id} task={t} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TAB INBOX ────────────────────────────────────────────────────────────────

function InboxTab() {
  const { tasks, setTasks, loading } = useTasks();
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const inboxTasks = useMemo(() =>
    tasks.filter(t => t.status === 'inbox'),
    [tasks]
  );

  async function moveToHoy(t: Task) {
    await updateTask(t.id, { status: 'hoy', due_date: TODAY_ISO });
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status: 'hoy' as const, due_date: TODAY_ISO } : x));
  }

  async function handleQuickCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const t = await createTask({
        title: newTitle.trim(),
        area: 'personal',
        priority: 'media',
        status: 'inbox',
        is_mit: false,
        due_date: null,
        position: 0,
        project_id: null,
        goal_id: null,
        notes: null,
        business_key: null,
        column_key: null,
      });
      setTasks(prev => [t, ...prev]);
      setNewTitle('');
      setShowForm(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-dorado-500/20 bg-plata-900/80 p-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-dorado-400/80">AGENDA</p>
          <h2 className="text-xl font-bold text-white">Inbox</h2>
          <p className="text-sm text-plata-400 mt-0.5">{inboxTasks.length} tareas sin organizar</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 px-4 py-2 bg-bordo-600 hover:bg-bordo-500 text-white rounded-xl font-medium text-sm transition-colors"
        >
          <Plus size={16} /> Capturar rápido
        </button>
      </div>

      {/* Quick capture */}
      {showForm && (
        <form onSubmit={handleQuickCreate} className="rounded-xl border border-dorado-500/30 bg-plata-900/90 p-3 flex gap-2">
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Capturá una idea o pendiente..."
            className="pm-input flex-1"
            required
          />
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1 px-3 py-2 text-sm font-semibold bg-bordo-600 hover:bg-bordo-500 text-white rounded-lg transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : 'Agregar'}
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 text-sm text-plata-400 hover:text-white rounded-lg border border-plata-700 hover:bg-plata-800 transition-colors">
            ×
          </button>
        </form>
      )}

      {inboxTasks.length === 0 ? (
        <Empty text="Inbox vacío." sub="Capturá ideas y pendientes acá para organizarlos después." />
      ) : (
        <div className="flex flex-col gap-2">
          {inboxTasks.map(t => {
            const area = AREA_CONFIG[t.area] ?? AREA_CONFIG['personal'];
            const pri  = PRIORITY_CONFIG[t.priority];
            return (
              <div key={t.id} className="flex items-center gap-3 rounded-xl border border-plata-700/50 bg-plata-900/60 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{t.title}</p>
                  <div className="flex gap-1.5 flex-wrap mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${area.bg} ${area.color} ${area.border}`}>{area.label}</span>
                    <span className={`text-[10px] font-medium ${pri.color}`}>● {pri.label}</span>
                  </div>
                </div>
                <button
                  onClick={() => moveToHoy(t)}
                  className="flex items-center gap-1 text-[10px] font-semibold text-dorado-400 hover:text-dorado-300 bg-dorado-900/20 hover:bg-dorado-900/40 border border-dorado-500/30 px-2 py-1 rounded-lg transition-colors shrink-0"
                  title="Mover a Hoy"
                >
                  <ArrowRight size={11} /> Hoy
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── TAB POR PROYECTO ─────────────────────────────────────────────────────────

function PorProyectoTab() {
  const { tasks, projects, loading } = useTasksAndProjects();

  const activeTasks = useMemo(() => tasks.filter(t => t.status !== 'hecho'), [tasks]);

  const withProject    = useMemo(() => activeTasks.filter(t => t.project_id), [activeTasks]);
  const withoutProject = useMemo(() => activeTasks.filter(t => !t.project_id), [activeTasks]);

  const projectsWithTasks = useMemo(() =>
    projects.filter(p => withProject.some(t => t.project_id === p.id)),
    [projects, withProject]
  );

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-dorado-500/20 bg-plata-900/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-dorado-400/80">AGENDA</p>
        <h2 className="text-xl font-bold text-white">Por proyecto</h2>
        <p className="text-sm text-plata-400 mt-0.5">Tareas agrupadas según su proyecto</p>
      </div>

      {activeTasks.length === 0 ? (
        <Empty text="No hay tareas activas." sub="Las tareas activas aparecerán agrupadas por proyecto." />
      ) : (
        <>
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
                  {ptasks.map(t => <MiniTaskRow key={t.id} task={t} />)}
                </div>
              </section>
            );
          })}

          {withoutProject.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Target size={13} className="text-plata-500 shrink-0" />
                <span className="text-sm font-bold text-plata-400">Sin proyecto</span>
                <span className="text-[10px] text-plata-500 bg-plata-800/60 px-1.5 py-0.5 rounded-full shrink-0">{withoutProject.length}</span>
                <div className="flex-1 h-px bg-plata-700/40" />
              </div>
              <div className="flex flex-col gap-1.5">
                {withoutProject.slice(0, 30).map(t => <MiniTaskRow key={t.id} task={t} />)}
                {withoutProject.length > 30 && (
                  <p className="text-xs text-plata-500 pl-2">+{withoutProject.length - 30} más</p>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ─── TAB ATRASADAS ────────────────────────────────────────────────────────────

function AtrasadasTab() {
  const { tasks, loading } = useTasks();

  const overdue = useMemo(() =>
    tasks
      .filter(t => t.due_date && t.due_date < TODAY_ISO && t.status !== 'hecho')
      .sort((a, b) => a.due_date!.localeCompare(b.due_date!)),
    [tasks]
  );

  if (loading) return <Loading />;
  if (overdue.length === 0) return (
    <div className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-2xl border border-dorado-500/20 bg-plata-900/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-dorado-400/80">AGENDA</p>
        <h2 className="text-xl font-bold text-white">Atrasadas</h2>
      </div>
      <Empty text="Sin tareas atrasadas." sub="¡Todo al día!" />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-red-900/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-400/80">AGENDA</p>
        <h2 className="text-xl font-bold text-white">Atrasadas</h2>
        <p className="text-sm text-red-400 mt-0.5">{overdue.length} {overdue.length === 1 ? 'tarea vencida' : 'tareas vencidas'}</p>
      </div>

      <div className="flex flex-col gap-2">
        {overdue.map(t => {
          const area    = AREA_CONFIG[t.area] ?? AREA_CONFIG['personal'];
          const pri     = PRIORITY_CONFIG[t.priority];
          const biz     = businessBadge(t.business_key);
          const days    = Math.floor((new Date(TODAY_ISO).getTime() - new Date(t.due_date! + 'T00:00:00').getTime()) / 86400000);
          return (
            <div key={t.id} className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-900/10 px-4 py-3">
              <AlertTriangle size={15} className="text-red-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{t.title}</p>
                <div className="flex gap-1.5 flex-wrap mt-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${area.bg} ${area.color} ${area.border}`}>{area.label}</span>
                  <span className={`text-[10px] font-medium ${pri.color}`}>● {pri.label}</span>
                  {biz && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border"
                      style={{ color: biz.color, borderColor: `${biz.color}66`, backgroundColor: `${biz.color}22` }}>
                      {biz.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-red-300 font-bold">{days}d</p>
                <p className="text-[10px] text-plata-500">venció {t.due_date}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── TAB COMPLETADAS ──────────────────────────────────────────────────────────

function CompletadasTab() {
  const { tasks, loading } = useTasks();

  const done = useMemo(() =>
    tasks
      .filter(t => t.status === 'hecho')
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 50),
    [tasks]
  );

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-900/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80">AGENDA</p>
        <h2 className="text-xl font-bold text-white">Completadas</h2>
        <p className="text-sm text-emerald-400 mt-0.5">{done.length} tareas completadas</p>
      </div>

      {done.length === 0 ? (
        <Empty text="Todavía no hay tareas completadas." sub="Cuando marques tareas como hechas aparecerán acá." />
      ) : (
        <div className="flex flex-col gap-2">
          {done.map(t => {
            const area = AREA_CONFIG[t.area] ?? AREA_CONFIG['personal'];
            const biz  = businessBadge(t.business_key);
            return (
              <div key={t.id} className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-900/10 px-4 py-3 opacity-80">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-plata-300 line-through truncate">{t.title}</p>
                  <div className="flex gap-1.5 flex-wrap mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${area.bg} ${area.color} ${area.border}`}>{area.label}</span>
                    {biz && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border"
                        style={{ color: biz.color, borderColor: `${biz.color}66`, backgroundColor: `${biz.color}22` }}>
                        {biz.name}
                      </span>
                    )}
                    {t.due_date && <span className="text-[10px] text-plata-500">{t.due_date}</span>}
                  </div>
                </div>
                {t.is_mit && <Star size={12} className="text-dorado-400 shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── SHARED ───────────────────────────────────────────────────────────────────

function MiniTaskRow({ task }: { task: Task }) {
  const area    = AREA_CONFIG[task.area] ?? AREA_CONFIG['personal'];
  const pri     = PRIORITY_CONFIG[task.priority];
  const biz     = businessBadge(task.business_key);
  const overdue = task.due_date && task.due_date < TODAY_ISO;
  const done    = task.status === 'hecho';

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
      done    ? 'border-plata-700/30 bg-plata-800/20 opacity-60' :
      overdue ? 'border-red-500/20 bg-red-900/10' :
                'border-plata-700/40 bg-plata-900/50'
    }`}>
      {task.is_mit && <Star size={11} className="text-dorado-400 shrink-0" />}
      <p className={`text-xs font-medium flex-1 truncate ${done ? 'line-through text-plata-500' : 'text-white'}`}>
        {task.title}
      </p>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`text-[9px] px-1 py-0.5 rounded font-medium border ${area.bg} ${area.color} ${area.border}`}>{area.label}</span>
        <span className={`text-[9px] font-medium ${pri.color}`}>● {pri.label}</span>
        {biz && (
          <span className="text-[9px] font-semibold px-1 py-0.5 rounded border"
            style={{ color: biz.color, borderColor: `${biz.color}66`, backgroundColor: `${biz.color}22` }}>
            {biz.name}
          </span>
        )}
        {overdue && <span className="text-[9px] text-red-400">⚠</span>}
      </div>
    </div>
  );
}

function Loading() {
  return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-dorado-400" /></div>;
}

function Empty({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <CalendarDays size={28} className="text-plata-600" />
      <p className="text-plata-300 font-medium">{text}</p>
      <p className="text-plata-500 text-sm max-w-sm">{sub}</p>
    </div>
  );
}
