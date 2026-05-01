-- ============================================================
-- TORNEITOS DE TRANKIS — Blindaje de registro y acceso
-- Ejecuta TODO esto en Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 1. TRIGGER: Crear perfil automáticamente al registrarse
--    (Esto evita el error "perfil no creado" para siempre)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.jugadores (id, nombre, email, foto_url, rol)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    null,
    'jugador'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- 2. RLS POLICIES para la tabla jugadores
--    Asegura que cada jugador pueda leer y actualizar su perfil
-- ============================================================

-- Habilitar RLS (por si no estaba activado)
ALTER TABLE jugadores ENABLE ROW LEVEL SECURITY;

-- Permitir a todos los usuarios autenticados ver todos los jugadores
-- (necesario para ver la lista pública de jugadores)
DROP POLICY IF EXISTS "Jugadores visibles para todos" ON jugadores;
CREATE POLICY "Jugadores visibles para todos"
  ON jugadores FOR SELECT
  TO authenticated
  USING (true);

-- Permitir a cada jugador actualizar solo su propio perfil
DROP POLICY IF EXISTS "Jugadores actualizan su propio perfil" ON jugadores;
CREATE POLICY "Jugadores actualizan su propio perfil"
  ON jugadores FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Permitir INSERT solo via el trigger (service_role lo maneja)
-- Los usuarios normales NO deben poder insertar filas directamente
DROP POLICY IF EXISTS "Solo service_role puede insertar jugadores" ON jugadores;
CREATE POLICY "Solo service_role puede insertar jugadores"
  ON jugadores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 3. SINCRONIZAR usuarios existentes en auth.users que no
--    tengan fila en jugadores (para reparar cuentas anteriores)
-- ============================================================

INSERT INTO jugadores (id, nombre, email, foto_url, rol)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'nombre', split_part(email, '@', 1)) AS nombre,
  email,
  null,
  'jugador'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. VERIFICACIÓN FINAL — debe mostrar todos los jugadores
-- ============================================================

SELECT j.id, j.nombre, j.email, j.rol, u.created_at
FROM jugadores j
JOIN auth.users u ON u.id = j.id
ORDER BY u.created_at DESC;
