import { supabase } from '../lib/supabase';
import { notificarJugadores } from './useNotificaciones';
import { calcularClasificacion, type GrupoConJugadores, type ClasificacionRow } from './useGrupos';
import type { Partido, FasePartido } from '../types/database';

// =============================================
// Smart group distribution + World Cup bracket
// =============================================

export interface BracketConfig {
  numGrupos: number;
  jugadoresPorGrupo: number[];
  clasificadosPorGrupo: number;
  mejoresTerceros: number;
  totalClasificados: number;
  faseInicial: FasePartido;
}

// Calculate optimal group distribution
export function calcularDistribucion(numJugadores: number): BracketConfig {
  if (numJugadores < 4) {
    return { numGrupos: 1, jugadoresPorGrupo: [numJugadores], clasificadosPorGrupo: 2, mejoresTerceros: 0, totalClasificados: 2, faseInicial: 'final' };
  }

  // Target groups of 4 players
  const numGrupos = Math.max(2, Math.ceil(numJugadores / 4));
  const base = Math.floor(numJugadores / numGrupos);
  const extra = numJugadores % numGrupos;
  const jugadoresPorGrupo = Array(numGrupos).fill(base).map((b, i) => i < extra ? b + 1 : b);

  // Determine knockout size (nearest power of 2)
  const top2 = numGrupos * 2;
  let targetKnockout: number;
  if (top2 <= 4) targetKnockout = 4;
  else if (top2 <= 8) targetKnockout = 8;
  else if (top2 <= 16) targetKnockout = 16;
  else targetKnockout = 32;

  const mejoresTerceros = Math.max(0, targetKnockout - top2);
  const totalClasificados = top2 + mejoresTerceros;

  let faseInicial: FasePartido;
  if (totalClasificados <= 2) faseInicial = 'final';
  else if (totalClasificados <= 4) faseInicial = 'semifinal';
  else if (totalClasificados <= 8) faseInicial = 'cuartos';
  else faseInicial = 'octavos';

  return { numGrupos, jugadoresPorGrupo, clasificadosPorGrupo: 2, mejoresTerceros, totalClasificados, faseInicial };
}

// Get classified players from groups (World Cup style)
export function obtenerClasificados(
  grupos: GrupoConJugadores[],
  partidos: Partido[],
  config: BracketConfig,
  ptsVictoria = 3,
  ptsEmpate = 1
): { primeros: ClasificacionRow[]; segundos: ClasificacionRow[]; mejoresTerceros: ClasificacionRow[] } {
  const tablas = grupos.map((g) => calcularClasificacion(g, partidos, ptsVictoria, ptsEmpate));

  const primeros = tablas.map((t) => t[0]).filter(Boolean);
  const segundos = tablas.map((t) => t[1]).filter(Boolean);

  // Best 3rd places
  const terceros = tablas.map((t) => t[2]).filter(Boolean);
  terceros.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    return b.gf - a.gf;
  });
  const mejoresTerceros = terceros.slice(0, config.mejoresTerceros);

  return { primeros, segundos, mejoresTerceros };
}

// World Cup bracket seeding: A1 vs B2, C1 vs D2...
export function generarCrucesMundial(
  primeros: ClasificacionRow[],
  segundos: ClasificacionRow[],
  mejoresTerceros: ClasificacionRow[],
  config: BracketConfig
): { local: ClasificacionRow; visitante: ClasificacionRow }[] {
  const _all = [...primeros, ...segundos, ...mejoresTerceros];
  const n = config.totalClasificados;

  if (n <= 2) {
    return [{ local: primeros[0], visitante: segundos[0] || mejoresTerceros[0] }];
  }

  // World Cup seeding: cross groups
  const cruces: { local: ClasificacionRow; visitante: ClasificacionRow }[] = [];
  const _numGrupos = primeros.length;

  if (n === 4) {
    // Semis: A1 vs B2, B1 vs A2
    cruces.push({ local: primeros[0], visitante: segundos[1] || mejoresTerceros[0] });
    cruces.push({ local: primeros[1], visitante: segundos[0] });
  } else if (n === 8) {
    // Quarters - cross pattern
    const p = primeros, s = segundos, mt = mejoresTerceros;
    const pool2 = [...s, ...mt]; // fill if needed
    cruces.push({ local: p[0], visitante: pool2[1] || pool2[0] }); // A1 vs B2
    cruces.push({ local: p[2], visitante: pool2[3] || pool2[2] || pool2[0] }); // C1 vs D2
    cruces.push({ local: p[1], visitante: pool2[0] }); // B1 vs A2
    cruces.push({ local: p[3] || mt[0] || p[0], visitante: pool2[2] || pool2[1] }); // D1 vs C2
  } else {
    // Round of 16 - FIFA World Cup style
    const p = primeros, s = segundos, mt = mejoresTerceros;
    const pool2 = [...s, ...mt];
    // Left bracket
    cruces.push({ local: p[0], visitante: pool2[1] });  // A1 vs B2
    cruces.push({ local: p[2], visitante: pool2[3] });  // C1 vs D2
    cruces.push({ local: p[4], visitante: pool2[5] || mt[0] || pool2[0] }); // E1 vs F2
    cruces.push({ local: p[6], visitante: pool2[7] || mt[1] || pool2[1] }); // G1 vs H2
    // Right bracket
    cruces.push({ local: p[1], visitante: pool2[0] });  // B1 vs A2
    cruces.push({ local: p[3], visitante: pool2[2] });  // D1 vs C2
    cruces.push({ local: p[5] || mt[0], visitante: pool2[4] || pool2[0] }); // F1 vs E2
    cruces.push({ local: p[7] || mt[1], visitante: pool2[6] || pool2[1] }); // H1 vs G2
  }

  return cruces.filter((c) => c.local && c.visitante);
}

