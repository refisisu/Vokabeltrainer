-- 004: Verblisten zentral verwalten.
-- voc_lists.kind unterscheidet Vokabeln und unregelmäßige Verben. Die Verbformen stehen in voc_words.hinweis.
-- voc_classes.show_builtin_verbs: eingebaute Verben anzeigen, solange die Klasse keine eigene Verbliste hat.
-- voc_words hatte keine Lösch-Regel, das Löschen von Listen blieb dadurch unvollständig.

alter table public.voc_lists
  add column if not exists kind text not null default 'vocab';

alter table public.voc_lists drop constraint if exists voc_lists_kind_check;
alter table public.voc_lists
  add constraint voc_lists_kind_check check (kind in ('vocab', 'irregular_verbs'));

alter table public.voc_classes
  add column if not exists show_builtin_verbs boolean not null default true;

drop policy if exists "Lehrer löscht Wörter eigener Listen" on public.voc_words;
create policy "Lehrer löscht Wörter eigener Listen" on public.voc_words
  for delete to authenticated
  using (list_id in (select id from public.voc_lists where teacher_id = auth.uid()));
