-- ============================================================
-- TORNEITOS DE TRANKIS — Reparar y Blindar Tablas de Liga
-- EJECUTAR EN: https://supabase.com/dashboard/project/dbyxymdorrvbdvdziavy/sql/new
-- ============================================================

-- 1. Permisos base de esquema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. Asegurar que las tablas existen
CREATE TABLE IF NOT EXISTS public.ligas (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT         NOT NULL,
  estado      TEXT         NOT NULL DEFAULT 'configuracion'
                CHECK (estado IN ('configuracion', 'en_curso', 'finalizada')),
  ida_vuelta  BOOLEAN      NOT NULL DEFAULT false,
  created_by  UUID         NOT NULL REFERENCES public.jugadores(id),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.liga_jugadores (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  liga_id     UUID         NOT NULL REFERENCES public.ligas(id) ON DELETE CASCADE,
  jugador_id  UUID         NOT NULL REFERENCES public.jugadores(id) ON DELETE CASCADE,
  division    TEXT         NOT NULL CHECK (division IN ('primera', 'segunda')),
  activo      BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (liga_id, jugador_id)
);

CREATE TABLE IF NOT EXISTS public.liga_partidos (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  liga_id              UUID         NOT NULL REFERENCES public.ligas(id) ON DELETE CASCADE,
  competicion          TEXT         NOT NULL CHECK (competicion IN ('primera', 'segunda', 'fa_cup')),
  fase                 TEXT         NOT NULL DEFAULT 'liga'
                         CHECK (fase IN ('liga', 'ronda_32', 'ronda_16', 'octavos', 'cuartos', 'semifinal', 'final')),
  jornada              INT,
  jugador_local_id     UUID         NOT NULL REFERENCES public.jugadores(id),
  jugador_visitante_id UUID         NOT NULL REFERENCES public.jugadores(id),
  goles_local          INT,
  goles_visitante      INT,
  estado               TEXT         NOT NULL DEFAULT 'pendiente'
                         CHECK (estado IN ('pendiente', 'finalizado')),
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CHECK (jugador_local_id <> jugador_visitante_id)
);

-- 3. Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_ligas_estado              ON public.ligas(estado);
CREATE INDEX IF NOT EXISTS idx_liga_jugadores_liga       ON public.liga_jugadores(liga_id);
CREATE INDEX IF NOT EXISTS idx_liga_jugadores_jugador    ON public.liga_jugadores(jugador_id);
CREATE INDEX IF NOT EXISTS idx_liga_partidos_liga        ON public.liga_partidos(liga_id);
CREATE INDEX IF NOT EXISTS idx_liga_partidos_competicion ON public.liga_partidos(liga_id, competicion);
CREATE INDEX IF NOT EXISTS idx_liga_partidos_estado      ON public.liga_partidos(liga_id, estado);

-- 4. CRÍTICO: Permisos explícitos a anon y authenticated (PostgREST los necesita para exponer las tablas en la API)
GRANT ALL ON TABLE public.ligas TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.liga_jugadores TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.liga_partidos TO anon, authenticated, service_role;

-- 5. Habilitar RLS
ALTER TABLE public.ligas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liga_jugadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liga_partidos  ENABLE ROW LEVEL SECURITY;

-- 6. Limpiar y recrear políticas RLS
DROP POLICY IF EXISTS "ligas_select"          ON public.ligas;
DROP POLICY IF EXISTS "ligas_insert"          ON public.ligas;
DROP POLICY IF EXISTS "ligas_update"          ON public.ligas;
DROP POLICY IF EXISTS "ligas_delete"          ON public.ligas;
DROP POLICY IF EXISTS "ligas_admin"           ON public.ligas;

DROP POLICY IF EXISTS "liga_jugadores_select" ON public.liga_jugadores;
DROP POLICY IF EXISTS "liga_jugadores_insert" ON public.liga_jugadores;
DROP POLICY IF EXISTS "liga_jugadores_update" ON public.liga_jugadores;
DROP POLICY IF EXISTS "liga_jugadores_delete" ON public.liga_jugadores;
DROP POLICY IF EXISTS "liga_jugadores_admin"  ON public.liga_jugadores;

DROP POLICY IF EXISTS "liga_partidos_select"  ON public.liga_partidos;
DROP POLICY IF EXISTS "liga_partidos_insert"  ON public.liga_partidos;
DROP POLICY IF EXISTS "liga_partidos_update"  ON public.liga_partidos;
DROP POLICY IF EXISTS "liga_partidos_delete"  ON public.liga_partidos;
DROP POLICY IF EXISTS "liga_partidos_admin"   ON public.liga_partidos;

-- Lectura pública (para que todos puedan consultar)
CREATE POLICY "ligas_select" ON public.ligas FOR SELECT USING (true);
CREATE POLICY "liga_jugadores_select" ON public.liga_jugadores FOR SELECT USING (true);
CREATE POLICY "liga_partidos_select" ON public.liga_partidos FOR SELECT USING (true);

-- Escritura solo admin
CREATE POLICY "ligas_admin" ON public.ligas FOR ALL USING (
  EXISTS (SELECT 1 FROM public.jugadores WHERE id = auth.uid() AND rol = 'admin')
);
CREATE POLICY "liga_jugadores_admin" ON public.liga_jugadores FOR ALL USING (
  EXISTS (SELECT 1 FROM public.jugadores WHERE id = auth.uid() AND rol = 'admin')
);
CREATE POLICY "liga_partidos_admin" ON public.liga_partidos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.jugadores WHERE id = auth.uid() AND rol = 'admin')
);

-- 7. RECARGAR EL SCHEMA CACHE DE POSTGREST
NOTIFY pgrst, 'reload schema';

-- 8. Verificación final
SELECT table_name, privilege_type, grantee 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name IN ('ligas', 'liga_jugadores', 'liga_partidos')
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee;
