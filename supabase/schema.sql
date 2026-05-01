-- ============================================================
-- TORNEITOS DE TRANKIS — Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. ENUMS
CREATE TYPE tipo_torneo AS ENUM ('champions', 'mundial', 'liga', 'libre');
CREATE TYPE estado_torneo AS ENUM ('borrador', 'inscripciones', 'en_curso', 'finalizado');
CREATE TYPE estado_partido AS ENUM ('pendiente', 'en_curso', 'finalizado');
CREATE TYPE fase_partido AS ENUM ('grupos', 'octavos', 'cuartos', 'semifinal', 'tercer_puesto', 'final');
CREATE TYPE estado_inscripcion AS ENUM ('pendiente', 'confirmada', 'rechazada');
CREATE TYPE tipo_notificacion AS ENUM ('cruce', 'grupo', 'resultado', 'recordatorio', 'inscripciones', 'equipo_confirmado');
CREATE TYPE rol_usuario AS ENUM ('admin', 'jugador');

-- 2. JUGADORES (linked to auth.users)
CREATE TABLE jugadores (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  foto_url TEXT,
  email TEXT NOT NULL UNIQUE,
  rol rol_usuario NOT NULL DEFAULT 'jugador',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. CATÁLOGOS DE EQUIPOS
CREATE TABLE catalogos_equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  escudo_url TEXT,
  tipo_torneo tipo_torneo NOT NULL,
  liga TEXT, -- For 'liga' type tournaments: 'la_liga', 'premier_league', etc.
  UNIQUE (nombre, tipo_torneo)
);

-- 4. EQUIPOS (1 jugador = 1 equipo permanente)
CREATE TABLE equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  escudo_url TEXT,
  jugador_id UUID NOT NULL UNIQUE REFERENCES jugadores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TORNEOS
CREATE TABLE torneos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo tipo_torneo NOT NULL,
  estado estado_torneo NOT NULL DEFAULT 'borrador',
  criterios_json JSONB NOT NULL DEFAULT '{
    "orden": ["puntos", "dif_goles", "goles_favor", "directo", "sorteo"],
    "puntos_victoria": 3,
    "puntos_empate": 1,
    "puntos_derrota": 0,
    "clasificados_por_grupo": 2,
    "hay_tercero_cuarto": false
  }'::jsonb,
  max_jugadores INT NOT NULL DEFAULT 16,
  permite_cambio_equipo BOOLEAN NOT NULL DEFAULT false,
  fecha_inicio TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES jugadores(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. INSCRIPCIONES A TORNEOS
CREATE TABLE torneo_inscripciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  torneo_id UUID NOT NULL REFERENCES torneos(id) ON DELETE CASCADE,
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  catalogo_equipo_id UUID NOT NULL REFERENCES catalogos_equipos(id),
  estado estado_inscripcion NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (torneo_id, jugador_id),
  UNIQUE (torneo_id, catalogo_equipo_id) -- One team per tournament
);

-- 7. GRUPOS
CREATE TABLE grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  torneo_id UUID NOT NULL REFERENCES torneos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  UNIQUE (torneo_id, nombre)
);

-- 8. JUGADORES EN GRUPOS
CREATE TABLE grupo_jugadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  UNIQUE (grupo_id, jugador_id)
);

-- 9. PARTIDOS
CREATE TABLE partidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  torneo_id UUID NOT NULL REFERENCES torneos(id) ON DELETE CASCADE,
  grupo_id UUID REFERENCES grupos(id) ON DELETE SET NULL,
  jugador_local_id UUID NOT NULL REFERENCES jugadores(id),
  jugador_visitante_id UUID NOT NULL REFERENCES jugadores(id),
  goles_local INT,
  goles_visitante INT,
  estado estado_partido NOT NULL DEFAULT 'pendiente',
  fase fase_partido NOT NULL DEFAULT 'grupos',
  fecha TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (jugador_local_id <> jugador_visitante_id)
);

