import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
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
  isGuest: boolean;
  enterGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [jugador, setJugador] = useState<Jugador | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const mountedRef = useRef(true);

  // ─── Fetch jugador profile ───────────────────────────────────────────────
  const fetchJugador = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('jugadores')
        .select('*')
        .eq('id', userId)
        .single();
      if (data && mountedRef.current) setJugador(data as Jugador);
    } catch {
      // Silently ignore — profile may not exist yet right after signup
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (s?.user) await fetchJugador(s.user.id);
  }, [fetchJugador]);

  // ─── Helper para limpiar todo el estado ─────────────────────────────────
  const clearAuthState = useCallback(() => {
    setSession(null);
    setUser(null);
    setJugador(null);
    setIsGuest(false);
    localStorage.removeItem('torneitos-guest');
  }, []);

  const enterGuestMode = useCallback(() => {
    setIsGuest(true);
    localStorage.setItem('torneitos-guest', 'true');
  }, []);

  // ─── Bootstrap ───────────────────────────────────────────────────────────
  // CRÍTICO: primero lee getSession() para restaurar sesión del localStorage,
  // luego configura el listener solo para cambios FUTUROS.
  // Si hacemos lo contrario, el primer evento null del listener nos manda a invitado.
  useEffect(() => {
    mountedRef.current = true;

    // Timeout de seguridad: desbloquea la pantalla si algo falla
    const timeout = setTimeout(() => {
      if (mountedRef.current) setLoading(false);
    }, 6000);

    async function init() {
      try {
        // Supabase lee la sesión desde localStorage de forma sincrónica aquí
        const { data: { session: storedSession } } = await supabase.auth.getSession();

        if (!mountedRef.current) return;

        if (storedSession?.user) {
          // ✅ Sesión encontrada → restaurar sin pasar por login
          setSession(storedSession);
          setUser(storedSession.user);
          setIsGuest(false);
          localStorage.removeItem('torneitos-guest');
          // Cargar perfil en segundo plano (no bloquea la UI)
          fetchJugador(storedSession.user.id);
        } else {
          // Sin sesión activa → revisar si había modo invitado guardado
          const wasGuest = localStorage.getItem('torneitos-guest') === 'true';
          if (wasGuest) setIsGuest(true);
        }
      } catch (err) {
        console.error('[Auth] Error en init:', err);
      } finally {
        clearTimeout(timeout);
        if (mountedRef.current) setLoading(false);
      }
    }

    init();

    // Solo escucha eventos FUTUROS (login nuevo, logout, refresh automático de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        if (!mountedRef.current) return;

        if (event === 'SIGNED_OUT') {
          clearAuthState();
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          setSession(s);
          setUser(s?.user ?? null);
          if (s?.user) {
            setIsGuest(false);
            localStorage.removeItem('torneitos-guest');
            fetchJugador(s.user.id);
          }
        }
      }
    );

    return () => {
      mountedRef.current = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchJugador, clearAuthState]);

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
        isGuest,
        enterGuestMode,
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