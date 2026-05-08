-- ============================================================
-- FIX: Cambiar columna 'fecha' en partidos de TIMESTAMPTZ a TEXT
-- Esto permite almacenar números de jornada ("1", "2", "3")
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Cambiar el tipo de la columna fecha de TIMESTAMPTZ a TEXT
ALTER TABLE partidos
  ALTER COLUMN fecha TYPE TEXT USING (
    CASE
      WHEN fecha IS NULL THEN NULL
      ELSE fecha::TEXT
    END
  );

-- 2. Verificar el cambio
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'partidos' AND column_name = 'fecha';
