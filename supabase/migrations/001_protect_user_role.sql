-- 001: Rolle in voc_users darf nicht vom Client gesetzt werden.
-- Vorher konnte jeder per ?teacher=<Token> (im Client-Code sichtbar) Lehrer werden.
-- Im Supabase-SQL-Editor / mit service_role ist auth.uid() NULL -> dort bleibt alles erlaubt.

create or replace function public.voc_users_protect_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;                      -- SQL-Editor / service_role: ungefiltert
  end if;
  if tg_op = 'INSERT' then
    new.role := 'student';           -- Selbstregistrierung ist immer Schüler
  else
    new.role := old.role;            -- Rolle per Client nie änderbar
  end if;
  return new;
end;
$$;

drop trigger if exists voc_users_protect_role on public.voc_users;
create trigger voc_users_protect_role
  before insert or update on public.voc_users
  for each row execute function public.voc_users_protect_role();

-- Einmalig, eigenes Konto zum Admin/Lehrer machen (E-Mail anpassen):
--   update public.voc_users set role = 'teacher'
--   where id = (select id from auth.users where email = 'DEINE@MAIL');
--
-- Bestehende Lehrer prüfen (evtl. haben sich Fremde per Token eingetragen):
--   select u.id, u.display_name, u.role, a.email, a.created_at
--   from public.voc_users u join auth.users a on a.id = u.id
--   where u.role = 'teacher' order by a.created_at;
-- Unbekannte auf 'student' setzen oder Konto löschen.
