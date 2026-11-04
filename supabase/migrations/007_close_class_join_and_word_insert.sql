-- 007: Beitritt und Wort-Import absichern.
-- voc_insert_words läuft als SECURITY DEFINER und prüfte nicht, wem die Liste gehört.
-- Der Selbst-Beitritt gehörte zum entfernten Join-Link; Mitglieder werden jetzt per SQL eingetragen.
-- Lehrer konnten die Profile ihrer Klassenmitglieder nicht lesen, die Namen erschienen als "—".

create or replace function public.voc_insert_words(p_list_id uuid, p_words jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_inserted int := 0;
  v_skipped  int := 0;
  affected   int;
  word       jsonb;
begin
  if not exists (
    select 1 from voc_lists
    where id = p_list_id and (teacher_id = auth.uid() or created_by = auth.uid())
  ) then
    raise exception 'Keine Berechtigung für diese Liste.' using errcode = '42501';
  end if;

  for word in select * from jsonb_array_elements(p_words) loop
    insert into voc_words (list_id, original, translation, beispiel, hinweis, aussprache)
    values (
      p_list_id,
      word->>'original',
      word->>'translation',
      nullif(trim(word->>'beispiel'), ''),
      nullif(trim(word->>'hinweis'), ''),
      nullif(trim(word->>'aussprache'), '')
    )
    on conflict do nothing;
    get diagnostics affected = row_count;
    v_inserted := v_inserted + affected;
    v_skipped  := v_skipped  + (1 - affected);
  end loop;
  return jsonb_build_object('inserted', v_inserted, 'skipped', v_skipped);
end;
$function$;

revoke all on function public.voc_insert_words(uuid, jsonb) from public, anon;
grant execute on function public.voc_insert_words(uuid, jsonb) to authenticated;

drop policy if exists "Schüler tritt Klasse bei" on public.voc_class_members;

drop policy if exists "Lehrer sieht Profile eigener Klassenmitglieder" on public.voc_users;
create policy "Lehrer sieht Profile eigener Klassenmitglieder" on public.voc_users
  for select to authenticated
  using (id in (
    select m.user_id
    from public.voc_class_members m
    join public.voc_classes c on c.id = m.class_id
    where c.teacher_id = auth.uid()
  ));
