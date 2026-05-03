import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { TrofeoSalonFama, Jugador, Torneo } from '../types/database';

export function useSalonFama() {
  const [trofeos, setTrofeos] = useState<TrofeoSalonFama[]>([]);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [trofeosRes, jugadoresRes, torneosRes] = await Promise.all([
        supabase
          .from('salon_fama')
          .select('*, jugador:jugador_id(nombre, foto_url), torneo:torneo_id(nombre)')
          .order('created_at', { ascending: false }),
        supabase.from('jugadores').select('*').order('nombre'),
        supabase.from('torneos').select('*').order('created_at', { ascending: false })
      ]);

      if (trofeosRes.data) setTrofeos(trofeosRes.data as any[]);
      if (jugadoresRes.data) setJugadores(jugadoresRes.data as Jugador[]);
      if (torneosRes.data) setTorneos(torneosRes.data as Torneo[]);
    } catch (err) {
      console.error('Error fetching salon fama:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addTrofeo = async (trofeo: Omit<TrofeoSalonFama, 'id' | 'created_at' | 'jugador' | 'torneo'>) => {
    const { error } = await supabase.from('salon_fama').insert(trofeo);
    if (!error) {
      await fetchData();
    }
    return { error: error?.message || null };
  };

  const deleteTrofeo = async (id: string) => {
    const { error } = await supabase.from('salon_fama').delete().eq('id', id);
    if (!error) {
      setTrofeos(prev => prev.filter(t => t.id !== id));
    }
    return { error: error?.message || null };
  };

  return { trofeos, jugadores, torneos, loading, refetch: fetchData, addTrofeo, deleteTrofeo };
}
