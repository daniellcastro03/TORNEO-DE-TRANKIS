-- ============================================================
-- TORNEITOS DE TRANKIS — RECREAR tablas de liga desde cero
-- EJECUTAR EN: https://supabase.com/dashboard/project/dbyxymdorrvbdvdziavy/sql/new
-- ============================================================

BEGIN;

-- Borrar en orden por dependencias
DROP TABLE IF EXISTS public.liga_partidos  CASCADE;
DROP TABLE IF EXISTS public.liga_jugadores CASCADE;
DROP TABLE IF EXISTS public.ligas          CASCADE;

-- Recrear ligas
CREATE TABLE public.ligas (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT         NOT NULL,
  estado      TEXT         NOT NULL DEFAULT 'configuracion'
                CHECK (estado IN ('configuracion', 'en_curso', 'finalizada')),
  ida_vuelta  BOOLEAN      NOT NULL DEFAULT false,
  created_by  UUID         NOT NULL REFERENCES public.jugadores(id),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Recrear liga_jugadores
CREATE TABLE public.liga_jugadores (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  liga_id     UUID         NOT NULL REFERENCES public.ligas(id) ON DELETE CASCADE,
  jugador_id  UUID         NOT NULL REFERENCES public.jugadores(id) ON DELETE CASCADE,
  division    TEXT         NOT NULL CHECK (division IN ('primera', 'segunda')),
  activo      BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (liga_id, jugador_id)
);

-- Recrear liga_partidos
CREATE TABLE public.liga_partidos (
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

-- Permisos completos a todos los roles relevantes
GRANT ALL ON TABLE public.ligas          TO postgres, anon, authenticated, service_role, authenticator;
GRANT ALL ON TABLE public.liga_jugadores TO postgres, anon, authenticated, service_role, authenticator;
GRANT ALL ON TABLE public.liga_partidos  TO postgres, anon, authenticated, service_role, authenticator;

-- RLS
ALTER TABLE public.ligas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liga_jugadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liga_partidos  ENABLE ROW LEVEL SECURITY;

-- Politicas: lectura publica
CREATE POLICY "ligas_select"          ON public.ligas          FOR SELECT USING (true);
CREATE POLICY "liga_jugadores_select" ON public.liga_jugadores FOR SELECT USING (true);
CREATE POLICY "liga_partidos_select"  ON public.liga_partidos  FOR SELECT USING (true);

-- Politicas: escritura solo admin
CREATE POLICY "ligas_admin"          ON public.ligas          FOR ALL
  USING (EXISTS (SELECT 1 FROM public.jugadores WHERE id = auth.uid() AND rol = 'admin'));
CREATE POLICY "liga_jugadores_admin" ON public.liga_jugadores FOR ALL
  USING (EXISTS (SELECT 1 FROM public.jugadores WHERE id = auth.uid() AND rol = 'admin'));
CREATE POLICY "liga_partidos_admin"  ON public.liga_partidos  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.jugadores WHERE id = auth.uid() AND rol = 'admin'));

-- Indices
CREATE INDEX idx_ligas_estado              ON public.ligas(estado);
CREATE INDEX idx_liga_jugadores_liga       ON public.liga_jugadores(liga_id);
CREATE INDEX idx_liga_jugadores_jugador    ON public.liga_jugadores(jugador_id);
CREATE INDEX idx_liga_partidos_liga        ON public.liga_partidos(liga_id);
CREATE INDEX idx_liga_partidos_competicion ON public.liga_partidos(liga_id, competicion);

COMMIT;

-- Forzar recarga del cache (fuera de la transacción)
SELECT pg_sleep(2);
NOTIFY pgrst, 'reload schema';
