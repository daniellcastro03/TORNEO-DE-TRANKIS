import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase credentials not found. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  );
}

// ID estable de dispositivo para nombrar canales Realtime de forma única.
// Se genera una vez y se guarda en localStorage para que persista entre recargas.
function getDeviceId(): string {
  const key = 'torneitos-device-id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem(key, id);
  }
  return id;
}

export const DEVICE_ID = getDeviceId();

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      // localStorage: la sesión sobrevive recargas de página
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'torneitos-session',
      storage: window.localStorage,
    },
    realtime: {
      params: {
        // Evita que mensajes de Realtime se pierdan bajo alta carga
        eventsPerSecond: 10,
      },
    },
  }
);
