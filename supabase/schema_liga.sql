-- ============================================================
-- TORNEITOS DE TRANKIS — Liga Mode Schema
-- Premier League style: Primera / Segunda División + FA Cup
-- Run this in Supabase SQL Editor
-- ============================================================

SET search_path TO public;

-- 1. LIGAS (temporadas)
CREATE TABLE IF NOT EXISTS public.ligas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'configuracion'
    CHECK (estado IN ('configuracion', 'en_curso', 'finalizada')),
  ida_vuelta BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.jugadores(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. JUGADORES EN LIGA (con división)
CREATE TABLE IF NOT EXISTS public.liga_jugadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liga_id UUID NOT NULL REFERENCES public.ligas(id) ON DELETE CASCADE,
  jugador_id UUID NOT NULL REFERENCES public.jugadores(id) ON DELETE CASCADE,
  division TEXT NOT NULL CHECK (division IN ('primera', 'segunda')),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (liga_id, jugador_id)
);

-- 3. PARTIDOS DE LIGA (divisiones + FA Cup)
CREATE TABLE IF NOT EXISTS public.liga_partidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liga_id UUID NOT NULL REFERENCES public.ligas(id) ON DELETE CASCADE,
  competicion TEXT NOT NULL CHECK (competicion IN ('primera', 'segunda', 'fa_cup')),
  fase TEXT NOT NULL DEFAULT 'liga'
    CHECK (fase IN ('liga', 'ronda_32', 'ronda_16', 'octavos', 'cuartos', 'semifinal', 'final')),
  jornada INT,
  jugador_local_id UUID NOT NULL REFERENCES public.jugadores(id),
  jugador_visitante_id UUID NOT NULL REFERENCES public.jugadores(id),
  goles_local INT,
  goles_visitante INT,
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'finalizado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (jugador_local_id <> jugador_visitante_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ligas_estado ON public.ligas(estado);
CREATE INDEX IF NOT EXISTS idx_liga_jugadores_liga ON public.liga_jugadores(liga_id);
CREATE INDEX IF NOT EXISTS idx_liga_partidos_liga ON public.liga_partidos(liga_id);
CREATE INDEX IF NOT EXISTS idx_liga_partidos_competicion ON public.liga_partidos(liga_id, competicion);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.ligas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liga_jugadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liga_partidos ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas previas si ya existen
DROP POLICY IF EXISTS "ligas_select" ON public.ligas;
DROP POLICY IF EXISTS "ligas_admin" ON public.ligas;
DROP POLICY IF EXISTS "liga_jugadores_select" ON public.liga_jugadores;
DROP POLICY IF EXISTS "liga_jugadores_admin" ON public.liga_jugadores;
DROP POLICY IF EXISTS "liga_partidos_select" ON public.liga_partidos;
DROP POLICY IF EXISTS "liga_partidos_admin" ON public.liga_partidos;

-- LIGAS: lectura pública, administración exclusiva
CREATE POLICY "ligas_select" ON public.ligas FOR SELECT USING (true);
CREATE POLICY "ligas_admin" ON public.ligas FOR ALL USING (
  EXISTS (SELECT 1 FROM public.jugadores WHERE id = auth.uid() AND rol = 'admin')
);

-- LIGA_JUGADORES: lectura pública, administración exclusiva
CREATE POLICY "liga_jugadores_select" ON public.liga_jugadores FOR SELECT USING (true);
CREATE POLICY "liga_jugadores_admin" ON public.liga_jugadores FOR ALL USING (
  EXISTS (SELECT 1 FROM public.jugadores WHERE id = auth.uid() AND rol = 'admin')
);

-- LIGA_PARTIDOS: lectura pública, administración exclusiva
CREATE POLICY "liga_partidos_select" ON public.liga_partidos FOR SELECT USING (true);
CREATE POLICY "liga_partidos_admin" ON public.liga_partidos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.jugadores WHERE id = auth.uid() AND rol = 'admin')
);
