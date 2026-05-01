import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Partido } from '../types/database';

// =============================================
// Types
// =============================================
export interface PartidoConDetalles extends Partido {
  torneo_nombre?: string;
  torneo_tipo?: string;
  local_nombre?: string;
  local_foto?: string | null;
  local_equipo?: string;
  local_escudo?: string | null;
  visitante_nombre?: string;
  visitante_foto?: string | null;
  visitante_equipo?: string;
  visitante_escudo?: string | null;
}

export interface EstadisticasJugador {
  totalPartidos: number;
  partidosJugados: number;
  victorias: number;
  empates: number;
  derrotas: number;
  golesFavor: number;
  golesContra: number;
  porcentajeVictorias: number;
  torneosActivos: number;
}

// =============================================
// Hook: useMisPartidos
// =============================================
export function useMisPartidos(jugadorId: string | undefined) {
  const [partidos, setPartidos] = useState<PartidoConDetalles[]>([]);
  const [stats, setStats] = useState<EstadisticasJugador>({
    totalPartidos: 0, partidosJugados: 0, victorias: 0, empates: 0,
    derrotas: 0, golesFavor: 0, golesContra: 0, porcentajeVictorias: 0, torneosActivos: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchPartidos = useCallback(async () => {
    if (!jugadorId) return;
    setLoading(true);

    try {
      // Get all matches where player is local or visitor
      const { data: localData } = await supabase
        .from('partidos')
        .select('*, torneos:torneo_id(nombre, tipo)')
        .eq('jugador_local_id', jugadorId)
        .order('created_at', { ascending: false });

      const { data: visitData } = await supabase
        .from('partidos')
        .select('*, torneos:torneo_id(nombre, tipo)')
        .eq('jugador_visitante_id', jugadorId)
        .order('created_at', { ascending: false });

      const allMatches = [...(localData || []), ...(visitData || [])];
      // Remove dupes and sort
      const unique = Array.from(new Map(allMatches.map((m) => [m.id, m])).values());
      unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Collect all player IDs to fetch names/photos
      const playerIds = new Set<string>();
      unique.forEach((m: any) => {
        playerIds.add(m.jugador_local_id);
        playerIds.add(m.jugador_visitante_id);
      });

      // Fetch player details
      let playerMap: Record<string, { nombre: string; foto_url: string | null }> = {};
      if (playerIds.size > 0) {
        const { data: players } = await supabase
          .from('jugadores')
          .select('id, nombre, foto_url')
          .in('id', Array.from(playerIds));
        if (players) {
          players.forEach((p: any) => { playerMap[p.id] = p; });
        }
      }

      // Fetch inscription/team details for each player per tournament
      const torneoIds = [...new Set(unique.map((m: any) => m.torneo_id))];
      let inscMap: Record<string, { equipo_nombre: string; equipo_escudo: string | null }> = {};
      if (torneoIds.length > 0) {
        const { data: inscs } = await supabase
          .from('torneo_inscripciones')
          .select('jugador_id, torneo_id, catalogos_equipos:catalogo_equipo_id(nombre, escudo_url)')
          .in('torneo_id', torneoIds);
        if (inscs) {
          inscs.forEach((i: any) => {
            const key = `${i.torneo_id}_${i.jugador_id}`;
            inscMap[key] = {
              equipo_nombre: i.catalogos_equipos?.nombre || '',
              equipo_escudo: i.catalogos_equipos?.escudo_url || null,
            };
          });
        }
      }

      // Map to detailed matches
      const detailed: PartidoConDetalles[] = unique.map((m: any) => {
        const localKey = `${m.torneo_id}_${m.jugador_local_id}`;
        const visitKey = `${m.torneo_id}_${m.jugador_visitante_id}`;
        return {
          ...m,
          torneo_nombre: m.torneos?.nombre,
          torneo_tipo: m.torneos?.tipo,
          local_nombre: playerMap[m.jugador_local_id]?.nombre,
          local_foto: playerMap[m.jugador_local_id]?.foto_url,
          local_equipo: inscMap[localKey]?.equipo_nombre || '',
          local_escudo: inscMap[localKey]?.equipo_escudo || null,
          visitante_nombre: playerMap[m.jugador_visitante_id]?.nombre,
          visitante_foto: playerMap[m.jugador_visitante_id]?.foto_url,
          visitante_equipo: inscMap[visitKey]?.equipo_nombre || '',
          visitante_escudo: inscMap[visitKey]?.equipo_escudo || null,
        };
      });

      setPartidos(detailed);

      // Calculate stats
      const finalizados = detailed.filter((p) => p.estado === 'finalizado');
      let v = 0, e = 0, d = 0, gf = 0, gc = 0;
      for (const p of finalizados) {
        if (p.goles_local === null || p.goles_visitante === null) continue;
        const isLocal = p.jugador_local_id === jugadorId;
        const myGoals = isLocal ? p.goles_local : p.goles_visitante;
        const theirGoals = isLocal ? p.goles_visitante : p.goles_local;
        gf += myGoals;
        gc += theirGoals;
        if (myGoals > theirGoals) v++;
        else if (myGoals === theirGoals) e++;
        else d++;
      }

      // Count active tournaments
      const { count } = await supabase
        .from('torneo_inscripciones')
        .select('*', { count: 'exact', head: true })
        .eq('jugador_id', jugadorId);

      setStats({
        totalPartidos: detailed.length,
        partidosJugados: finalizados.length,
        victorias: v,
        empates: e,
        derrotas: d,
        golesFavor: gf,
        golesContra: gc,
        porcentajeVictorias: finalizados.length > 0 ? Math.round((v / finalizados.length) * 100) : 0,
        torneosActivos: count || 0,
      });
    } catch (err) {
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  }, [jugadorId]);

  useEffect(() => {
    fetchPartidos();

    if (!jugadorId) return;
    const channel = supabase
      .channel(`mis-partidos-${jugadorId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => fetchPartidos())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPartidos, jugadorId]);

  return { partidos, stats, loading, refetch: fetchPartidos };
}

// =============================================
// Admin: Register match result
// =============================================
export async function registrarResultado(
  partidoId: string,
  golesLocal: number,
  golesVisitante: number
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('partidos')
    .update({
      goles_local: golesLocal,
      goles_visitante: golesVisitante,
      estado: 'finalizado' as const,
    })
    .eq('id', partidoId);

  return { error: error?.message || null };
}

// Admin: Reset match result
export async function resetearResultado(
  partidoId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('partidos')
    .update({
      goles_local: null,
      goles_visitante: null,
      estado: 'pendiente' as const,
    })
    .eq('id', partidoId);

  return { error: error?.message || null };
}
