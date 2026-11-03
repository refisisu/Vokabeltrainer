-- 002: Schüler dürfen die Listen lesen, die ihrer Klasse zugewiesen sind.
-- voc_class_lists hatte nur Lehrer-Policies, voc_lists prüfte nur die Spalte class_id.
-- Listen, die über voc_class_lists zugewiesen sind, waren für Schüler dadurch unsichtbar.
-- Die vorhandene Policy auf voc_words liest voc_class_lists und greift erst damit.

drop policy if exists "Schüler sieht Zuordnungen eigener Klassen" on public.voc_class_lists;
create policy "Schüler sieht Zuordnungen eigener Klassen"
  on public.voc_class_lists
  for select
  to authenticated
  using (class_id in (select public.voc_my_class_ids()));

drop policy if exists "Schüler sieht zugewiesene Listen" on public.voc_lists;
create policy "Schüler sieht zugewiesene Listen"
  on public.voc_lists
  for select
  to authenticated
  using (id in (
    select cl.list_id
    from public.voc_class_lists cl
    where cl.class_id in (select public.voc_my_class_ids())
  ));
