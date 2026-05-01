import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase credentials not found. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  );
}

// createClient sin genérico <Database> para evitar conflictos de tipos
// con la versión instalada de @supabase/supabase-js (PostgREST v12).
// La app funciona igual — solo se evitan errores de compilación.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,       // Guarda la sesión en localStorage
      autoRefreshToken: true,     // Renueva el token automáticamente
      detectSessionInUrl: true,   // Detecta token de confirmación en URL
      storageKey: 'torneitos-session',
    },
  }
);
