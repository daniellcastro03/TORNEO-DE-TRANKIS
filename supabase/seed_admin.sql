-- ============================================================
-- TORNEITOS DE TRANKIS — Asignar rol de Administrador
-- ============================================================
-- Ejecuta este script en: Supabase Dashboard → SQL Editor
-- ============================================================

-- OPCIÓN A: Si ya te registraste desde la app
-- Cambia 'tu-email@ejemplo.com' por el email que usaste al registrarte
-- ============================================================

UPDATE jugadores
SET rol = 'admin'
WHERE email = 'daniellcastro036@gmail.com';

-- ============================================================
-- OPCIÓN B: Si prefieres ver y editar roles visualmente,
-- ve a: Supabase Dashboard → Table Editor → jugadores
-- Busca tu fila y cambia el campo "rol" de 'jugador' a 'admin'
-- ============================================================

-- ============================================================
-- VERIFICAR: muestra todos los jugadores y sus roles
-- ============================================================

SELECT id, nombre, email, rol, created_at
FROM jugadores
ORDER BY created_at;

-- ============================================================
-- QUITAR rol de admin a un jugador (si necesitas):
-- ============================================================

-- UPDATE jugadores SET rol = 'jugador' WHERE email = 'email@ejemplo.com';

-- ============================================================
-- NOTA: Después de ejecutar el UPDATE, el usuario debe
-- refrescar la página para que la app detecte el nuevo rol.
-- ============================================================
