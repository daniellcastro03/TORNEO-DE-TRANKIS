import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { Jugador, RolUsuario } from '../types/database';

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

  const fetchJugador = async (userId: string) => {
    const { data, error } = await supabase
      .from('jugadores')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setJugador(data as Jugador);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchJugador(user.id);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchJugador(s.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await fetchJugador(s.user.id);
        } else {
          setJugador(null);
        }
        setLoading(false);
      }
    );

    // Refresh profile when tab regains focus
    // This ensures role changes made via SQL Editor are picked up
    const handleFocus = () => {
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        if (s?.user) fetchJugador(s.user.id);
      });
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const signUp = async (email: string, password: string, nombre: string): Promise<{ error: string | null; needsConfirmation?: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) return { error: error.message };

    // When confirmation is needed, user exists but session is null
    const needsConfirmation = !!(data.user && !data.session);

    // Profile is created automatically by the DB trigger handle_new_user()
    // We just need to load it if the session is ready (no email confirmation required)
    if (data.user && !needsConfirmation) {
      // Wait a moment for the trigger to execute, then load the profile
      await new Promise((r) => setTimeout(r, 800));
      await fetchJugador(data.user.id);

      // Send welcome notification (best-effort, don't block on failure)
      try {
        await supabase.from('notificaciones').insert({
          jugador_id: data.user.id,
          tipo: 'inscripciones',
          titulo: '¡Bienvenido a Torneitos de Trankis! 🎮',
          cuerpo: `Hola ${nombre}, tu cuenta fue creada. ¡Explora los torneos y elige tu equipo!`,
          leida: false,
        });
      } catch {
        // Silently ignore — notification is not critical
      }
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
    setJugador(null);
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
