import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { Jugador } from '../types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  jugador: Jugador | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, nombre: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<Jugador, 'nombre' | 'foto_url'>>) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [jugador, setJugador] = useState<Jugador | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  // ─── Fetch jugador profile ───────────────────────────────────────────────
  const fetchJugador = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('jugadores')
        .select('*')
        .eq('id', userId)
        .single();
      if (data) setJugador(data as Jugador);
    } catch {
      // Silently ignore — profile may not exist yet right after signup
    }
  };

  const refreshProfile = async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (s?.user) await fetchJugador(s.user.id);
  };

  // ─── Helper para limpiar todo el estado ─────────────────────────────────
  const clearAuthState = () => {
    setSession(null);
    setUser(null);
    setJugador(null);
  };

  // ─── Bootstrap ──────────────────────────────────────────────────────────
  useEffect(() => {
    // Safety timeout: siempre desbloquea la pantalla después de 5s
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {

        // Manejar SIGNED_OUT explícitamente
        if (event === 'SIGNED_OUT') {
          clearAuthState();
          if (!initializedRef.current) {
            initializedRef.current = true;
            clearTimeout(timeout);
            setLoading(false);
          }
          return;
        }

        setSession(s);
        setUser(s?.user ?? null);

        // Desbloquear loading solo en el primer evento
        if (!initializedRef.current) {
          initializedRef.current = true;
          clearTimeout(timeout);
          setLoading(false);
        }

        if (s?.user) {
          await fetchJugador(s.user.id);
        } else {
          setJugador(null);
        }
      }
    );

    // Trigger inicial de sesión
    supabase.auth.getSession().catch(() => {
      if (!initializedRef.current) {
        initializedRef.current = true;
        clearTimeout(timeout);
        setLoading(false);
      }
    });

    // Sincronizar logout entre pestañas via localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'torneitos-session' && e.newValue === null) {
        clearAuthState();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Refresh profile cuando la pestaña recupera el foco
    const handleFocus = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s?.user) {
        fetchJugador(s.user.id);
      } else {
        // Token expiró o se cerró sesión en otra pestaña
        clearAuthState();
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // ─── Auth actions ────────────────────────────────────────────────────────
  const signUp = async (
    email: string,
    password: string,
    nombre: string
  ): Promise<{ error: string | null; needsConfirmation?: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) return { error: error.message };

    const needsConfirmation = !!(data.user && !data.session);

    if (data.user && !needsConfirmation) {
      await new Promise((r) => setTimeout(r, 800));
      await fetchJugador(data.user.id);

      try {
        await supabase.from('notificaciones').insert({
          jugador_id: data.user.id,
          tipo: 'inscripciones',
          titulo: '¡Bienvenido a Torneitos de Trankis! 🎮',
          cuerpo: `Hola ${nombre}, tu cuenta fue creada. ¡Explora los torneos y elige tu equipo!`,
          leida: false,
        });
      } catch { /* ignore */ }
    }

    return { error: null, needsConfirmation };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'Email o contraseña incorrectos' };
      }
      return { error: error.message };
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearAuthState();
  };

  const updateProfile = async (updates: Partial<Pick<Jugador, 'nombre' | 'foto_url'>>) => {
    if (!user) return { error: 'No autenticado' };
    const { error } = await supabase
      .from('jugadores')
      .update(updates)
      .eq('id', user.id);
    if (error) return { error: error.message };
    await fetchJugador(user.id);
    return { error: null };
  };

  const isAdmin = jugador?.rol === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        jugador,
        loading,
        isAdmin,
        signUp,
        signIn,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}