-- ============================================================
-- Fase 4: Policies adicionales para notificaciones y grupos
-- Ejecutar DESPUÉS del schema.sql
-- ============================================================

-- ==================== NOTIFICACIONES ====================
-- Los jugadores solo pueden ver SUS notificaciones
DROP POLICY IF EXISTS "Players see own notifications" ON notificaciones;
CREATE POLICY "Players see own notifications"
  ON notificaciones FOR SELECT
  USING (auth.uid() = jugador_id);

-- Los jugadores pueden marcar como leídas SUS notificaciones
DROP POLICY IF EXISTS "Players update own notifications" ON notificaciones;
CREATE POLICY "Players update own notifications"
  ON notificaciones FOR UPDATE
  USING (auth.uid() = jugador_id)
  WITH CHECK (auth.uid() = jugador_id);

-- Cualquier usuario autenticado puede crear notificaciones
-- (necesario para que la app pueda enviar notificaciones)
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notificaciones;
CREATE POLICY "Authenticated users can create notifications"
  ON notificaciones FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ==================== GRUPOS ====================
-- Todos pueden ver grupos
DROP POLICY IF EXISTS "Anyone can view groups" ON grupos;
CREATE POLICY "Anyone can view groups"
  ON grupos FOR SELECT
  USING (true);

-- Solo admin puede crear/modificar/eliminar grupos
DROP POLICY IF EXISTS "Admin can manage groups" ON grupos;
CREATE POLICY "Admin can manage groups"
  ON grupos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM jugadores
      WHERE jugadores.id = auth.uid() AND jugadores.rol = 'admin'
    )
  );

-- ==================== GRUPO_JUGADORES ====================
DROP POLICY IF EXISTS "Anyone can view group players" ON grupo_jugadores;
CREATE POLICY "Anyone can view group players"
  ON grupo_jugadores FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin can manage group players" ON grupo_jugadores;
CREATE POLICY "Admin can manage group players"
  ON grupo_jugadores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM jugadores
      WHERE jugadores.id = auth.uid() AND jugadores.rol = 'admin'
    )
  );

-- ==================== PARTIDOS ====================
DROP POLICY IF EXISTS "Anyone can view matches" ON partidos;
CREATE POLICY "Anyone can view matches"
  ON partidos FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin can manage matches" ON partidos;
CREATE POLICY "Admin can manage matches"
  ON partidos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM jugadores
      WHERE jugadores.id = auth.uid() AND jugadores.rol = 'admin'
    )
  );

-- ==================== ENABLE RLS ====================
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupo_jugadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidos ENABLE ROW LEVEL SECURITY;
