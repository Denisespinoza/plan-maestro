import { supabase } from './supabase';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type Area = 'modeltex' | 'moldey' | 'personal' | 'sistemas';
export type Priority = 'alta' | 'media' | 'baja';
export type TaskStatus = 'inbox' | 'hoy' | 'en_curso' | 'esperando' | 'hecho';
export type Timeframe = 'corto' | 'mediano' | 'largo';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  area: Area;
  description: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  area: Area;
  timeframe: Timeframe;
  deadline: string | null;
  next_step: string | null;
  progress_manual: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // computed
  task_count?: number;
  done_task_count?: number;
}

export interface Task {
  id: string;
  user_id: string;
  project_id: string | null;
  goal_id: string | null;
  title: string;
  notes: string | null;
  area: Area;
  priority: Priority;
  status: TaskStatus;
  is_mit: boolean;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

// ─── AREA CONFIG ─────────────────────────────────────────────────────────────

export const AREA_CONFIG: Record<Area, { label: string; color: string; bg: string; border: string }> = {
  modeltex: { label: 'ModelTex', color: 'text-bordo-300',  bg: 'bg-bordo-500/20',  border: 'border-bordo-500/40' },
  moldey:   { label: 'Moldey',   color: 'text-dorado-300', bg: 'bg-dorado-500/20', border: 'border-dorado-500/40' },
  personal: { label: 'Personal', color: 'text-plata-300',  bg: 'bg-plata-600/20',  border: 'border-plata-500/40' },
  sistemas: { label: 'Sistemas', color: 'text-emerald-300',bg: 'bg-emerald-500/20',border: 'border-emerald-500/40' },
};

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; dot: string }> = {
  alta:  { label: 'Alta',  color: 'text-red-300',    dot: 'bg-red-400' },
  media: { label: 'Media', color: 'text-dorado-300', dot: 'bg-dorado-400' },
  baja:  { label: 'Baja',  color: 'text-plata-400',  dot: 'bg-plata-500' },
};

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  inbox:    { label: 'Inbox',    color: 'text-plata-300',  bg: 'bg-plata-700/40' },
  hoy:      { label: 'Hoy',     color: 'text-dorado-300', bg: 'bg-dorado-900/40' },
  en_curso: { label: 'En curso', color: 'text-bordo-300',  bg: 'bg-bordo-900/40' },
  esperando:{ label: 'Esperando',color: 'text-amber-300',  bg: 'bg-amber-900/30' },
  hecho:    { label: 'Hecho',   color: 'text-emerald-300',bg: 'bg-emerald-900/30' },
};

export const TIMEFRAME_CONFIG: Record<Timeframe, { label: string; color: string }> = {
  corto:   { label: 'Corto plazo',   color: 'text-red-300' },
  mediano: { label: 'Mediano plazo', color: 'text-dorado-300' },
  largo:   { label: 'Largo plazo',   color: 'text-plata-400' },
};

