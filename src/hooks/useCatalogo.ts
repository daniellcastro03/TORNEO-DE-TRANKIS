import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { CatalogoEquipo, TipoTorneo } from '../types/database';

interface UseCatalogoOptions {
  tipo?: TipoTorneo;
  liga?: string;
  torneoId?: string; // To check which teams are already taken in a tournament
}

interface CatalogoState {
  equipos: CatalogoEquipo[];
  loading: boolean;
  error: string | null;
  equiposTomados: Set<string>; // IDs of teams already selected by other players
}

export function useCatalogo({ tipo, liga, torneoId }: UseCatalogoOptions = {}) {
  const [state, setState] = useState<CatalogoState>({
    equipos: [],
    loading: true,
    error: null,
    equiposTomados: new Set(),
  });

  const fetchEquipos = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      let query = supabase.from('catalogos_equipos').select('*');

      // Filter by tournament type
      if (tipo) {
        query = query.eq('tipo_torneo', tipo);
      }

      // Filter by league (for 'liga' type)
      if (liga) {
        query = query.eq('liga', liga);
      }

      // Order alphabetically
      query = query.order('nombre', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      // If tournament ID is provided, fetch taken teams
      let tomados = new Set<string>();
      if (torneoId) {
        const { data: inscripciones, error: inscError } = await supabase
          .from('torneo_inscripciones')
          .select('catalogo_equipo_id')
          .eq('torneo_id', torneoId)
          .in('estado', ['pendiente', 'confirmada']);

        if (!inscError && inscripciones) {
          tomados = new Set(inscripciones.map((i) => i.catalogo_equipo_id));
        }
      }

      setState({
        equipos: (data || []) as CatalogoEquipo[],
        loading: false,
        error: null,
        equiposTomados: tomados,
      });
    } catch (err: any) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err.message || 'Error al cargar equipos',
      }));
    }
  }, [tipo, liga, torneoId]);

  // Subscribe to realtime changes on inscriptions (detect taken teams)
  useEffect(() => {
    fetchEquipos();

    if (!torneoId) return;

    // Realtime subscription for tournament inscriptions
    const channel = supabase
      .channel(`inscripciones-${torneoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'torneo_inscripciones',
          filter: `torneo_id=eq.${torneoId}`,
        },
        () => {
          // Re-fetch when inscriptions change
          fetchEquipos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEquipos, torneoId]);

  return {
    ...state,
    refetch: fetchEquipos,
  };
}

// =====================
// ADMIN CRUD operations
// =====================

export async function crearEquipoCatalogo(
  equipo: Omit<CatalogoEquipo, 'id'>
): Promise<{ data: CatalogoEquipo | null; error: string | null }> {
  const { data, error } = await supabase
    .from('catalogos_equipos')
    .insert(equipo as any)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as CatalogoEquipo, error: null };
}

export async function actualizarEquipoCatalogo(
  id: string,
  updates: Partial<Omit<CatalogoEquipo, 'id'>>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('catalogos_equipos')
    .update(updates)
    .eq('id', id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function eliminarEquipoCatalogo(
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('catalogos_equipos')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function getEstadisticasCatalogo(): Promise<{
  champions: number;
  mundial: number;
  liga: number;
  libre: number;
  total: number;
}> {
  const { data, error } = await supabase
    .from('catalogos_equipos')
    .select('tipo_torneo');

  if (error || !data) return { champions: 0, mundial: 0, liga: 0, libre: 0, total: 0 };

  const stats = { champions: 0, mundial: 0, liga: 0, libre: 0, total: data.length };
  data.forEach((e: any) => {
    if (e.tipo_torneo in stats) {
      stats[e.tipo_torneo as keyof typeof stats]++;
    }
  });

  return stats;
}
