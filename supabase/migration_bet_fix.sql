-- ============================================================
-- MIGRACIÓN: Arreglar constraints faltantes en TRANKIS BET
-- EJECUTAR EN: https://supabase.com/dashboard/project/dbyxymdorrvbdvdziavy/sql/new
-- ============================================================

-- 1. Agregar UNIQUE constraint faltante en bet_partidos
ALTER TABLE public.bet_partidos
  DROP CONSTRAINT IF EXISTS bet_partidos_jornada_partido_unique;

ALTER TABLE public.bet_partidos
  ADD CONSTRAINT bet_partidos_jornada_partido_unique
  UNIQUE (jornada_id, liga_partido_id);

-- 2. Eliminar cuotas viejas de resultado_exacto (si existieran) y actualizar CHECK de mercado
DELETE FROM public.bet_cuotas WHERE mercado = 'resultado_exacto';

ALTER TABLE public.bet_cuotas
  DROP CONSTRAINT IF EXISTS bet_cuotas_mercado_check;

ALTER TABLE public.bet_cuotas
  ADD CONSTRAINT bet_cuotas_mercado_check
  CHECK (mercado IN ('1x2','goles_local','goles_visitante','total_goles'));

-- ============================================================
-- VERIFICACIÓN (opcional - puedes ejecutar esto después)
-- ============================================================
-- SELECT conname, contype FROM pg_constraint
-- WHERE conrelid = 'public.bet_partidos'::regclass;
