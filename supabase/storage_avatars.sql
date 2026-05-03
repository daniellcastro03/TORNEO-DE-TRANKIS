-- Crear el bucket de storage para las fotos de perfil (avatars)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Habilitar RLS en la tabla de objetos de storage (si no está habilitado ya)
-- Nota: La tabla de objetos en supabase se llama storage.objects

-- Política: Cualquiera puede ver/descargar los avatars (public = true)
create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- Política: Los usuarios autenticados pueden subir su propia foto de perfil
create policy "Users can upload their own avatar."
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' 
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] != '' -- asegurar que el archivo no esté vacío
  );

-- Política: Los usuarios autenticados pueden actualizar su propia foto de perfil
create policy "Users can update their own avatar."
  on storage.objects for update
  using (
    bucket_id = 'avatars' 
    and auth.role() = 'authenticated'
  );

-- Política: Los usuarios autenticados pueden borrar su propia foto de perfil
create policy "Users can delete their own avatar."
  on storage.objects for delete
  using (
    bucket_id = 'avatars' 
    and auth.role() = 'authenticated'
  );