// ─── PROJECTS ─────────────────────────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('pm_projects')
    .select('*')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createProject(p: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Project> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data, error } = await supabase
    .from('pm_projects')
    .insert({ ...p, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProject(id: string, p: Partial<Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<void> {
  const { error } = await supabase.from('pm_projects').update(p).eq('id', id);
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('pm_projects').delete().eq('id', id);
  if (error) throw error;
}

// ─── GOALS ────────────────────────────────────────────────────────────────────

export async function getGoals(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('pm_goals')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getGoalsWithProgress(): Promise<Goal[]> {
  const [goals, tasks] = await Promise.all([getGoals(), getTasks()]);
  return goals.map(g => {
    const linked = tasks.filter(t => t.goal_id === g.id);
    const done = linked.filter(t => t.status === 'hecho').length;
    return { ...g, task_count: linked.length, done_task_count: done };
  });
}

export async function createGoal(g: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'task_count' | 'done_task_count'>): Promise<Goal> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data, error } = await supabase
    .from('pm_goals')
    .insert({ ...g, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateGoal(id: string, g: Partial<Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<void> {
  const { error } = await supabase.from('pm_goals').update(g).eq('id', id);
  if (error) throw error;
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('pm_goals').delete().eq('id', id);
  if (error) throw error;
}

// ─── TASKS ────────────────────────────────────────────────────────────────────

export async function getTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('pm_tasks')
    .select('*')
    .order('position')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTasksByStatus(status: TaskStatus): Promise<Task[]> {
  const { data, error } = await supabase
    .from('pm_tasks')
    .select('*')
    .eq('status', status)
    .order('position')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTodayTasks(): Promise<Task[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('pm_tasks')
    .select('*')
    .neq('status', 'hecho')
    .or(`status.eq.hoy,due_date.eq.${today}`)
    .order('is_mit', { ascending: false })
    .order('position');
  if (error) throw error;
  return data ?? [];
}

export async function createTask(t: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Task> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data, error } = await supabase
    .from('pm_tasks')
    .insert({ ...t, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTask(id: string, t: Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<void> {
  const { error } = await supabase.from('pm_tasks').update(t).eq('id', id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('pm_tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function moveTask(id: string, newStatus: TaskStatus): Promise<void> {
  await updateTask(id, { status: newStatus });
}

// ─── AI CONTEXT ───────────────────────────────────────────────────────────────

export interface PmAiContext {
  generatedAt: string;
  totalTasks: number;
  tasksByStatus: Record<TaskStatus, number>;
  mitTasks: Task[];
  todayTasks: Task[];
  overdueTasks: Task[];
  allTasks: Task[];
  goals: Goal[];
  projects: Project[];
}

export async function getPmAiContext(): Promise<PmAiContext> {
  const today = new Date().toISOString().split('T')[0];
  const [tasks, goals, projects] = await Promise.all([getTasks(), getGoalsWithProgress(), getProjects()]);

  const tasksByStatus = { inbox: 0, hoy: 0, en_curso: 0, esperando: 0, hecho: 0 };
  for (const t of tasks) tasksByStatus[t.status]++;

  return {
    generatedAt: new Date().toISOString(),
    totalTasks: tasks.length,
    tasksByStatus,
    mitTasks: tasks.filter(t => t.is_mit && t.status !== 'hecho'),
    todayTasks: tasks.filter(t => (t.status === 'hoy' || t.due_date === today) && t.status !== 'hecho'),
    overdueTasks: tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'hecho'),
    allTasks: tasks,
    goals,
    projects,
  };
}

// ─── AI CONVERSATIONS ─────────────────────────────────────────────────────────

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

function generateTitle(msg: string): string {
  const words = msg.trim().split(/\s+/).slice(0, 6).join(' ');
  return words.length < msg.trim().length ? `${words}…` : words;
}

export async function createConversation(firstMessage: string): Promise<AiConversation> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data, error } = await supabase
    .from('pm_ai_conversations')
    .insert({ user_id: user.id, title: generateTitle(firstMessage) })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getConversations(): Promise<AiConversation[]> {
  const { data, error } = await supabase
    .from('pm_ai_conversations')
    .select('id, title, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function getConversationMessages(convId: string): Promise<AiChatMessage[]> {
  const { data, error } = await supabase
    .from('pm_ai_messages')
    .select('role, content')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AiChatMessage[];
}

export async function saveMessage(convId: string, role: 'user' | 'assistant', content: string): Promise<void> {
  const { error } = await supabase
    .from('pm_ai_messages')
    .insert({ conversation_id: convId, role, content });
  if (error) throw error;
}

export async function deleteConversation(convId: string): Promise<void> {
  const { error } = await supabase.from('pm_ai_conversations').delete().eq('id', convId);
  if (error) throw error;
}

export async function sendAiChat(messages: AiChatMessage[], context: PmAiContext): Promise<string> {
  const response = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'No se pudo obtener respuesta.');
  if (typeof payload.reply !== 'string' || !payload.reply.trim()) throw new Error('Respuesta vacía del asistente.');
  return payload.reply.trim();
}
