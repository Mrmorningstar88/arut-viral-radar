# Запуск Viral Radar

Пока ключи не заданы, дашборд работает в демо-режиме на вымышленных данных.
Ключи и токены не присылай в чат: они вставляются только в настройки Vercel.

## 1. Supabase (база и вход)

1. Создай проект на [supabase.com](https://supabase.com). Регион поближе к Дубаю, например Mumbai или Frankfurt.
2. Открой **SQL Editor** и выполни по очереди:
   - содержимое `supabase/migrations/0001_init.sql`;
   - содержимое `supabase/seed.sql`;
   - создание твоего пространства:
     ```sql
     with w as (insert into workspaces (name) values ('ARUT') returning id)
     insert into persona (workspace_id, name) select id, 'Арут' from w returning workspace_id;
     ```
     Скопируй `workspace_id` из результата, это `WORKSPACE_ID`. Затем:
     ```sql
     select seed_redpill_backlog('<WORKSPACE_ID>');
     ```
3. **Project Settings → API**: скопируй `Project URL`, `anon` и `service_role` ключи.
4. **Authentication → URL Configuration**: в `Site URL` впиши адрес сайта из Vercel (шаг 4) и добавь его же с `/auth/callback` в `Redirect URLs`.

## 2. Apify (Instagram)

Зарегистрируйся на [apify.com](https://apify.com), **Settings → API & Integrations** → скопируй токен.
Акторы, которые использует движок: `instagram-reel-scraper`, `instagram-scraper`, `instagram-profile-scraper`. Оплата за результат, на тест хватит стартовых кредитов.

## 3. Anthropic (Claude)

[console.anthropic.com](https://console.anthropic.com) → **API Keys** → создай ключ и пополни баланс.

Необязательно: [exa.ai](https://exa.ai), ключ для поиска новых залётов по запросам из вкладки Persona. Без него работает только мониторинг креаторов.

## 4. Vercel (хостинг и расписание)

1. На [vercel.com](https://vercel.com) импортируй репозиторий `arut-viral-radar`.
2. **Settings → Environment Variables**, добавь:

| Переменная | Откуда |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase, Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase, anon |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase, service_role |
| `WORKSPACE_ID` | результат SQL из шага 1 |
| `OWNER_EMAILS` | твоя почта для входа (несколько через запятую) |
| `ANTHROPIC_API_KEY` | Anthropic |
| `APIFY_TOKEN` | Apify |
| `EXA_API_KEY` | Exa, необязательно |

3. **Integrations → Inngest** (Vercel Marketplace): подключи, он сам добавит `INNGEST_EVENT_KEY` и `INNGEST_SIGNING_KEY`. Расписание 09:00 и 20:00 по Дубаю включится само.
4. Сделай **Redeploy**.

## 5. Первый запуск

1. Открой сайт, введи почту, перейди по ссылке из письма.
2. Вкладка **Persona**: заполни факты, голос, табу и поисковые запросы.
3. Вкладка **Креаторы**: добавь 5–10 авторов, чьи форматы тебе близки. Их профили проверяются каждый прогон, новые авторы с роликами от 10M добавятся сами.
4. Нажми **«Запустить сейчас»** на вкладке Reels.
