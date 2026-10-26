-- Проекты YOOMP: пространство = проект (твой блог, продукт по ссылке). Паспорт продукта собирает Claude.
alter table workspaces add column if not exists product_url text;
alter table workspaces add column if not exists passport jsonb;
