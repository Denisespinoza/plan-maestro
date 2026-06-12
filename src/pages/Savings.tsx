import { useEffect, useState, useMemo, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import {
  PiggyBank,
  Plus,
  Target,
  CalendarClock,
  TrendingUp,
  CheckCircle2,
  ChevronRight,
  X,
  AlertCircle,
  Clock,
  Pause,
  Bell,
  Edit3,
  Trash2,
  Play,
  PartyPopper,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type GoalCategory = 'corto' | 'mediano' | 'largo';
type GoalStatus = 'active' | 'completed' | 'paused';

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  category: GoalCategory;
  status: GoalStatus;
  color: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface SavingsContribution {
  id: string;
  goal_id: string;
  amount: number;
  contribution_date: string;
  source: 'manual' | 'weekly';
  notes: string;
  finance_movement_id: string | null;
  created_at: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<GoalCategory, { label: string; color: string; bg: string; border: string }> = {
  corto:   { label: 'Corto plazo',   color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40' },
  mediano: { label: 'Mediano plazo', color: 'text-amber-400',   bg: 'bg-amber-500/20',   border: 'border-amber-500/40'   },
  largo:   { label: 'Largo plazo',   color: 'text-violet-400',  bg: 'bg-violet-500/20',  border: 'border-violet-500/40'  },
};

const GOAL_COLORS = [
  '#8B5CF6', '#10B981', '#F59E0B', '#3B82F6',
  '#EF4444', '#EC4899', '#14B8A6', '#F97316',
];

const EMPTY_GOAL_FORM = {
  name: '',
  target_amount: '',
  deadline: '',
  category: 'corto' as GoalCategory,
  color: '#8B5CF6',
  notes: '',
};

type GoalForm = typeof EMPTY_GOAL_FORM;

// ─── Utilidades ───────────────────────────────────────────────────────────────

const currency = (v: number) =>
  v.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

const getCurrentWeekKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
};

const REMINDER_DISMISSED_KEY = 'savings_reminder_dismissed_week';

const getWeeksUntil = (deadline: string): number => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(deadline + 'T00:00:00');
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (7 * 24 * 60 * 60 * 1000)));
};

const getWeeklySuggestion = (goal: SavingsGoal): number => {
  const weeks = getWeeksUntil(goal.deadline);
  if (weeks === 0) return 0;
  return Math.ceil(Math.max(0, goal.target_amount - goal.current_amount) / weeks);
};

const getProgress = (goal: SavingsGoal): number => {
  if (goal.target_amount <= 0) return 0;
  return Math.min(100, (goal.current_amount / goal.target_amount) * 100);
};

