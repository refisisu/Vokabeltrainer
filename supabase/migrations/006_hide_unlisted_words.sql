-- 006: Wörter außerhalb der zugewiesenen Listen pro Klasse ausblenden.
-- Die Wörter und ihr Lernstand bleiben auf den Geräten und in voc_progress erhalten, sie werden nur nicht abgefragt.

alter table public.voc_classes
  add column if not exists hide_unlisted_words boolean not null default false;
