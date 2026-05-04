-- ============================================================
-- Fix: Política DELETE para admins en tabla jugadores
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Permitir que admins eliminen jugadores
-- (la tabla jugadores solo tenía select/insert/update para usuarios propios)
DROP POLICY IF EXISTS "jugadores_admin_delete" ON jugadores;
CREATE POLICY "jugadores_admin_delete"
  ON jugadores FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM jugadores admin_check
      WHERE admin_check.id = auth.uid()
        AND admin_check.rol = 'admin'
    )
  );

-- También permitir que admins actualicen cualquier jugador (cambiar nombre, etc.)
DROP POLICY IF EXISTS "jugadores_admin_update" ON jugadores;
CREATE POLICY "jugadores_admin_update"
  ON jugadores FOR UPDATE
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM jugadores admin_check
      WHERE admin_check.id = auth.uid()
        AND admin_check.rol = 'admin'
    )
  );
