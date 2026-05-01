-- ============================================================
-- TRIGGER: Crear perfil de jugador automáticamente al registrarse
-- ============================================================
-- Ejecuta este script en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Función que se ejecuta al crear un nuevo usuario en auth.users
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

-- Eliminar el trigger si ya existe (para poder recrearlo limpio)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear el trigger que dispara la función al registrar un usuario
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- VERIFICAR que el trigger existe:
-- ============================================================
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
