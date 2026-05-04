-- ============================================================
-- Fix: Políticas Storage para Avatares (Permitir a Admins)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Crear el bucket de storage para los avatares si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Política: Cualquiera puede ver/descargar los avatares (public = true)
DROP POLICY IF EXISTS "Avatars images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars images are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

-- Política: Usuarios pueden subir/actualizar sus propios avatares (basado en el nombre del archivo si quisieras), 
-- PERO para más facilidad dejaremos que los ADMINS o el PROPIO USUARIO puedan subir al bucket
DROP POLICY IF EXISTS "Users and Admins can upload avatars" ON storage.objects;
CREATE POLICY "Users and Admins can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND (
      -- Es el dueño del archivo (idealmente) o un admin
      EXISTS (SELECT 1 FROM public.jugadores WHERE id = auth.uid() AND rol = 'admin')
      OR auth.role() = 'authenticated'
    )
  );

-- Política: Administradores y dueños pueden actualizar avatares
DROP POLICY IF EXISTS "Users and Admins can update avatars" ON storage.objects;
CREATE POLICY "Users and Admins can update avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' 
    AND (
      EXISTS (SELECT 1 FROM public.jugadores WHERE id = auth.uid() AND rol = 'admin')
      OR auth.role() = 'authenticated'
    )
  );

-- Política: Administradores pueden borrar avatares
DROP POLICY IF EXISTS "Admins can delete avatars" ON storage.objects;
CREATE POLICY "Admins can delete avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' 
    AND (
      EXISTS (SELECT 1 FROM public.jugadores WHERE id = auth.uid() AND rol = 'admin')
      OR owner = auth.uid()
    )
  );
