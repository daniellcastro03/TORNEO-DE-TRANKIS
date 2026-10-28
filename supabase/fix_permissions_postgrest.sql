-- ============================================================
-- TORNEITOS DE TRANKIS — Fix Definitivo PostgREST y Permisos
-- EJECUTAR EN: https://supabase.com/dashboard/project/dbyxymdorrvbdvdziavy/sql/new
-- ============================================================

-- 1. Permisos para authenticator y todos los roles de Supabase
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role, authenticator;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role, authenticator;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role, authenticator;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role, authenticator;

-- 2. Asegurar dueño postgres (igual que las demás tablas)
ALTER TABLE IF EXISTS public.ligas OWNER TO postgres;
ALTER TABLE IF EXISTS public.liga_jugadores OWNER TO postgres;
ALTER TABLE IF EXISTS public.liga_partidos OWNER TO postgres;

-- 3. Desatascar y forzar recarga
SELECT pg_notification_queue_usage();
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- 4. Diagnóstico comparativo con torneos
SELECT 
  tablename, 
  tableowner, 
  has_table_privilege('anon', 'public.' || tablename, 'SELECT') as anon_select,
  has_table_privilege('authenticated', 'public.' || tablename, 'SELECT') as auth_select,
  has_table_privilege('authenticator', 'public.' || tablename, 'SELECT') as authenticator_select
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('ligas', 'liga_jugadores', 'liga_partidos', 'torneos');
