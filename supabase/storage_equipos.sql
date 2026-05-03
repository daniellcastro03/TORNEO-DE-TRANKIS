-- Crear el bucket de storage para los escudos de los equipos
insert into storage.buckets (id, name, public)
values ('equipos', 'equipos', true)
on conflict (id) do nothing;

-- Política: Cualquiera puede ver/descargar los escudos (public = true)
create policy "Equipos images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'equipos' );

-- Política: Los administradores pueden subir escudos
create policy "Admins can upload equipo images."
  on storage.objects for insert
  with check (
    bucket_id = 'equipos' 
    and exists (select 1 from public.jugadores where id = auth.uid() and rol = 'admin')
  );

-- Política: Los administradores pueden actualizar escudos
create policy "Admins can update equipo images."
  on storage.objects for update
  using (
    bucket_id = 'equipos' 
    and exists (select 1 from public.jugadores where id = auth.uid() and rol = 'admin')
  );

-- Política: Los administradores pueden borrar escudos
create policy "Admins can delete equipo images."
  on storage.objects for delete
  using (
    bucket_id = 'equipos' 
    and exists (select 1 from public.jugadores where id = auth.uid() and rol = 'admin')
  );
