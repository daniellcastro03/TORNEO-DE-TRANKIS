-- ============================================================
-- Migración: Añadir sustituto_de_id a liga_jugadores
-- Ejecutar en Supabase SQL Editor si aún no existe la columna
-- ============================================================

ALTER TABLE public.liga_jugadores 
ADD COLUMN IF NOT EXISTS sustituto_de_id UUID REFERENCES public.jugadores(id) ON DELETE SET NULL;

