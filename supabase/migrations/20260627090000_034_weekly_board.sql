-- 034 Weekly board (Semana dentro de Agenda)
-- Tablero operativo semanal sincronizado con el resto de la app.
-- No borra ni modifica datos existentes. RLS por user_id.

-- ── 1. Plan semanal (Foco + Indicadores + Cierre) ──────────────────────────────
create table if not exists pm_weekly_plans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  week_start      date not null,                       -- lunes de la semana
  focus_title     text,
  focus_project_id uuid references pm_projects(id) on delete set null,
  focus_business  text,
  motivation      text,
  avoid_list      text,
  indicators      jsonb not null default '{}'::jsonb,  -- ventas/ingreso/ahorro/horas
  closed          boolean not null default false,
  closed_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists pm_weekly_plans_user_week
  on pm_weekly_plans(user_id, week_start);

alter table pm_weekly_plans enable row level security;
create policy "pm_weekly_plans: user owns rows"
  on pm_weekly_plans for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger pm_weekly_plans_updated_at
  before update on pm_weekly_plans
  for each row execute function pm_set_updated_at();

-- ── 2. Metas libres semanales ──────────────────────────────────────────────────
create table if not exists pm_weekly_goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  week_start   date not null,
  title        text not null,
  description  text,
  area         text,
  priority     text not null default 'media' check (priority in ('alta','media','baja')),
  status       text not null default 'pendiente' check (status in ('pendiente','en_proceso','hecha','en_pausa')),
  progress     int not null default 0 check (progress between 0 and 100),
  deadline     date,
  project_id   uuid references pm_projects(id) on delete set null,
  goal_id      uuid references pm_goals(id) on delete set null,
  is_critical  boolean not null default false,
  position     int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists pm_weekly_goals_user_week
  on pm_weekly_goals(user_id, week_start);

alter table pm_weekly_goals enable row level security;
create policy "pm_weekly_goals: user owns rows"
  on pm_weekly_goals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger pm_weekly_goals_updated_at
  before update on pm_weekly_goals
  for each row execute function pm_set_updated_at();

-- ── 3. Vínculos de tareas reales al Kanban semanal (sin duplicar) ──────────────
create table if not exists pm_weekly_task_links (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  week_start   date not null,
  task_id      uuid not null references pm_tasks(id) on delete cascade,
  week_column  text not null default 'plan'
               check (week_column in ('plan','foco','proceso','bloqueado','hecho','proxima')),
  is_critical  boolean not null default false,
  position     int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index if not exists pm_weekly_task_links_unique
  on pm_weekly_task_links(user_id, week_start, task_id);
create index if not exists pm_weekly_task_links_user_week
  on pm_weekly_task_links(user_id, week_start);

alter table pm_weekly_task_links enable row level security;
create policy "pm_weekly_task_links: user owns rows"
  on pm_weekly_task_links for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger pm_weekly_task_links_updated_at
  before update on pm_weekly_task_links
  for each row execute function pm_set_updated_at();

-- ── 4. Ampliar tipos de Bitácora con 'cierre_semanal' ──────────────────────────
alter table pm_journal_entries drop constraint if exists pm_journal_entries_type_check;
alter table pm_journal_entries add constraint pm_journal_entries_type_check
  check (type in ('diario','idea','decision','plan','leccion','cierre_diario','cierre_semanal'));
