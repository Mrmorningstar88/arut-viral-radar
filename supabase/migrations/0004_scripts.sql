-- Конвейер YOOMP: сценарий → сториборд → производство → готовый ролик → публикация.
-- На каждом переходе нужно «да» автора. busy: Claude сейчас работает над карточкой.
create table if not exists scripts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  stage text not null default 'script' check (stage in ('script', 'storyboard', 'production', 'ready', 'published', 'rejected')),
  busy boolean not null default false,
  error text,
  title text not null,
  pillar text,
  source_reel_id uuid references reels(id) on delete set null,
  payload jsonb not null,
  storyboard jsonb,
  feedback text,
  style text,
  render_status text check (render_status in ('queued', 'rendering', 'done', 'failed')),
  render_log text,
  video_url text,
  published_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists scripts_ws_stage on scripts (workspace_id, stage, created_at desc);
alter table scripts enable row level security;

-- Готовые ролики: публичное хранилище, ссылка уходит в Instagram и TikTok.
insert into storage.buckets (id, name, public) values ('videos', 'videos', true) on conflict (id) do nothing;
