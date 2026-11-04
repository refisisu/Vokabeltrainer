-- 005: Geographie als eigenes Fach.
-- Geographie-Karten kommen direkt aus der Liste, Korrekturen erreichen dadurch die Geräte des Kindes.
-- voc_words hatte keine Änderungs-Regel, Einträge ließen sich bisher nicht bearbeiten.

alter table public.voc_lists drop constraint if exists voc_lists_kind_check;
alter table public.voc_lists
  add constraint voc_lists_kind_check check (kind in ('vocab', 'irregular_verbs', 'geography'));

drop policy if exists "Lehrer ändert Wörter eigener Listen" on public.voc_words;
create policy "Lehrer ändert Wörter eigener Listen" on public.voc_words
  for update to authenticated
  using (list_id in (select id from public.voc_lists where teacher_id = auth.uid()))
  with check (list_id in (select id from public.voc_lists where teacher_id = auth.uid()));