-- 10. NOTIFICACIONES
CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  tipo tipo_notificacion NOT NULL,
  titulo TEXT NOT NULL,
  cuerpo TEXT NOT NULL,
  leida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. PUSH SUBSCRIPTIONS
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  keys_json JSONB NOT NULL
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_torneos_estado ON torneos(estado);
CREATE INDEX idx_partidos_torneo ON partidos(torneo_id);
CREATE INDEX idx_partidos_jugadores ON partidos(jugador_local_id, jugador_visitante_id);
CREATE INDEX idx_inscripciones_torneo ON torneo_inscripciones(torneo_id);
CREATE INDEX idx_notificaciones_jugador ON notificaciones(jugador_id, leida);
CREATE INDEX idx_grupo_jugadores_grupo ON grupo_jugadores(grupo_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE jugadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogos_equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE torneos ENABLE ROW LEVEL SECURITY;
ALTER TABLE torneo_inscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupo_jugadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- JUGADORES: anyone can read, users can update own profile
CREATE POLICY "jugadores_select" ON jugadores FOR SELECT USING (true);
CREATE POLICY "jugadores_insert" ON jugadores FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "jugadores_update" ON jugadores FOR UPDATE USING (auth.uid() = id);

-- CATÁLOGOS: anyone can read, only admins can modify
CREATE POLICY "catalogos_select" ON catalogos_equipos FOR SELECT USING (true);
CREATE POLICY "catalogos_admin_all" ON catalogos_equipos FOR ALL USING (
  EXISTS (SELECT 1 FROM jugadores WHERE id = auth.uid() AND rol = 'admin')
);

-- EQUIPOS: anyone can read, user manages own
CREATE POLICY "equipos_select" ON equipos FOR SELECT USING (true);
CREATE POLICY "equipos_own" ON equipos FOR ALL USING (auth.uid() = jugador_id);

-- TORNEOS: anyone can read, admins can manage
CREATE POLICY "torneos_select" ON torneos FOR SELECT USING (true);
CREATE POLICY "torneos_admin" ON torneos FOR ALL USING (
  EXISTS (SELECT 1 FROM jugadores WHERE id = auth.uid() AND rol = 'admin')
);

-- INSCRIPCIONES: anyone can read, users manage own
CREATE POLICY "inscripciones_select" ON torneo_inscripciones FOR SELECT USING (true);
CREATE POLICY "inscripciones_own" ON torneo_inscripciones FOR INSERT WITH CHECK (auth.uid() = jugador_id);
CREATE POLICY "inscripciones_update_own" ON torneo_inscripciones FOR UPDATE USING (auth.uid() = jugador_id);
CREATE POLICY "inscripciones_admin" ON torneo_inscripciones FOR ALL USING (
  EXISTS (SELECT 1 FROM jugadores WHERE id = auth.uid() AND rol = 'admin')
);

-- GRUPOS: everyone reads, admins manage
CREATE POLICY "grupos_select" ON grupos FOR SELECT USING (true);
CREATE POLICY "grupos_admin" ON grupos FOR ALL USING (
  EXISTS (SELECT 1 FROM jugadores WHERE id = auth.uid() AND rol = 'admin')
);

-- GRUPO_JUGADORES: everyone reads, admins manage
CREATE POLICY "gj_select" ON grupo_jugadores FOR SELECT USING (true);
CREATE POLICY "gj_admin" ON grupo_jugadores FOR ALL USING (
  EXISTS (SELECT 1 FROM jugadores WHERE id = auth.uid() AND rol = 'admin')
);

-- PARTIDOS: everyone reads, admins manage
CREATE POLICY "partidos_select" ON partidos FOR SELECT USING (true);
CREATE POLICY "partidos_admin" ON partidos FOR ALL USING (
  EXISTS (SELECT 1 FROM jugadores WHERE id = auth.uid() AND rol = 'admin')
);

-- NOTIFICACIONES: users see own only
CREATE POLICY "notif_own" ON notificaciones FOR SELECT USING (auth.uid() = jugador_id);
CREATE POLICY "notif_update" ON notificaciones FOR UPDATE USING (auth.uid() = jugador_id);
CREATE POLICY "notif_admin_insert" ON notificaciones FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM jugadores WHERE id = auth.uid() AND rol = 'admin')
  OR auth.uid() = jugador_id
);

-- PUSH_SUBSCRIPTIONS: users manage own
CREATE POLICY "push_own" ON push_subscriptions FOR ALL USING (auth.uid() = jugador_id);

-- ============================================================
-- STORAGE: Create avatar bucket
-- Run in Supabase Dashboard > Storage
-- ============================================================
-- Create bucket 'avatars' with public access
-- Or run:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
