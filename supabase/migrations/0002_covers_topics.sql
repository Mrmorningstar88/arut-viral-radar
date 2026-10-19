-- Обложки роликов в каталоге и темы автора для адаптаций.
alter table reels add column if not exists cover_url text;
alter table persona add column if not exists topics text not null default '';

-- Публичное хранилище обложек: картинки Instagram с CDN быстро протухают.
insert into storage.buckets (id, name, public) values ('covers', 'covers', true) on conflict (id) do nothing;
