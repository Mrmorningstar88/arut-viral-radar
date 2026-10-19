create extension if not exists vector;

-- Пространства: у каждого пользователя свой образ, креаторы, вкус и метрики.
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'editor', 'viewer')),
  primary key (workspace_id, user_id)
);

create function is_member(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from workspace_members where workspace_id = ws and user_id = auth.uid())
$$;

create table persona (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  name text not null default '',
  facts text not null default '',
  voice text not null default '',
  taboo text not null default '',
  -- Запросы для поиска новых залётов (Exa), дополняют мониторинг креаторов.
  search_queries text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table creators (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  username text not null,
  followers bigint,
  median_views bigint,
  source text not null default 'auto' check (source in ('auto', 'manual')),
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (workspace_id, username)
);

create table reels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  platform text not null default 'instagram' check (platform in ('instagram', 'tiktok')),
  ext_id text not null,
  url text not null,
  author text,
  views bigint,
  likes bigint,
  comments bigint,
  posted_at timestamptz,
  caption text,
  lanes text[] not null default '{}',
  fit_score int,
  fit_reason text,
  embedding vector(512),
  status text not null default 'new'
    check (status in ('new', 'in_work', 'rejected', 'filmed', 'published')),
  notes text not null default '',
  published_url text,
  created_at timestamptz not null default now(),
  unique (workspace_id, platform, ext_id)
);

-- Каждое решение пользователя: сигнал для профиля вкуса.
create table reel_feedback (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  reel_id uuid references reels(id) on delete cascade,
  action text not null check (action in ('in_work', 'rejected', 'filmed', 'published')),
  reason_code text,
  reason_text text,
  created_at timestamptz not null default now()
);

create table redpill (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  topic text not null,
  era text,
  distraction text,
  facts jsonb not null default '[]',
  sources jsonb not null default '[]',
  embedding vector(512),
  status text not null default 'new'
    check (status in ('new', 'in_work', 'rejected', 'filmed', 'published')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table redpill_backlog (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  topic text not null,
  used_at timestamptz,
  primary key (workspace_id, topic)
);

create table analyses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  reel_id uuid references reels(id) on delete cascade,
  redpill_id uuid references redpill(id) on delete cascade,
  payload jsonb not null,
  model text not null,
  created_at timestamptz not null default now(),
  check ((reel_id is null) <> (redpill_id is null))
);

create table queue (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  url text not null,
  note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'done', 'error')),
  error_ru text,
  reel_id uuid references reels(id),
  created_at timestamptz not null default now()
);

-- Свои выложенные ролики и их метрики по дням: сигнал «что сработало».
create table own_posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  url text not null,
  reel_id uuid references reels(id),
  posted_at timestamptz,
  tags jsonb not null default '{}',
  imported boolean not null default false,
  created_at timestamptz not null default now(),
  unique (workspace_id, url)
);

create table own_post_metrics (
  post_id uuid not null references own_posts(id) on delete cascade,
  day int not null,
  views bigint,
  likes bigint,
  comments bigint,
  saves bigint,
  shares bigint,
  captured_at timestamptz not null default now(),
  primary key (post_id, day)
);

create table taste_profile (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  summary text not null default '',
  updated_at timestamptz not null default now()
);

create table learned_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  text text not null,
  evidence jsonb not null default '[]',
  status text not null default 'proposed' check (status in ('proposed', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text not null check (kind in ('morning', 'evening', 'manual')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  stats jsonb not null default '{}',
  errors jsonb not null default '[]'
);

-- Себестоимость по пространству: основа для цены подписки.
create table usage_costs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  run_id uuid references runs(id) on delete set null,
  provider text not null,
  units numeric not null,
  usd numeric not null,
  created_at timestamptz not null default now()
);

-- Кэш источников общий: публичные данные Instagram одинаковы для всех.
create table source_cache (
  key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null
);
alter table source_cache enable row level security;

alter table workspaces enable row level security;
create policy member_read on workspaces for select to authenticated using (is_member(id));

alter table workspace_members enable row level security;
create policy self_read on workspace_members for select to authenticated using (user_id = auth.uid());

-- Фон работает через service role и обходит RLS.
do $$
declare t text;
begin
  foreach t in array array['persona','creators','reels','reel_feedback','redpill','redpill_backlog',
    'analyses','queue','own_posts','taste_profile','learned_rules','notifications','runs','usage_costs'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy member_all on %I for all to authenticated
      using (is_member(workspace_id)) with check (is_member(workspace_id))', t);
  end loop;
end $$;

alter table own_post_metrics enable row level security;
create policy member_all on own_post_metrics for all to authenticated
  using (exists (select 1 from own_posts p where p.id = post_id and is_member(p.workspace_id)));
