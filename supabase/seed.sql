-- Стартовый бэклог Red Pill для нового пространства. Вызывается при создании workspace.
create or replace function seed_redpill_backlog(ws uuid) returns void language sql as $$
  insert into redpill_backlog (workspace_id, topic)
  select ws, t from unnest(array[
    'Plaza Accord 1985', 'Bretton Woods 1944', 'MKUltra (Church Committee)',
    'Enron', 'TARP 2008', 'Cambridge Analytica', '«Doubt is our product»',
    'Картель Phoebus', 'Свинец в бензине и Клэр Паттерсон',
    'Operation Mockingbird (только подтверждённое)', 'Эффект Кантильона', 'LTCM 1998'
  ]) as t
  on conflict do nothing
$$;
