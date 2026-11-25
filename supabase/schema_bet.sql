-- ============================================================
-- TRANKIS BET — Schema de Apuestas (Ocio, sin dinero real)
-- EJECUTAR EN: https://supabase.com/dashboard/project/dbyxymdorrvbdvdziavy/sql/new
-- ============================================================

-- ── Jornada de apuestas (por liga) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.bet_jornadas (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  liga_id       UUID         NOT NULL REFERENCES public.ligas(id) ON DELETE CASCADE,
  nombre        TEXT         NOT NULL,                        -- Ej: "Jornada 5-6"
  descripcion   TEXT,
  activa        BOOLEAN      NOT NULL DEFAULT true,
  created_by    UUID         NOT NULL REFERENCES public.jugadores(id),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── Partidos disponibles para apostar en esa jornada ───────
CREATE TABLE IF NOT EXISTS public.bet_partidos (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id    UUID         NOT NULL REFERENCES public.bet_jornadas(id) ON DELETE CASCADE,
  liga_partido_id UUID       NOT NULL REFERENCES public.liga_partidos(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── Cuotas por partido y tipo de mercado ───────────────────
-- Tipos de mercado: '1x2', 'resultado_exacto', 'goles_local', 'goles_visitante', 'total_goles'
CREATE TABLE IF NOT EXISTS public.bet_cuotas (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_partido_id UUID        NOT NULL REFERENCES public.bet_partidos(id) ON DELETE CASCADE,
  mercado       TEXT         NOT NULL CHECK (mercado IN ('1x2','resultado_exacto','goles_local','goles_visitante','total_goles')),
  opcion        TEXT         NOT NULL,  -- '1'/'X'/'2' para 1x2, '2-1' para exacto, '+1.5'/'+2.5' para goles, etc.
  cuota         NUMERIC(6,2) NOT NULL DEFAULT 1.50,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (bet_partido_id, mercado, opcion)
);

-- ── Boleto/ticket del jugador ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.bet_boletos (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id    UUID         NOT NULL REFERENCES public.bet_jornadas(id) ON DELETE CASCADE,
  jugador_id    UUID         NOT NULL REFERENCES public.jugadores(id) ON DELETE CASCADE,
  monto         NUMERIC(8,2) NOT NULL DEFAULT 100.00,          -- Siempre 100 Lempiras
  cuota_total   NUMERIC(10,2) NOT NULL DEFAULT 1.00,           -- Producto de todas las cuotas
  ganancia_potencial NUMERIC(10,2) NOT NULL DEFAULT 100.00,
  estado        TEXT         NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente','ganado','perdido')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── Selecciones dentro del boleto ──────────────────────────
CREATE TABLE IF NOT EXISTS public.bet_selecciones (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  boleto_id     UUID         NOT NULL REFERENCES public.bet_boletos(id) ON DELETE CASCADE,
  bet_cuota_id  UUID         NOT NULL REFERENCES public.bet_cuotas(id) ON DELETE CASCADE,
  estado        TEXT         NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente','ganada','perdida')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (boleto_id, bet_cuota_id)
);

-- ── Índices ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bet_jornadas_liga ON public.bet_jornadas(liga_id);
CREATE INDEX IF NOT EXISTS idx_bet_partidos_jornada ON public.bet_partidos(jornada_id);
CREATE INDEX IF NOT EXISTS idx_bet_cuotas_partido ON public.bet_cuotas(bet_partido_id);
CREATE INDEX IF NOT EXISTS idx_bet_boletos_jornada ON public.bet_boletos(jornada_id);
CREATE INDEX IF NOT EXISTS idx_bet_boletos_jugador ON public.bet_boletos(jugador_id);
CREATE INDEX IF NOT EXISTS idx_bet_selecciones_boleto ON public.bet_selecciones(boleto_id);

-- ── Permisos ─────────────────────────────────────────────────
GRANT ALL ON TABLE public.bet_jornadas TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bet_partidos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bet_cuotas TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bet_boletos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bet_selecciones TO anon, authenticated, service_role;

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.bet_jornadas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bet_partidos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bet_cuotas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bet_boletos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bet_selecciones ENABLE ROW LEVEL SECURITY;

-- Jornadas: todos ven, solo admin modifica
DROP POLICY IF EXISTS "bet_jornadas_select" ON public.bet_jornadas;
DROP POLICY IF EXISTS "bet_jornadas_admin"  ON public.bet_jornadas;
CREATE POLICY "bet_jornadas_select" ON public.bet_jornadas FOR SELECT USING (true);
CREATE POLICY "bet_jornadas_admin"  ON public.bet_jornadas FOR ALL
  USING (EXISTS (SELECT 1 FROM public.jugadores WHERE id = auth.uid() AND rol = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.jugadores WHERE id = auth.uid() AND rol = 'admin'));

-- Partidos: todos ven, solo admin modifica
DROP POLICY IF EXISTS "bet_partidos_select" ON public.bet_partidos;
DROP POLICY IF EXISTS "bet_partidos_admin"  ON public.bet_partidos;
CREATE POLICY "bet_partidos_select" ON public.bet_partidos FOR SELECT USING (true);
CREATE POLICY "bet_partidos_admin"  ON public.bet_partidos FOR ALL
  USING (EXISTS (SELECT 1 FROM public.jugadores WHERE id = auth.uid() AND rol = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.jugadores WHERE id = auth.uid() AND rol = 'admin'));

-- Cuotas: todos ven, solo admin modifica
DROP POLICY IF EXISTS "bet_cuotas_select" ON public.bet_cuotas;
DROP POLICY IF EXISTS "bet_cuotas_admin"  ON public.bet_cuotas;
CREATE POLICY "bet_cuotas_select" ON public.bet_cuotas FOR SELECT USING (true);
CREATE POLICY "bet_cuotas_admin"  ON public.bet_cuotas FOR ALL
  USING (EXISTS (SELECT 1 FROM public.jugadores WHERE id = auth.uid() AND rol = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.jugadores WHERE id = auth.uid() AND rol = 'admin'));

-- Boletos: cada jugador ve solo los suyos; admin ve todos
DROP POLICY IF EXISTS "bet_boletos_select" ON public.bet_boletos;
DROP POLICY IF EXISTS "bet_boletos_insert" ON public.bet_boletos;
DROP POLICY IF EXISTS "bet_boletos_update_admin" ON public.bet_boletos;
CREATE POLICY "bet_boletos_select" ON public.bet_boletos FOR SELECT
  USING (jugador_id = auth.uid() OR EXISTS (SELECT 1 FROM public.jugadores WHERE id = auth.uid() AND rol = 'admin'));
CREATE POLICY "bet_boletos_insert" ON public.bet_boletos FOR INSERT
  WITH CHECK (jugador_id = auth.uid());
CREATE POLICY "bet_boletos_update_admin" ON public.bet_boletos FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.jugadores WHERE id = auth.uid() AND rol = 'admin'));

-- Selecciones: cada jugador ve solo las suyas; admin ve todas
DROP POLICY IF EXISTS "bet_selecciones_select" ON public.bet_selecciones;
DROP POLICY IF EXISTS "bet_selecciones_insert" ON public.bet_selecciones;
DROP POLICY IF EXISTS "bet_selecciones_update_admin" ON public.bet_selecciones;
CREATE POLICY "bet_selecciones_select" ON public.bet_selecciones FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.bet_boletos WHERE id = boleto_id AND jugador_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.jugadores WHERE id = auth.uid() AND rol = 'admin')
  );
CREATE POLICY "bet_selecciones_insert" ON public.bet_selecciones FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.bet_boletos WHERE id = boleto_id AND jugador_id = auth.uid()));
CREATE POLICY "bet_selecciones_update_admin" ON public.bet_selecciones FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.jugadores WHERE id = auth.uid() AND rol = 'admin'));
