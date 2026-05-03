import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type {
  Torneo,
  TorneoInscripcion,
  TipoTorneo,
  EstadoTorneo,
  CriteriosClasificacion,
  CatalogoEquipo,
  Jugador,
} from '../types/database';

// =============================================
// Extended types for joined queries
// =============================================
export interface InscripcionConDetalles extends TorneoInscripcion {
  jugador?: Jugador;
  catalogo_equipo?: CatalogoEquipo;
}

export interface TorneoConDetalles extends Torneo {
  inscripciones_count?: number;
  mi_inscripcion?: TorneoInscripcion | null;
}

// =============================================
// Hook: useTorneos — list all tournaments
// =============================================
export function useTorneos(filtroEstado?: EstadoTorneo) {
  const [torneos, setTorneos] = useState<TorneoConDetalles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTorneos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('torneos')
        .select('*, torneo_inscripciones(count)')
        .order('created_at', { ascending: false });

      if (filtroEstado) {
        query = query.eq('estado', filtroEstado);
      }

      const { data, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      const mapped = (data || []).map((t: any) => ({
        ...t,
        inscripciones_count: t.torneo_inscripciones?.[0]?.count ?? 0,
      }));

      setTorneos(mapped);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filtroEstado]);

  useEffect(() => {
    fetchTorneos();

    // Realtime on torneos table
    const channel = supabase
      .channel('torneos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'torneos' }, () => {
        fetchTorneos();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchTorneos]);

  return { torneos, loading, error, refetch: fetchTorneos };
}

// =============================================
// Hook: useTorneoDetalle — single tournament
// =============================================
export function useTorneoDetalle(torneoId: string | undefined) {
  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [inscripciones, setInscripciones] = useState<InscripcionConDetalles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetalle = useCallback(async () => {
    if (!torneoId) return;
    setLoading(true);

    try {
      // Fetch tournament
      const { data: torneoData, error: tErr } = await supabase
        .from('torneos')
        .select('*')
        .eq('id', torneoId)
        .single();

      if (tErr) throw tErr;
      setTorneo(torneoData as Torneo);

      // Fetch inscriptions with player and team details
      const { data: inscData, error: iErr } = await supabase
        .from('torneo_inscripciones')
        .select('*, jugadores:jugador_id(*), catalogos_equipos:catalogo_equipo_id(*)')
        .eq('torneo_id', torneoId)
        .order('created_at', { ascending: true });

      if (iErr) throw iErr;

      const mapped = (inscData || []).map((i: any) => ({
        ...i,
        jugador: i.jugadores,
        catalogo_equipo: i.catalogos_equipos,
      }));

      setInscripciones(mapped);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [torneoId]);

  useEffect(() => {
    fetchDetalle();

    if (!torneoId) return;

    // Realtime on inscriptions for this tournament
    const channel = supabase
      .channel(`torneo-${torneoId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'torneo_inscripciones',
        filter: `torneo_id=eq.${torneoId}`,
      }, () => {
        fetchDetalle();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'torneos',
        filter: `id=eq.${torneoId}`,
      }, () => {
        fetchDetalle();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchDetalle, torneoId]);

  return { torneo, inscripciones, loading, error, refetch: fetchDetalle };
}

// =============================================
// CRUD Functions
// =============================================

const DEFAULT_CRITERIOS: CriteriosClasificacion = {
  orden: ['puntos', 'dif_goles', 'goles_favor', 'directo', 'sorteo'],
  puntos_victoria: 3,
  puntos_empate: 1,
  puntos_derrota: 0,
  clasificados_por_grupo: 2,
  hay_tercero_cuarto: false,
  ida_vuelta: false,
  partido_unico_eliminatorias: true,
};

export interface CrearTorneoInput {
  nombre: string;
  tipo: TipoTorneo;
  max_jugadores: number;
  permite_cambio_equipo: boolean;
  fecha_inicio?: string | null;
  criterios_json?: Partial<CriteriosClasificacion>;
  liga?: string;
}

export async function crearTorneo(
  input: CrearTorneoInput,
  userId: string
): Promise<{ data: Torneo | null; error: string | null }> {
  const criterios = { ...DEFAULT_CRITERIOS, ...(input.criterios_json || {}) };

  const { data, error } = await supabase
    .from('torneos')
    .insert({
      nombre: input.nombre,
      tipo: input.tipo,
      estado: 'borrador' as const,
      max_jugadores: input.max_jugadores,
      permite_cambio_equipo: input.permite_cambio_equipo,
      fecha_inicio: input.fecha_inicio || null,
      criterios_json: criterios as any,
      created_by: userId,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Torneo, error: null };
}

export async function actualizarTorneo(
  id: string,
  updates: Partial<Pick<Torneo, 'nombre' | 'estado' | 'max_jugadores' | 'permite_cambio_equipo' | 'criterios_json' | 'fecha_inicio'>>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('torneos')
    .update(updates as any)
    .eq('id', id);

  return { error: error?.message || null };
}

export async function cambiarEstadoTorneo(
  id: string,
  nuevoEstado: EstadoTorneo
): Promise<{ error: string | null }> {
  return actualizarTorneo(id, { estado: nuevoEstado });
}

export async function eliminarTorneo(
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('torneos').delete().eq('id', id);
  return { error: error?.message || null };
}

export async function habilitarFecha(
  torneoId: string,
  fecha: string
): Promise<{ error: string | null }> {
  const { data: torneo, error: tErr } = await supabase
    .from('torneos')
    .select('criterios_json')
    .eq('id', torneoId)
    .single();

  if (tErr) return { error: tErr.message };

  const criterios = torneo.criterios_json || {};
  const habilitadas = criterios.fechas_habilitadas || [];
  
  if (!habilitadas.includes(fecha)) {
    criterios.fechas_habilitadas = [...habilitadas, fecha];
    const { error } = await supabase
      .from('torneos')
      .update({ criterios_json: criterios })
      .eq('id', torneoId);
    return { error: error?.message || null };
  }
  
  return { error: null };
}

// =============================================
// Inscription Functions
// =============================================

export async function inscribirJugador(
  torneoId: string,
  jugadorId: string,
  catalogoEquipoId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('torneo_inscripciones')
    .insert({
      torneo_id: torneoId,
      jugador_id: jugadorId,
      catalogo_equipo_id: catalogoEquipoId,
      estado: 'pendiente' as const,
    });

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      if (error.message.includes('torneo_id') && error.message.includes('jugador_id')) {
        return { error: 'Ya estás inscrito en este torneo' };
      }
      if (error.message.includes('catalogo_equipo_id')) {
        return { error: 'Este equipo ya fue tomado por otro jugador' };
      }
    }
    return { error: error.message };
  }
  return { error: null };
}

export async function cambiarEquipoInscripcion(
  inscripcionId: string,
  nuevoCatalogoEquipoId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('torneo_inscripciones')
    .update({ catalogo_equipo_id: nuevoCatalogoEquipoId })
    .eq('id', inscripcionId);

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return { error: 'Este equipo ya fue tomado por otro jugador' };
    }
    return { error: error.message };
  }
  return { error: null };
}

export async function cancelarInscripcion(
  inscripcionId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('torneo_inscripciones')
    .delete()
    .eq('id', inscripcionId);

  return { error: error?.message || null };
}

export async function getMiInscripcion(
  torneoId: string,
  jugadorId: string
): Promise<TorneoInscripcion | null> {
  const { data } = await supabase
    .from('torneo_inscripciones')
    .select('*')
    .eq('torneo_id', torneoId)
    .eq('jugador_id', jugadorId)
    .single();

  return (data as TorneoInscripcion) || null;
}
