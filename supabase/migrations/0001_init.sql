create extension if not exists vector;

create table persona (
  id int primary key default 1 check (id = 1),
  facts text not null default '',
  voice text not null default '',
  taboo text not null default '',
  updated_at timestamptz not null default now()
);
insert into persona (id) values (1);

create table creators (
  username text primary key,
  followers bigint,
  source text not null default 'auto' check (source in ('auto', 'manual')),
  last_checked_at timestamptz,
  created_at timestamptz not null default now()
);

create table reels (
  id uuid primary key default gen_random_uuid(),
  ig_id text not null unique,
  url text not null,
  author text references creators(username),
  views bigint,
  likes bigint,
  comments bigint,
  posted_at timestamptz,
  caption text,
  lanes text[] not null default '{}',
  status text not null default 'new'
    check (status in ('new', 'in_work', 'filmed', 'published', 'skip')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table redpill (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  era text,
  distraction text,
  facts jsonb not null default '[]',
  sources jsonb not null default '[]',
  embedding vector(512),
  status text not null default 'new'
    check (status in ('new', 'in_work', 'filmed', 'published', 'skip')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table redpill_backlog (
  topic text primary key,
  used_at timestamptz
);
insert into redpill_backlog (topic) values
  ('Plaza Accord 1985'), ('Bretton Woods 1944'), ('MKUltra (Church Committee)'),
  ('Enron'), ('TARP 2008'), ('Cambridge Analytica'), ('«Doubt is our product»'),
  ('Картель Phoebus'), ('Свинец в бензине и Клэр Паттерсон'),
  ('Operation Mockingbird (только подтверждённое)'), ('Эффект Кантильона'), ('LTCM 1998');

create table analyses (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid references reels(id) on delete cascade,
  redpill_id uuid references redpill(id) on delete cascade,
  payload jsonb not null,
  model text not null,
  created_at timestamptz not null default now(),
  check ((reel_id is null) <> (redpill_id is null))
);

create table queue (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'done', 'error')),
  error_ru text,
  reel_id uuid references reels(id),
  created_at timestamptz not null default now()
);

create table runs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('morning', 'evening', 'manual')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  stats jsonb not null default '{}',
  errors jsonb not null default '[]'
);

create table source_cache (
  key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null
);

-- Доступ только для владельца; фон работает через service role и обходит RLS.
do $$
declare t text;
begin
  foreach t in array array['persona','creators','reels','redpill','redpill_backlog','analyses','queue','runs','source_cache'] loop
    execute format('alter table %I enable row level security', t);
    execute format($p$create policy owner_all on %I for all to authenticated
      using ((auth.jwt() ->> 'email') = current_setting('app.owner_email', true))
      with check ((auth.jwt() ->> 'email') = current_setting('app.owner_email', true))$p$, t);
  end loop;
end $$;
