import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Grupo, GrupoJugador, Partido } from '../types/database';
import { notificarJugadores } from './useNotificaciones';

// =============================================
// Extended types
// =============================================
export interface GrupoConJugadores extends Grupo {
  jugadores: GrupoJugadorConDetalles[];
}

export interface GrupoJugadorConDetalles extends GrupoJugador {
  jugador_nombre?: string;
  jugador_foto?: string | null;
  equipo_nombre?: string;
  equipo_escudo?: string | null;
}

export interface ClasificacionRow {
  jugador_id: string;
  jugador_nombre: string;
  jugador_foto: string | null;
  equipo_nombre: string;
  equipo_escudo: string | null;
  pj: number; // played
  pg: number; // won
  pe: number; // drawn
  pp: number; // lost
  gf: number; // goals for
  gc: number; // goals against
  dg: number; // goal diff
  pts: number; // points
  posicion: number;
}

// =============================================
// Hook: useGrupos — groups for a tournament
// =============================================
export function useGrupos(torneoId: string | undefined) {
  const [grupos, setGrupos] = useState<GrupoConJugadores[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGrupos = useCallback(async () => {
    if (!torneoId) return;
    setLoading(true);

    try {
      // Fetch groups
      const { data: gruposData, error: gErr } = await supabase
        .from('grupos')
        .select('*')
        .eq('torneo_id', torneoId)
        .order('nombre', { ascending: true });

      if (gErr) throw gErr;

      // Fetch group players with details
      const grupoIds = (gruposData || []).map((g: any) => g.id);

      let jugadoresMap: Record<string, GrupoJugadorConDetalles[]> = {};

      if (grupoIds.length > 0) {
        const { data: gjData, error: gjErr } = await supabase
          .from('grupo_jugadores')
          .select(`
            *,
            jugadores:jugador_id (nombre, foto_url),
            torneo_inscripciones!inner (
              catalogo_equipo_id,
              catalogos_equipos:catalogo_equipo_id (nombre, escudo_url)
            )
          `)
          .in('grupo_id', grupoIds);

        // Fallback: simpler query if the join fails
        if (gjErr) {
          const { data: simpleGj } = await supabase
            .from('grupo_jugadores')
            .select('*, jugadores:jugador_id (nombre, foto_url)')
            .in('grupo_id', grupoIds);

          if (simpleGj) {
            for (const gj of simpleGj as any[]) {
              const grupoId = gj.grupo_id;
              if (!jugadoresMap[grupoId]) jugadoresMap[grupoId] = [];
              jugadoresMap[grupoId].push({
                ...gj,
                jugador_nombre: gj.jugadores?.nombre,
                jugador_foto: gj.jugadores?.foto_url,
                equipo_nombre: '',
                equipo_escudo: null,
              });
            }
          }
        } else if (gjData) {
          for (const gj of gjData as any[]) {
            const grupoId = gj.grupo_id;
            if (!jugadoresMap[grupoId]) jugadoresMap[grupoId] = [];

            // Navigate through the join
            const inscripcion = Array.isArray(gj.torneo_inscripciones)
              ? gj.torneo_inscripciones[0]
              : gj.torneo_inscripciones;
            const equipo = inscripcion?.catalogos_equipos;

            jugadoresMap[grupoId].push({
              ...gj,
              jugador_nombre: gj.jugadores?.nombre,
              jugador_foto: gj.jugadores?.foto_url,
              equipo_nombre: equipo?.nombre || '',
              equipo_escudo: equipo?.escudo_url || null,
            });
          }
        }
      }

      const gruposCompletos: GrupoConJugadores[] = (gruposData || []).map((g: any) => ({
        ...g,
        jugadores: jugadoresMap[g.id] || [],
      }));

      setGrupos(gruposCompletos);

      // Fetch matches for this tournament
      const { data: partidosData } = await supabase
        .from('partidos')
        .select('*')
        .eq('torneo_id', torneoId)
        .order('created_at', { ascending: true });

      setPartidos((partidosData || []) as Partido[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [torneoId]);

  useEffect(() => {
    fetchGrupos();

    if (!torneoId) return;

    // Unique suffix per device/tab to avoid Realtime channel conflicts
    const sessionId = Math.random().toString(36).slice(2, 8);

    const channel = supabase
      .channel(`grupos-${torneoId}-${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grupos', filter: `torneo_id=eq.${torneoId}` }, () => fetchGrupos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos', filter: `torneo_id=eq.${torneoId}` }, () => fetchGrupos())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchGrupos, torneoId]);

  return { grupos, partidos, loading, error, refetch: fetchGrupos };
}

// =============================================
// Calculate classification table
// =============================================
export function calcularClasificacion(
  grupo: GrupoConJugadores,
  partidos: Partido[],
  ptsVictoria = 3,
  ptsEmpate = 1
): ClasificacionRow[] {
  const grupoPartidos = partidos.filter(
    (p) => p.grupo_id === grupo.id && p.estado === 'finalizado'
  );

  const rows: ClasificacionRow[] = grupo.jugadores.map((gj) => ({
    jugador_id: gj.jugador_id,
    jugador_nombre: gj.jugador_nombre || 'Jugador',
    jugador_foto: gj.jugador_foto || null,
    equipo_nombre: gj.equipo_nombre || '',
    equipo_escudo: gj.equipo_escudo || null,
    pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0, posicion: 0,
  }));

  for (const p of grupoPartidos) {
    if (p.goles_local === null || p.goles_visitante === null) continue;

    const local = rows.find((r) => r.jugador_id === p.jugador_local_id);
    const visitante = rows.find((r) => r.jugador_id === p.jugador_visitante_id);

    if (local) {
      local.pj++;
      local.gf += p.goles_local;
      local.gc += p.goles_visitante;

      if (p.goles_local > p.goles_visitante) {
        local.pg++;
        local.pts += ptsVictoria;
      } else if (p.goles_local === p.goles_visitante) {
        local.pe++;
        local.pts += ptsEmpate;
      } else {
        local.pp++;
      }
    }

    if (visitante) {
      visitante.pj++;
      visitante.gf += p.goles_visitante;
      visitante.gc += p.goles_local;

      if (p.goles_visitante > p.goles_local) {
        visitante.pg++;
        visitante.pts += ptsVictoria;
      } else if (p.goles_visitante === p.goles_local) {
        visitante.pe++;
        visitante.pts += ptsEmpate;
      } else {
        visitante.pp++;
      }
    }
  }

  // Calculate goal difference
  for (const r of rows) {
    r.dg = r.gf - r.gc;
  }

  // Sort: points > goal diff > goals for
  rows.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.jugador_nombre.localeCompare(b.jugador_nombre);
  });

  // Assign positions
  rows.forEach((r, i) => { r.posicion = i + 1; });

  return rows;
}

// =============================================
// Admin: Sort groups + generate matches
// =============================================
export async function sortearGrupos(
  torneoId: string,
  numGrupos: number,
  jugadorIds: string[]
): Promise<{ error: string | null }> {
  try {
    // Get tournament config
    const { data: torneo, error: tErr } = await supabase
      .from('torneos')
      .select('criterios_json')
      .eq('id', torneoId)
      .single();
    if (tErr) throw tErr;

    const criterios = torneo.criterios_json || {};
    criterios.fechas_habilitadas = ['1']; // Habilitar la Fecha 1 inicialmente

    // Actualizar el torneo con la nueva config de fechas
    await supabase.from('torneos').update({ criterios_json: criterios }).eq('id', torneoId);

    // Shuffle players
    const shuffled = [...jugadorIds].sort(() => Math.random() - 0.5);

    // Distribute into groups
    const groupNames = 'ABCDEFGHIJKLMNOP'.split('');
    const gruposData: { nombre: string; jugadores: string[] }[] = [];

    for (let i = 0; i < numGrupos; i++) {
      gruposData.push({ nombre: `Grupo ${groupNames[i]}`, jugadores: [] });
    }

    shuffled.forEach((jId, index) => {
      gruposData[index % numGrupos].jugadores.push(jId);
    });

    // Create groups in DB
    for (const g of gruposData) {
      const { data: grupo, error: gErr } = await supabase
        .from('grupos')
        .insert({ torneo_id: torneoId, nombre: g.nombre })
        .select()
        .single();

      if (gErr) throw gErr;

      // Add players to group
      const gjInserts = g.jugadores.map((jId) => ({
        grupo_id: (grupo as any).id,
        jugador_id: jId,
      }));

      const { error: gjErr } = await supabase
        .from('grupo_jugadores')
        .insert(gjInserts);

      if (gjErr) throw gjErr;

      // Generate round-robin matches
      const matchInserts = generateRoundRobin(
        g.jugadores,
        torneoId,
        (grupo as any).id
      );

      if (matchInserts.length > 0) {
        const { error: mErr } = await supabase
          .from('partidos')
          .insert(matchInserts);

        if (mErr) throw mErr;
      }
    }

    // Notify all players about their group
    for (const g of gruposData) {
      await notificarJugadores(
        g.jugadores,
        'grupo',
        `Tu grupo es el ${g.nombre.replace('Grupo ', '')}`,
        `Has sido asignado al ${g.nombre}. ¡Entra para ver tus rivales!`
      );
    }

    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}

function generateRoundRobin(
  jugadorIds: string[],
  torneoId: string,
  grupoId: string
): any[] {
  const matches: any[] = [];
  const players = [...jugadorIds];
  
  if (players.length % 2 !== 0) {
    players.push('BYE');
  }
  
  const n = players.length;
  
  for (let round = 1; round <= n - 1; round++) {
    for (let i = 0; i < n / 2; i++) {
      const local = players[i];
      const visitante = players[n - 1 - i];
      
      if (local !== 'BYE' && visitante !== 'BYE') {
        matches.push({
          torneo_id: torneoId,
          grupo_id: grupoId,
          jugador_local_id: local,
          jugador_visitante_id: visitante,
          goles_local: null,
          goles_visitante: null,
          estado: 'pendiente' as const,
          fase: 'grupos' as const,
          fecha: round.toString(),
        });
      }
    }
    // Rotar para la siguiente fecha (mantener el primero fijo)
    const last = players.pop()!;
    players.splice(1, 0, last);
  }

  return matches;
}

// Admin: Delete all groups for a tournament (reset)
export async function eliminarGrupos(
  torneoId: string
): Promise<{ error: string | null }> {
  // Delete ALL matches (groups + knockout phases)
  await supabase.from('partidos').delete().eq('torneo_id', torneoId);
  // Delete group players (cascade from groups)
  const { error } = await supabase.from('grupos').delete().eq('torneo_id', torneoId);
  return { error: error?.message || null };
}
