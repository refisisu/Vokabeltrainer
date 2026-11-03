-- 003: Lernstand je Kind geräteübergreifend speichern.
-- voc_progress: aktueller zusammengeführter Stand, rev verhindert gegenseitiges Überschreiben.
-- voc_progress_backups: Sicherung jedes Geräts vor seinem ersten Abgleich. Die App kann sie nur anlegen und lesen.

create table if not exists public.voc_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  rev integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.voc_progress_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.voc_progress enable row level security;
alter table public.voc_progress_backups enable row level security;

drop policy if exists "Eigener Lernstand lesen" on public.voc_progress;
create policy "Eigener Lernstand lesen" on public.voc_progress
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Eigener Lernstand anlegen" on public.voc_progress;
create policy "Eigener Lernstand anlegen" on public.voc_progress
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Eigener Lernstand ändern" on public.voc_progress;
create policy "Eigener Lernstand ändern" on public.voc_progress
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Eigene Sicherung lesen" on public.voc_progress_backups;
create policy "Eigene Sicherung lesen" on public.voc_progress_backups
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Eigene Sicherung anlegen" on public.voc_progress_backups;
create policy "Eigene Sicherung anlegen" on public.voc_progress_backups
  for insert to authenticated with check (user_id = auth.uid());
