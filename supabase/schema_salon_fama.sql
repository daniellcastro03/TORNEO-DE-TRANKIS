create table if not exists public.salon_fama (
  id uuid primary key default gen_random_uuid(),
  jugador_id uuid references public.jugadores(id) on delete cascade not null,
  torneo_id uuid references public.torneos(id) on delete set null,
  titulo text not null,
  descripcion text,
  tipo_trofeo text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.salon_fama enable row level security;

-- Drop policies if they exist so we can re-run
drop policy if exists "Salon fama is viewable by everyone." on public.salon_fama;
drop policy if exists "Admins can insert salon fama." on public.salon_fama;
drop policy if exists "Admins can delete salon fama." on public.salon_fama;

create policy "Salon fama is viewable by everyone."
  on public.salon_fama for select
  using ( true );

create policy "Admins can insert salon fama."
  on public.salon_fama for insert
  with check ( exists (
    select 1 from public.jugadores
    where jugadores.id = auth.uid()
    and jugadores.rol = 'admin'
  ) );

create policy "Admins can delete salon fama."
  on public.salon_fama for delete
  using ( exists (
    select 1 from public.jugadores
    where jugadores.id = auth.uid()
    and jugadores.rol = 'admin'
  ) );