const formatDate = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const goalFormFromGoal = (g: SavingsGoal): GoalForm => ({
  name: g.name,
  target_amount: String(g.target_amount),
  deadline: g.deadline,
  category: g.category,
  color: g.color,
  notes: g.notes || '',
});

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Savings() {
  const [goals, setGoals]             = useState<SavingsGoal[]>([]);
  const [contributions, setContribs]  = useState<SavingsContribution[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [saving, setSaving]           = useState(false);

  // Vista detalle
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  // Formulario objetivo (crear / editar)
  const [goalFormMode, setGoalFormMode] = useState<'create' | 'edit' | null>(null);
  const [goalForm, setGoalForm]         = useState<GoalForm>(EMPTY_GOAL_FORM);

  // Aporte manual
  const [showContribForm, setShowContribForm] = useState(false);
  const [contribForm, setContribForm]         = useState({ amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
  const [contribSaving, setContribSaving]     = useState(false);

  // Modal objetivo completado
  const [completedGoal, setCompletedGoal] = useState<SavingsGoal | null>(null);

  // Filtros
  const [filterCategory, setFilterCategory] = useState<'all' | GoalCategory>('all');
  const [filterStatus,   setFilterStatus]   = useState<'all' | GoalStatus>('all');

  // Recordatorio
  const [reminderGoals, setReminderGoals] = useState<SavingsGoal[]>([]);
  const [showReminder,  setShowReminder]  = useState(false);

  useEffect(() => { loadData(); }, []);

  // ── Carga ───────────────────────────────────────────────────────────────────

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [gr, cr] = await Promise.all([
        supabase.from('savings_goals').select('*').order('created_at', { ascending: false }),
        supabase.from('savings_contributions').select('*').order('contribution_date', { ascending: false }),
      ]);
      if (gr.error) throw gr.error;
      if (cr.error) throw cr.error;
      const loadedGoals: SavingsGoal[]         = gr.data || [];
      const loadedContribs: SavingsContribution[] = cr.data || [];
      setGoals(loadedGoals);
      setContribs(loadedContribs);
      evaluateReminder(loadedGoals, loadedContribs);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar Ahorros. Verificá que la migración esté aplicada en Supabase.');
    } finally {
      setLoading(false);
    }
  };

  // ── Recordatorio ────────────────────────────────────────────────────────────

  const evaluateReminder = (gs: SavingsGoal[], cs: SavingsContribution[]) => {
    const thisWeek = getCurrentWeekKey();
    if (localStorage.getItem(REMINDER_DISMISSED_KEY) === thisWeek) return;
    const now = new Date();
    const dow = now.getDay() === 0 ? 7 : now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - dow + 1);
    monday.setHours(0, 0, 0, 0);
    const weekStart = monday.toISOString().split('T')[0];
    const pending = gs.filter(g => {
      if (g.status !== 'active') return false;
      return !cs.some(c => c.goal_id === g.id && c.contribution_date >= weekStart);
    });
    if (pending.length > 0) { setReminderGoals(pending); setShowReminder(true); }
  };

  const dismissReminder = () => {
    localStorage.setItem(REMINDER_DISMISSED_KEY, getCurrentWeekKey());
    setShowReminder(false);
  };

  // ── Crear objetivo ──────────────────────────────────────────────────────────

  const handleCreateGoal = async (e: FormEvent) => {
    e.preventDefault();
    const target = Number(goalForm.target_amount);
    if (!goalForm.name.trim()) { setError('Ingresá un nombre.'); return; }
    if (!target || target <= 0) { setError('El monto debe ser mayor a cero.'); return; }
    if (!goalForm.deadline) { setError('Seleccioná una fecha límite.'); return; }
    setSaving(true); setError('');
    try {
      const { error: e } = await supabase.from('savings_goals').insert({
        name: goalForm.name.trim(), target_amount: target, current_amount: 0,
        deadline: goalForm.deadline, category: goalForm.category,
        color: goalForm.color, notes: goalForm.notes.trim(), status: 'active',
      });
      if (e) throw e;
      setGoalFormMode(null); setGoalForm(EMPTY_GOAL_FORM);
      await loadData();
    } catch (err) { console.error(err); setError('No se pudo crear el objetivo.'); }
    finally { setSaving(false); }
  };

  // ── Editar objetivo ─────────────────────────────────────────────────────────

  const openEditForm = (goal: SavingsGoal) => {
    setGoalForm(goalFormFromGoal(goal));
    setGoalFormMode('edit');
    setError('');
  };

  const handleEditGoal = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedGoalId) return;
    const target = Number(goalForm.target_amount);
    if (!goalForm.name.trim()) { setError('Ingresá un nombre.'); return; }
    if (!target || target <= 0) { setError('El monto debe ser mayor a cero.'); return; }
    if (!goalForm.deadline) { setError('Seleccioná una fecha límite.'); return; }
    setSaving(true); setError('');
    try {
      const { error: e } = await supabase.from('savings_goals').update({
        name: goalForm.name.trim(), target_amount: target,
        deadline: goalForm.deadline, category: goalForm.category,
        color: goalForm.color, notes: goalForm.notes.trim(),
      }).eq('id', selectedGoalId);
      if (e) throw e;
      setGoalFormMode(null); setGoalForm(EMPTY_GOAL_FORM);
      await loadData();
    } catch (err) { console.error(err); setError('No se pudo guardar los cambios.'); }
    finally { setSaving(false); }
  };

  // ── Pausar / Reactivar ──────────────────────────────────────────────────────

  const togglePause = async (goal: SavingsGoal) => {
    const newStatus: GoalStatus = goal.status === 'paused' ? 'active' : 'paused';
    try {
      const { error: e } = await supabase.from('savings_goals').update({ status: newStatus }).eq('id', goal.id);
      if (e) throw e;
      await loadData();
    } catch (err) { console.error(err); setError('No se pudo cambiar el estado.'); }
  };

  // ── Eliminar objetivo ───────────────────────────────────────────────────────

  const deleteGoal = async (goal: SavingsGoal) => {
    if (!window.confirm(`¿Eliminar el objetivo "${goal.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      const { error: e } = await supabase.from('savings_goals').delete().eq('id', goal.id);
      if (e) throw e;
      setSelectedGoalId(null);
      await loadData();
    } catch (err) { console.error(err); setError('No se pudo eliminar el objetivo.'); }
  };

  // ── Eliminar aporte ─────────────────────────────────────────────────────────

  const deleteContrib = async (contrib: SavingsContribution) => {
    if (!window.confirm('¿Eliminar este aporte? El monto se restará del objetivo.')) return;
    const goal = goals.find(g => g.id === contrib.goal_id);
    if (!goal) return;
    try {
      const { error: e1 } = await supabase.from('savings_contributions').delete().eq('id', contrib.id);
      if (e1) throw e1;
      const newAmount = Math.max(0, goal.current_amount - contrib.amount);
      const newStatus: GoalStatus = newAmount < goal.target_amount && goal.status === 'completed' ? 'active' : goal.status;
      const { error: e2 } = await supabase.from('savings_goals').update({ current_amount: newAmount, status: newStatus }).eq('id', goal.id);
      if (e2) throw e2;
      await loadData();
    } catch (err) { console.error(err); setError('No se pudo eliminar el aporte.'); }
  };

  // ── Agregar aporte ──────────────────────────────────────────────────────────

  const addContribution = async (goalId: string, amount: number, date: string, source: 'manual' | 'weekly', notes = '') => {
    setContribSaving(true); setError('');
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    try {
      const { error: e1 } = await supabase.from('savings_contributions').insert({ goal_id: goalId, amount, contribution_date: date, source, notes });
      if (e1) throw e1;

      const newAmount = goal.current_amount + amount;
      const justCompleted = newAmount >= goal.target_amount && goal.status !== 'completed';
      const newStatus: GoalStatus = newAmount >= goal.target_amount ? 'completed' : goal.status;

      const { error: e2 } = await supabase.from('savings_goals').update({ current_amount: newAmount, status: newStatus }).eq('id', goalId);
      if (e2) throw e2;

      const { error: e3 } = await supabase.from('finance_movements').insert({
        type: 'expense', amount, category: `Ahorro - ${goal.name}`,
        payment_method: 'Efectivo', description: `Aporte a objetivo: ${goal.name}`,
        status: 'paid', movement_date: date,
      });
      if (e3) console.warn('No se pudo registrar en Finanzas:', e3.message);

      setShowContribForm(false);
      setContribForm({ amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
      await loadData();

      if (justCompleted) {
        const updatedGoal = { ...goal, current_amount: newAmount, status: 'completed' as GoalStatus };
        setCompletedGoal(updatedGoal);
      }
    } catch (err) { console.error(err); setError('No se pudo registrar el aporte.'); }
    finally { setContribSaving(false); }
  };

  const handleContribSubmit = (e: FormEvent) => {
    e.preventDefault();
    const amount = Number(contribForm.amount);
    if (!amount || amount <= 0) { setError('Ingresá un monto mayor a cero.'); return; }
    if (!selectedGoalId) return;
    addContribution(selectedGoalId, amount, contribForm.date, 'manual', contribForm.notes);
  };

  const handleWeeklyContrib = (goal: SavingsGoal) => {
    const suggested = getWeeklySuggestion(goal);
    if (suggested <= 0) { setError('No hay aporte semanal sugerido (objetivo vencido o completado).'); return; }
    addContribution(goal.id, suggested, new Date().toISOString().split('T')[0], 'weekly');
  };

  // ── Datos derivados ─────────────────────────────────────────────────────────

  const filteredGoals = useMemo(() =>
    goals.filter(g =>
      (filterCategory === 'all' || g.category === filterCategory) &&
      (filterStatus === 'all' || g.status === filterStatus)
    ), [goals, filterCategory, filterStatus]);

  const totalSaved = useMemo(() =>
    goals.filter(g => g.status !== 'paused').reduce((s, g) => s + g.current_amount, 0),
    [goals]);

  const selectedGoal = selectedGoalId ? goals.find(g => g.id === selectedGoalId) ?? null : null;
  const goalContribs  = selectedGoalId ? contributions.filter(c => c.goal_id === selectedGoalId) : [];

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Modal objetivo completado ───────────────────────────────────────────────

  if (completedGoal) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <div className="bg-slate-800 rounded-2xl border border-violet-500/40 p-8 text-center space-y-5">
          <PartyPopper size={52} className="mx-auto text-violet-400" />
          <div>
            <h2 className="text-2xl font-bold text-crudo-100">¡Objetivo completado!</h2>
            <p className="text-petrol-300 mt-2">
              Alcanzaste el 100% de <span className="text-violet-300 font-semibold">"{completedGoal.name}"</span>.
              ¡Excelente trabajo!
            </p>
          </div>
          <div className="bg-slate-700/60 rounded-xl p-4">
            <p className="text-xs text-petrol-400 mb-1">Total ahorrado</p>
            <p className="text-3xl font-bold text-emerald-400">{currency(completedGoal.target_amount)}</p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={() => {
                setCompletedGoal(null);
                setGoalFormMode('create');
                setGoalForm(EMPTY_GOAL_FORM);
                setSelectedGoalId(null);
              }}
              className="w-full px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={16} /> Crear nuevo objetivo
            </button>
            <button
              onClick={() => { setCompletedGoal(null); setSelectedGoalId(null); }}
              className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm font-medium transition-colors"
            >
              Mantener y ver todos los objetivos
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Vista detalle ────────────────────────────────────────────────────────────

  if (selectedGoal) {
    const progress = getProgress(selectedGoal);
    const weeks    = getWeeksUntil(selectedGoal.deadline);
    const suggested = getWeeklySuggestion(selectedGoal);
    const catCfg   = CATEGORY_CONFIG[selectedGoal.category];

    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => { setSelectedGoalId(null); setShowContribForm(false); setGoalFormMode(null); setError(''); }}
            className="text-xs text-petrol-400 hover:text-crudo-200 flex items-center gap-1"
          >
            ← Volver a Ahorros
          </button>
          {/* Acciones de gestión */}
          <div className="flex gap-2">
            {selectedGoal.status !== 'completed' && (
              <button
                onClick={() => openEditForm(selectedGoal)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center gap-1.5 transition-colors"
              >
                <Edit3 size={13} /> Editar
              </button>
            )}
            {selectedGoal.status !== 'completed' && (
              <button
                onClick={() => togglePause(selectedGoal)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  selectedGoal.status === 'paused'
                    ? 'bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400'
                }`}
              >
                {selectedGoal.status === 'paused' ? <><Play size={13} /> Reactivar</> : <><Pause size={13} /> Pausar</>}
              </button>
            )}
            <button
              onClick={() => deleteGoal(selectedGoal)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center gap-1.5 transition-colors"
            >
              <Trash2 size={13} /> Eliminar
            </button>
          </div>
        </div>

        {/* Formulario edición en detalle */}
        {goalFormMode === 'edit' && (
          <GoalFormPanel
            mode="edit"
            form={goalForm}
            setForm={setGoalForm}
            saving={saving}
            error={error}
            onSubmit={handleEditGoal}
            onCancel={() => { setGoalFormMode(null); setGoalForm(EMPTY_GOAL_FORM); setError(''); }}
          />
        )}

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700/50 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: selectedGoal.color }} />
              <div>
                <h2 className="text-xl font-bold text-crudo-100">{selectedGoal.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catCfg.bg} ${catCfg.color} border ${catCfg.border}`}>
                    {catCfg.label}
                  </span>
                  <GoalStatusBadge status={selectedGoal.status} />
                </div>
              </div>
            </div>
            {selectedGoal.status === 'active' && (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => { setShowContribForm(true); setError(''); }}
                  className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Plus size={14} /> Aporte manual
                </button>
                <button
                  onClick={() => handleWeeklyContrib(selectedGoal)}
                  disabled={contribSaving}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <TrendingUp size={14} /> Aporte semanal ({currency(suggested)})
                </button>
              </div>
            )}
          </div>

          {/* Barra de progreso */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-crudo-300 font-semibold">{currency(selectedGoal.current_amount)}</span>
              <span className="text-petrol-400">de {currency(selectedGoal.target_amount)}</span>
            </div>
            <div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: selectedGoal.color }} />
            </div>
            <div className="flex justify-between text-xs text-petrol-400">
              <span>{progress.toFixed(1)}% alcanzado</span>
              <span>Faltan {currency(Math.max(0, selectedGoal.target_amount - selectedGoal.current_amount))}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard label="Fecha límite"            value={formatDate(selectedGoal.deadline)} icon={CalendarClock} />
            <StatCard label="Semanas restantes"       value={`${weeks} sem.`}                    icon={Clock} />
            <StatCard label="Aporte semanal sugerido" value={currency(suggested)}                icon={TrendingUp} />
          </div>

          {selectedGoal.notes && (
            <p className="text-sm text-petrol-300 bg-slate-700/50 rounded-lg px-4 py-3">{selectedGoal.notes}</p>
          )}
        </div>

        {/* Formulario aporte manual */}
        {showContribForm && (
          <div className="bg-slate-800 rounded-xl p-5 border border-violet-500/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-petrol-300 uppercase tracking-wide">Nuevo aporte manual</h3>
              <button onClick={() => { setShowContribForm(false); setError(''); }} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400"><X size={16} /></button>
            </div>
            {error && <ErrorBanner message={error} />}
            <form onSubmit={handleContribSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="space-y-1 text-xs font-medium text-petrol-300">
                <span>Monto</span>
                <input type="number" min="1" step="1" required value={contribForm.amount} onChange={e => setContribForm(p => ({ ...p, amount: e.target.value }))} className="savings-input" placeholder="0" />
              </label>
              <label className="space-y-1 text-xs font-medium text-petrol-300">
                <span>Fecha</span>
                <input type="date" required value={contribForm.date} onChange={e => setContribForm(p => ({ ...p, date: e.target.value }))} className="savings-input" />
              </label>
              <label className="space-y-1 text-xs font-medium text-petrol-300">
                <span>Nota (opcional)</span>
                <input value={contribForm.notes} onChange={e => setContribForm(p => ({ ...p, notes: e.target.value }))} className="savings-input" placeholder="Ej: quincena extra" />
              </label>
              <div className="md:col-span-3 flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => { setShowContribForm(false); setError(''); }} className="px-4 py-2 rounded-lg text-sm border border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</button>
                <button type="submit" disabled={contribSaving} className="px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white">{contribSaving ? 'Guardando...' : 'Registrar aporte'}</button>
              </div>
            </form>
          </div>
        )}

        {error && !showContribForm && goalFormMode !== 'edit' && <ErrorBanner message={error} />}

        {/* Historial de aportes */}
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700/50 space-y-3">
          <h3 className="text-sm font-semibold text-petrol-300 uppercase tracking-wide">
            Historial de aportes
            {goalContribs.length > 0 && <span className="ml-2 text-petrol-500 font-normal normal-case">({goalContribs.length} registros)</span>}
          </h3>
          {goalContribs.length === 0 ? (
            <p className="text-sm text-petrol-500 py-4 text-center">Todavía no hay aportes registrados.</p>
          ) : (
            <div className="space-y-2">
              {goalContribs.map(c => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-emerald-400 text-sm">+{currency(c.amount)}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${c.source === 'weekly' ? 'bg-violet-500/20 text-violet-300' : 'bg-slate-600 text-slate-300'}`}>
                        {c.source === 'weekly' ? 'Semanal' : 'Manual'}
                      </span>
                    </div>
                    <div className="text-xs text-petrol-500 mt-0.5">
                      {formatDate(c.contribution_date)}{c.notes && ` · ${c.notes}`}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteContrib(c)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400/60 hover:text-rose-400 transition-colors"
                    title="Eliminar aporte"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Vista principal — grilla de tarjetas ────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-crudo-100 flex items-center gap-2">
            <PiggyBank size={22} className="text-violet-400" /> Ahorros
          </h2>
          <p className="text-sm text-crudo-400 mt-1">Gestioná tus objetivos de ahorro y registrá tus aportes</p>
        </div>
        <button
          onClick={() => { setGoalFormMode('create'); setGoalForm(EMPTY_GOAL_FORM); setError(''); }}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
        >
          <Plus size={16} /> Nuevo objetivo de ahorro
        </button>
      </div>

      {/* Total ahorrado */}
      {goals.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-violet-600"><PiggyBank size={18} className="text-white" /></div>
            <div>
              <p className="text-xs text-petrol-400">Total ahorrado (objetivos activos y completados)</p>
              <p className="text-2xl font-bold text-violet-300">{currency(totalSaved)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recordatorio semanal */}
      {showReminder && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 flex items-start gap-3">
          <Bell size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-300">Recordatorio semanal de aportes</p>
            <p className="text-xs text-amber-400/80 mt-0.5 mb-2">Estos objetivos aún no recibieron aporte esta semana:</p>
            <ul className="space-y-1">
              {reminderGoals.map(g => (
                <li key={g.id} className="flex items-center gap-2 text-xs text-amber-200">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                  <span className="font-medium">{g.name}</span>
                  <span className="text-amber-400/70">— sugerido: {currency(getWeeklySuggestion(g))}</span>
                </li>
              ))}
            </ul>
          </div>
          <button onClick={dismissReminder} className="p-1.5 rounded-lg hover:bg-amber-500/20 text-amber-400 flex-shrink-0 transition-colors" title="Cerrar (no vuelve a aparecer esta semana)">
            <X size={16} />
          </button>
        </div>
      )}

      {error && <ErrorBanner message={error} />}

      {/* Formulario nuevo objetivo (solo en la vista principal) */}
      {goalFormMode === 'create' && (
        <GoalFormPanel
          mode="create"
          form={goalForm}
          setForm={setGoalForm}
          saving={saving}
          error={error}
          onSubmit={handleCreateGoal}
          onCancel={() => { setGoalFormMode(null); setGoalForm(EMPTY_GOAL_FORM); setError(''); }}
        />
      )}

      {/* Filtros */}
      {goals.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-petrol-500 self-center">Filtrar:</span>
          {(['all', 'corto', 'mediano', 'largo'] as const).map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterCategory === cat ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600'}`}>
              {cat === 'all' ? 'Todos' : CATEGORY_CONFIG[cat].label}
            </button>
          ))}
          <div className="w-px bg-slate-700 self-stretch mx-1" />
          {(['all', 'active', 'completed', 'paused'] as const).map(st => (
            <button key={st} onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === st ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600'}`}>
              {st === 'all' ? 'Todos los estados' : st === 'active' ? 'Activos' : st === 'completed' ? 'Completados' : 'Pausados'}
            </button>
          ))}
        </div>
      )}

      {/* Grilla */}
      {filteredGoals.length === 0 && goalFormMode !== 'create' ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <PiggyBank size={48} className="text-slate-600" />
          <div>
            <p className="text-crudo-300 font-medium">{goals.length === 0 ? 'Todavía no tenés objetivos de ahorro' : 'No hay objetivos con esos filtros'}</p>
            <p className="text-petrol-500 text-sm mt-1">{goals.length === 0 ? 'Creá tu primer objetivo para empezar a ahorrar.' : 'Probá cambiando los filtros.'}</p>
          </div>
          {goals.length === 0 && (
            <button onClick={() => { setGoalFormMode('create'); setGoalForm(EMPTY_GOAL_FORM); setError(''); }}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors">
              <Plus size={16} /> Crear primer objetivo
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredGoals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onSelect={() => { setSelectedGoalId(goal.id); setShowContribForm(false); setGoalFormMode(null); setError(''); }}
              onWeeklyContrib={() => handleWeeklyContrib(goal)}
              onTogglePause={() => togglePause(goal)}
              onDelete={() => deleteGoal(goal)}
              contribSaving={contribSaving}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function GoalFormPanel({
  mode, form, setForm, saving, error, onSubmit, onCancel,
}: {
  mode: 'create' | 'edit';
  form: GoalForm;
  setForm: React.Dispatch<React.SetStateAction<GoalForm>>;
  saving: boolean;
  error: string;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-violet-500/40 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-petrol-300 uppercase tracking-wide flex items-center gap-2">
          <Target size={16} /> {mode === 'create' ? 'Nuevo objetivo de ahorro' : 'Editar objetivo'}
        </h3>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400"><X size={16} /></button>
      </div>
      {error && <ErrorBanner message={error} />}
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <label className="space-y-1 text-xs font-medium text-petrol-300 xl:col-span-2">
          <span>Nombre del objetivo *</span>
          <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="savings-input" placeholder="Ej: Viaje, Máquina nueva, Fondo de emergencia" />
        </label>
        <label className="space-y-1 text-xs font-medium text-petrol-300">
          <span>Monto objetivo *</span>
          <input type="number" min="1" step="1" required value={form.target_amount} onChange={e => setForm(p => ({ ...p, target_amount: e.target.value }))} className="savings-input" placeholder="0" />
        </label>
        <label className="space-y-1 text-xs font-medium text-petrol-300">
          <span>Fecha límite *</span>
          <input type="date" required value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} className="savings-input" />
        </label>
        <label className="space-y-1 text-xs font-medium text-petrol-300">
          <span>Categoría</span>
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as GoalCategory }))} className="savings-input">
            <option value="corto">Corto plazo</option>
            <option value="mediano">Mediano plazo</option>
            <option value="largo">Largo plazo</option>
          </select>
        </label>
        <div className="space-y-1 text-xs font-medium text-petrol-300">
          <span>Color identificador</span>
          <div className="flex gap-2 flex-wrap pt-1">
            {GOAL_COLORS.map(color => (
              <button key={color} type="button" onClick={() => setForm(p => ({ ...p, color }))}
                className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${form.color === color ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>
        <label className="space-y-1 text-xs font-medium text-petrol-300 md:col-span-2 xl:col-span-3">
          <span>Notas (opcional)</span>
          <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="savings-input" placeholder="Descripción o motivo del objetivo" />
        </label>
        <div className="md:col-span-2 xl:col-span-3 flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm border border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white">
            {saving ? 'Guardando...' : mode === 'create' ? 'Crear objetivo' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}

function GoalCard({
  goal, onSelect, onWeeklyContrib, onTogglePause, onDelete, contribSaving,
}: {
  goal: SavingsGoal;
  onSelect: () => void;
  onWeeklyContrib: () => void;
  onTogglePause: () => void;
  onDelete: () => void;
  contribSaving: boolean;
}) {
  const progress  = getProgress(goal);
  const weeks     = getWeeksUntil(goal.deadline);
  const suggested = getWeeklySuggestion(goal);
  const catCfg    = CATEGORY_CONFIG[goal.category];

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden hover:border-slate-600 transition-colors flex flex-col">
      <div className="h-1.5 w-full flex-shrink-0" style={{ backgroundColor: goal.color }} />
      <div className="p-5 space-y-4 flex flex-col flex-1">
        {/* Nombre + badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: goal.color }} />
            <h3 className="font-semibold text-crudo-100 truncate">{goal.name}</h3>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <GoalStatusBadge status={goal.status} />
            {/* Menú rápido */}
            {goal.status !== 'completed' && (
              <button onClick={e => { e.stopPropagation(); onTogglePause(); }}
                className={`p-1 rounded-md transition-colors ${goal.status === 'paused' ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-amber-400 hover:bg-amber-500/10'}`}
                title={goal.status === 'paused' ? 'Reactivar' : 'Pausar'}>
                {goal.status === 'paused' ? <Play size={13} /> : <Pause size={13} />}
              </button>
            )}
            <button onClick={e => { e.stopPropagation(); onDelete(); }}
              className="p-1 rounded-md text-rose-400/50 hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Eliminar">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${catCfg.bg} ${catCfg.color} border ${catCfg.border}`}>
          {catCfg.label}
        </span>

        {/* Barra de progreso */}
        <div className="space-y-1.5">
          <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: goal.color }} />
          </div>
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-crudo-200">{currency(goal.current_amount)}</span>
            <span className="text-petrol-400">{progress.toFixed(0)}% de {currency(goal.target_amount)}</span>
          </div>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-700/60 rounded-lg px-3 py-2">
            <p className="text-petrol-500">Fecha límite</p>
            <p className="text-crudo-200 font-medium">{formatDate(goal.deadline)}</p>
          </div>
          <div className="bg-slate-700/60 rounded-lg px-3 py-2">
            <p className="text-petrol-500">Aporte semanal</p>
            <p className="text-crudo-200 font-medium">{weeks > 0 ? currency(suggested) : '—'}</p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 pt-1 mt-auto">
          {goal.status === 'active' && (
            <button onClick={e => { e.stopPropagation(); onWeeklyContrib(); }} disabled={contribSaving}
              className="flex-1 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
              + Aporte semanal
            </button>
          )}
          <button onClick={onSelect}
            className="flex items-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-medium transition-colors">
            Ver detalle <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function GoalStatusBadge({ status }: { status: GoalStatus }) {
  const cfg = {
    active:    { label: 'Activo',     icon: TrendingUp,   cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    completed: { label: 'Completado', icon: CheckCircle2, cls: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
    paused:    { label: 'Pausado',    icon: Pause,        cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  }[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${cfg.cls}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof CalendarClock }) {
  return (
    <div className="bg-slate-700/60 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={13} className="text-petrol-400" />
        <p className="text-xs text-petrol-400">{label}</p>
      </div>
      <p className="text-sm font-semibold text-crudo-100">{value}</p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-rose-500/10 border border-rose-500/40 text-rose-300 rounded-lg p-3 text-xs flex items-center gap-2">
      <AlertCircle size={14} className="flex-shrink-0" /> {message}
    </div>
  );
}