// Generate knockout matches in DB
export async function generarFaseEliminatoria(
  torneoId: string,
  cruces: { local: ClasificacionRow; visitante: ClasificacionRow }[],
  fase: FasePartido
): Promise<{ error: string | null }> {
  try {
    const inserts = cruces.map((c) => ({
      torneo_id: torneoId,
      grupo_id: null,
      jugador_local_id: c.local.jugador_id,
      jugador_visitante_id: c.visitante.jugador_id,
      goles_local: null,
      goles_visitante: null,
      estado: 'pendiente' as const,
      fase,
    }));

    const { error } = await supabase.from('partidos').insert(inserts);
    if (error) throw error;

    // Notify players
    const playerIds = cruces.flatMap((c) => [c.local.jugador_id, c.visitante.jugador_id]);
    const faseLabel = fase === 'octavos' ? 'Octavos de Final' : fase === 'cuartos' ? 'Cuartos de Final' : fase === 'semifinal' ? 'Semifinal' : 'Final';
    await notificarJugadores([...new Set(playerIds)], 'cruce', `🏟️ ${faseLabel}`, `¡Clasificaste a ${faseLabel}! Revisa tu rival.`);

    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}

// Advance winners to next round
export async function avanzarFase(
  torneoId: string,
  partidos: Partido[],
  faseActual: FasePartido
): Promise<{ error: string | null }> {
  const fasePartidos = partidos.filter((p) => p.fase === faseActual && p.estado === 'finalizado');
  const pendientes = partidos.filter((p) => p.fase === faseActual && p.estado === 'pendiente');

  if (pendientes.length > 0) return { error: `Aún hay ${pendientes.length} partidos pendientes en esta fase` };
  if (fasePartidos.length === 0) return { error: 'No hay partidos en esta fase' };

  // Determine winners
  const ganadores: string[] = [];
  for (const p of fasePartidos) {
    if (p.goles_local === null || p.goles_visitante === null) continue;
    ganadores.push(p.goles_local > p.goles_visitante ? p.jugador_local_id : p.jugador_visitante_id);
  }

  // Next phase
  const FASE_SIGUIENTE: Record<string, FasePartido> = {
    octavos: 'cuartos', cuartos: 'semifinal', semifinal: 'final',
  };
  const siguiente = FASE_SIGUIENTE[faseActual];
  if (!siguiente) return { error: 'No hay fase siguiente (¡torneo terminado!)' };

  // Generate next round matches (pair winners)
  const cruces: any[] = [];
  for (let i = 0; i < ganadores.length; i += 2) {
    if (ganadores[i + 1]) {
      cruces.push({
        torneo_id: torneoId, grupo_id: null,
        jugador_local_id: ganadores[i], jugador_visitante_id: ganadores[i + 1],
        goles_local: null, goles_visitante: null,
        estado: 'pendiente' as const, fase: siguiente,
      });
    }
  }

  // Also create 3rd place match from semis
  if (faseActual === 'semifinal') {
    const perdedores: string[] = [];
    for (const p of fasePartidos) {
      if (p.goles_local === null || p.goles_visitante === null) continue;
      perdedores.push(p.goles_local <= p.goles_visitante ? p.jugador_local_id : p.jugador_visitante_id);
    }
    if (perdedores.length >= 2) {
      cruces.push({
        torneo_id: torneoId, grupo_id: null,
        jugador_local_id: perdedores[0], jugador_visitante_id: perdedores[1],
        goles_local: null, goles_visitante: null,
        estado: 'pendiente' as const, fase: 'tercer_puesto' as FasePartido,
      });
    }
  }

  if (cruces.length === 0) return { error: 'No se pudieron generar cruces' };

  const { error } = await supabase.from('partidos').insert(cruces);
  if (error) return { error: error.message };

  const faseLabel = siguiente === 'cuartos' ? 'Cuartos' : siguiente === 'semifinal' ? 'Semifinal' : 'Final';
  const ids = cruces.flatMap((c: any) => [c.jugador_local_id, c.jugador_visitante_id]);
  await notificarJugadores([...new Set(ids)], 'cruce', `🏟️ ${faseLabel}`, `¡Avanzaste a ${faseLabel}! Revisa tu próximo rival.`);

  return { error: null };
}
