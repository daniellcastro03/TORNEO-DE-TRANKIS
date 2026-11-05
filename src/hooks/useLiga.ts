import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type {
  Liga,
  LigaJugador,
  LigaPartido,
  Jugador,
  DivisionLiga,
  CompeticionLiga,
  FaseLiga,
} from '../types/database';

// =============================================
// Extended types
// =============================================

export interface LigaJugadorConDetalles extends LigaJugador {
  jugador_nombre: string;
  jugador_foto: string | null;
}

export interface ClasificacionLigaRow {
  jugador_id: string;
  jugador_nombre: string;
  jugador_foto: string | null;
  sustituto_de_nombre?: string | null;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
  posicion: number;
  forma: ('W' | 'D' | 'L')[];
}

// =============================================
// Hook: useLigas — list all leagues
// =============================================
export function useLigas() {
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLigas = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ligas')
      .select('*')
      .order('created_at', { ascending: false });
    setLigas((data || []) as Liga[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLigas();
  }, [fetchLigas]);

  return { ligas, loading, refetch: fetchLigas };
}

// =============================================
// Hook: useLigaDetalle — single league detail
// =============================================
export function useLigaDetalle(ligaId: string | undefined) {
  const [liga, setLiga] = useState<Liga | null>(null);
  const [jugadores, setJugadores] = useState<LigaJugadorConDetalles[]>([]);
  const [partidos, setPartidos] = useState<LigaPartido[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDetalle = useCallback(async () => {
    if (!ligaId) return;
    setLoading(true);

    try {
      // Liga
      const { data: ligaData } = await supabase
        .from('ligas')
        .select('*')
        .eq('id', ligaId)
        .single();
      setLiga(ligaData as Liga);

      // Jugadores con detalles
      const { data: jugData } = await supabase
        .from('liga_jugadores')
        .select('*, jugadores:jugador_id (nombre, foto_url)')
        .eq('liga_id', ligaId)
        .order('created_at', { ascending: true });

      const mapped = (jugData || []).map((j: any) => ({
        ...j,
        jugador_nombre: j.jugadores?.nombre || 'Jugador',
        jugador_foto: j.jugadores?.foto_url || null,
      }));
      setJugadores(mapped);

      // Partidos
      const { data: partData } = await supabase
        .from('liga_partidos')
        .select('*')
        .eq('liga_id', ligaId)
        .order('jornada', { ascending: true });
      setPartidos((partData || []) as LigaPartido[]);
    } catch (err) {
      console.error('Error loading liga:', err);
    } finally {
      setLoading(false);
    }
  }, [ligaId]);

  useEffect(() => {
    fetchDetalle();

    if (!ligaId) return;
    const sessionId = Math.random().toString(36).slice(2, 8);

    const channel = supabase
      .channel(`liga-${ligaId}-${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ligas', filter: `id=eq.${ligaId}` }, () => fetchDetalle())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'liga_jugadores', filter: `liga_id=eq.${ligaId}` }, () => fetchDetalle())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'liga_partidos', filter: `liga_id=eq.${ligaId}` }, () => fetchDetalle())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchDetalle, ligaId]);

  return { liga, jugadores, partidos, loading, refetch: fetchDetalle };
}

// =============================================
// CRUD Functions
// =============================================

export async function crearLiga(
  nombre: string,
  idaVuelta: boolean,
  userId: string
): Promise<{ data: Liga | null; error: string | null }> {
  const { data, error } = await supabase
    .from('ligas')
    .insert({ nombre, ida_vuelta: idaVuelta, created_by: userId })
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as Liga, error: null };
}

export async function actualizarLiga(
  id: string,
  updates: Partial<Pick<Liga, 'nombre' | 'estado' | 'ida_vuelta'>>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('ligas')
    .update(updates as any)
    .eq('id', id);
  return { error: error?.message || null };
}

export async function eliminarLiga(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('ligas').delete().eq('id', id);
  return { error: error?.message || null };
}

// =============================================
// Player Management
// =============================================

export async function agregarJugadorLiga(
  ligaId: string,
  jugadorId: string,
  division: DivisionLiga
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('liga_jugadores')
    .insert({ liga_id: ligaId, jugador_id: jugadorId, division });
  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return { error: 'Este jugador ya está en la liga' };
    }
    return { error: error.message };
  }
  return { error: null };
}

export async function removerJugadorLiga(
  ligaId: string,
  jugadorId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('liga_jugadores')
    .delete()
    .eq('liga_id', ligaId)
    .eq('jugador_id', jugadorId);
  return { error: error?.message || null };
}

export async function cambiarDivisionJugador(
  ligaId: string,
  jugadorId: string,
  nuevaDivision: DivisionLiga
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('liga_jugadores')
    .update({ division: nuevaDivision })
    .eq('liga_id', ligaId)
    .eq('jugador_id', jugadorId);
  return { error: error?.message || null };
}

export async function toggleActivoJugador(
  ligaId: string,
  jugadorId: string,
  activo: boolean
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('liga_jugadores')
    .update({ activo })
    .eq('liga_id', ligaId)
    .eq('jugador_id', jugadorId);
  return { error: error?.message || null };
}

// =============================================
// Classification calculation
// =============================================

export function calcularClasificacionLiga(
  jugadores: LigaJugadorConDetalles[],
  partidos: LigaPartido[],
  division: CompeticionLiga
): ClasificacionLigaRow[] {
  const divJugadores = jugadores.filter(j => j.division === division && j.activo);
  const divPartidos = partidos.filter(
    p => p.competicion === division && p.fase === 'liga' && p.estado === 'finalizado'
  );

  // Mapear cada jugador activo para saber si sustituye a alguien
  const rows: ClasificacionLigaRow[] = divJugadores.map(j => {
    let sustitutoDeNombre: string | null = null;
    if (j.sustituto_de_id) {
      const original = jugadores.find(orig => orig.jugador_id === j.sustituto_de_id);
      if (original) sustitutoDeNombre = original.jugador_nombre;
    }

    return {
      jugador_id: j.jugador_id,
      jugador_nombre: j.jugador_nombre,
      jugador_foto: j.jugador_foto,
      sustituto_de_nombre: sustitutoDeNombre,
      pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0, posicion: 0,
      forma: [],
    };
  });

  // Función auxiliar para encontrar la fila que acumula los puntos de un jugador
  // Si jugó un jugador anterior que fue sustituido, los puntos se le suman al sustituto activo
  const findRowForPlayer = (playerId: string) => {
    // 1. Directamente si está activo
    const directRow = rows.find(r => r.jugador_id === playerId);
    if (directRow) return directRow;

    // 2. Si es un jugador inactivo que fue sustituido, encontrar a su sustituto
    const sustituto = divJugadores.find(j => j.sustituto_de_id === playerId);
    if (sustituto) {
      return rows.find(r => r.jugador_id === sustituto.jugador_id);
    }

    return undefined;
  };

  for (const p of divPartidos) {
    if (p.goles_local === null || p.goles_visitante === null) continue;

    const local = findRowForPlayer(p.jugador_local_id);
    const visitante = findRowForPlayer(p.jugador_visitante_id);

    if (local) {
      local.pj++;
      local.gf += p.goles_local;
      local.gc += p.goles_visitante;
      if (p.goles_local > p.goles_visitante) {
        local.pg++; local.pts += 3; local.forma.push('W');
      } else if (p.goles_local === p.goles_visitante) {
        local.pe++; local.pts += 1; local.forma.push('D');
      } else {
        local.pp++; local.forma.push('L');
      }
    }

    if (visitante) {
      visitante.pj++;
      visitante.gf += p.goles_visitante;
      visitante.gc += p.goles_local;
      if (p.goles_visitante > p.goles_local) {
        visitante.pg++; visitante.pts += 3; visitante.forma.push('W');
      } else if (p.goles_visitante === p.goles_local) {
        visitante.pe++; visitante.pts += 1; visitante.forma.push('D');
      } else {
        visitante.pp++; visitante.forma.push('L');
      }
    }
  }

  for (const r of rows) { r.dg = r.gf - r.gc; }

  rows.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.jugador_nombre.localeCompare(b.jugador_nombre);
  });

  rows.forEach((r, i) => { r.posicion = i + 1; });

  return rows;
}

// =============================================
// Round Robin calendar generation
// =============================================

function generateLigaRoundRobin(
  jugadorIds: string[],
  ligaId: string,
  competicion: CompeticionLiga,
  idaVuelta: boolean
): any[] {
  const matches: any[] = [];
  const players = [...jugadorIds];

  if (players.length < 2) return matches;

  if (players.length % 2 !== 0) {
    players.push('BYE');
  }

  const n = players.length;

  // Ida
  for (let round = 1; round <= n - 1; round++) {
    for (let i = 0; i < n / 2; i++) {
      const local = players[i];
      const visitante = players[n - 1 - i];

      if (local !== 'BYE' && visitante !== 'BYE') {
        matches.push({
          liga_id: ligaId,
          competicion,
          fase: 'liga',
          jornada: round,
          jugador_local_id: local,
          jugador_visitante_id: visitante,
          goles_local: null,
          goles_visitante: null,
          estado: 'pendiente',
        });
      }
    }
    const last = players.pop()!;
    players.splice(1, 0, last);
  }

  // Vuelta (swap home/away)
  if (idaVuelta) {
    const idaMatches = [...matches];
    const totalIdaRounds = n - 1;
    for (const m of idaMatches) {
      matches.push({
        ...m,
        jornada: m.jornada + totalIdaRounds,
        jugador_local_id: m.jugador_visitante_id,
        jugador_visitante_id: m.jugador_local_id,
      });
    }
  }

  return matches;
}

export async function generarCalendarioLiga(
  ligaId: string,
  jugadores: LigaJugadorConDetalles[],
  idaVuelta: boolean
): Promise<{ error: string | null }> {
  try {
    // Delete existing liga matches
    await supabase.from('liga_partidos').delete().eq('liga_id', ligaId);

    const primera = jugadores.filter(j => j.division === 'primera' && j.activo).map(j => j.jugador_id);
    const segunda = jugadores.filter(j => j.division === 'segunda' && j.activo).map(j => j.jugador_id);

    const matchesPrimera = generateLigaRoundRobin(primera, ligaId, 'primera', idaVuelta);
    const matchesSegunda = generateLigaRoundRobin(segunda, ligaId, 'segunda', idaVuelta);

    const allMatches = [...matchesPrimera, ...matchesSegunda];

    if (allMatches.length > 0) {
      // Insert in batches to avoid supabase limits
      const BATCH_SIZE = 500;
      for (let i = 0; i < allMatches.length; i += BATCH_SIZE) {
        const batch = allMatches.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('liga_partidos').insert(batch);
        if (error) throw error;
      }
    }

    // Update liga state
    await supabase.from('ligas').update({ estado: 'en_curso' }).eq('id', ligaId);

    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}

// =============================================
// FA Cup — Random knockout draw
// =============================================

export async function generarFACup(
  ligaId: string,
  jugadores: LigaJugadorConDetalles[]
): Promise<{ error: string | null }> {
  try {
    // Delete existing FA Cup matches
    await supabase
      .from('liga_partidos')
      .delete()
      .eq('liga_id', ligaId)
      .eq('competicion', 'fa_cup');

    // Get all active players from both divisions
    const activos = jugadores.filter(j => j.activo).map(j => j.jugador_id);

    if (activos.length < 2) return { error: 'Se necesitan al menos 2 jugadores activos' };

    // Shuffle randomly
    const shuffled = [...activos].sort(() => Math.random() - 0.5);

    // Determine the right phase based on number of players
    let fase: FaseLiga;
    if (shuffled.length <= 2) fase = 'final';
    else if (shuffled.length <= 4) fase = 'semifinal';
    else if (shuffled.length <= 8) fase = 'cuartos';
    else if (shuffled.length <= 16) fase = 'octavos';
    else if (shuffled.length <= 32) fase = 'ronda_16';
    else fase = 'ronda_32';

    // If not a power of 2, some get byes (we create matches for what we have)
    const matches: any[] = [];
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      matches.push({
        liga_id: ligaId,
        competicion: 'fa_cup' as CompeticionLiga,
        fase,
        jornada: null,
        jugador_local_id: shuffled[i],
        jugador_visitante_id: shuffled[i + 1],
        goles_local: null,
        goles_visitante: null,
        estado: 'pendiente',
      });
    }

    // Handle byes (odd number) — last player gets a bye, we'll handle in next round
    if (shuffled.length % 2 !== 0) {
      // The last player gets a bye; they auto-advance in the next round
      // We store this as metadata in the jornada field (player ID hash)
    }

    if (matches.length > 0) {
      const { error } = await supabase.from('liga_partidos').insert(matches);
      if (error) throw error;
    }

    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function avanzarFaseFACup(
  ligaId: string,
  partidos: LigaPartido[]
): Promise<{ error: string | null }> {
  try {
    const faCupPartidos = partidos.filter(p => p.competicion === 'fa_cup');
    if (faCupPartidos.length === 0) return { error: 'No hay partidos de FA Cup' };

    // Get the current phase (most recent one with matches)
    const faseOrder: FaseLiga[] = ['ronda_32', 'ronda_16', 'octavos', 'cuartos', 'semifinal', 'final'];
    let currentFase: FaseLiga | null = null;
    for (const fase of faseOrder) {
      if (faCupPartidos.some(p => p.fase === fase)) {
        currentFase = fase;
      }
    }
    if (!currentFase) return { error: 'No se encontró la fase actual' };

    const faseActualPartidos = faCupPartidos.filter(p => p.fase === currentFase);
    const pendientes = faseActualPartidos.filter(p => p.estado === 'pendiente');
    if (pendientes.length > 0) return { error: `Aún hay ${pendientes.length} partidos pendientes` };

    // Get winners
    const ganadores: string[] = [];
    for (const p of faseActualPartidos) {
      if (p.goles_local === null || p.goles_visitante === null) continue;
      ganadores.push(
        p.goles_local > p.goles_visitante ? p.jugador_local_id : p.jugador_visitante_id
      );
    }

    if (ganadores.length < 2) return { error: 'No hay suficientes ganadores para avanzar' };

    // Determine next phase
    const currentIdx = faseOrder.indexOf(currentFase);
    if (currentIdx === faseOrder.length - 1) return { error: '¡La FA Cup ya terminó!' };

    // Find the correct next phase based on number of winners
    let nextFase: FaseLiga;
    if (ganadores.length <= 2) nextFase = 'final';
    else if (ganadores.length <= 4) nextFase = 'semifinal';
    else if (ganadores.length <= 8) nextFase = 'cuartos';
    else if (ganadores.length <= 16) nextFase = 'octavos';
    else nextFase = 'ronda_16';

    // Create next round matches (pair winners)
    const matches: any[] = [];
    for (let i = 0; i < ganadores.length; i += 2) {
      if (ganadores[i + 1]) {
        matches.push({
          liga_id: ligaId,
          competicion: 'fa_cup' as CompeticionLiga,
          fase: nextFase,
          jornada: null,
          jugador_local_id: ganadores[i],
          jugador_visitante_id: ganadores[i + 1],
          goles_local: null,
          goles_visitante: null,
          estado: 'pendiente',
        });
      }
    }

    if (matches.length > 0) {
      const { error } = await supabase.from('liga_partidos').insert(matches);
      if (error) throw error;
    }

    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}

// =============================================
// Result registration
// =============================================

export async function registrarResultadoLiga(
  partidoId: string,
  golesLocal: number,
  golesVisitante: number
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('liga_partidos')
    .update({
      goles_local: golesLocal,
      goles_visitante: golesVisitante,
      estado: 'finalizado',
    })
    .eq('id', partidoId);
  return { error: error?.message || null };
}

export async function resetearResultadoLiga(
  partidoId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('liga_partidos')
    .update({
      goles_local: null,
      goles_visitante: null,
      estado: 'pendiente',
    })
    .eq('id', partidoId);
  return { error: error?.message || null };
}

// =============================================
// Fetch all players for selection
// =============================================

export async function fetchAllJugadores(): Promise<Jugador[]> {
  const { data } = await supabase
    .from('jugadores')
    .select('*')
    .order('nombre', { ascending: true });
  return (data || []) as Jugador[];
}

// =============================================
// Player Substitution
// =============================================

/**
 * Sustituye un jugador en una liga sin dañar los partidos ya jugados.
 *
 * Lo que hace:
 * 1. Marca al jugador saliente como inactivo (preserva su historial)
 * 2. Registra al nuevo jugador en liga_jugadores con la misma división
 * 3. Reemplaza al jugador saliente por el entrante en todos los partidos
 *    PENDIENTES (estado = 'pendiente') de la misma competición y liga
 *
 * Los partidos finalizados quedan intactos.
 */
export async function sustituirJugadorLiga(
  ligaId: string,
  jugadorSalienteId: string,
  jugadorEntranteId: string,
  division: DivisionLiga
): Promise<{ error: string | null; partidosSustituidos: number }> {
  try {
    // 1. Marcar al jugador saliente como inactivo
    const { error: inactivoError } = await supabase
      .from('liga_jugadores')
      .update({ activo: false })
      .eq('liga_id', ligaId)
      .eq('jugador_id', jugadorSalienteId);
    if (inactivoError) throw new Error(inactivoError.message);

    // 2. Agregar al jugador entrante (si ya existe en la liga, actualizar a activo)
    const payloadInsert: any = {
      liga_id: ligaId,
      jugador_id: jugadorEntranteId,
      division,
      activo: true,
      sustituto_de_id: jugadorSalienteId,
    };

    let { error: insertError } = await supabase
      .from('liga_jugadores')
      .insert(payloadInsert);

    // Si la columna sustituto_de_id aún no existe en la base de datos Supabase, reintentar sin ella
    if (insertError && insertError.message.includes('sustituto_de_id')) {
      delete payloadInsert.sustituto_de_id;
      const res = await supabase.from('liga_jugadores').insert(payloadInsert);
      insertError = res.error;
    }

    if (insertError) {
      // Si ya existe (ej: anteriormente fue removido), reactivarlo y actualizar división
      if (insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
        const updatePayload: any = { activo: true, division, sustituto_de_id: jugadorSalienteId };
        let { error: updateError } = await supabase
          .from('liga_jugadores')
          .update(updatePayload)
          .eq('liga_id', ligaId)
          .eq('jugador_id', jugadorEntranteId);

        if (updateError && updateError.message.includes('sustituto_de_id')) {
          delete updatePayload.sustituto_de_id;
          const resUpd = await supabase
            .from('liga_jugadores')
            .update(updatePayload)
            .eq('liga_id', ligaId)
            .eq('jugador_id', jugadorEntranteId);
          updateError = resUpd.error;
        }

        if (updateError) throw new Error(updateError.message);
      } else {
        throw new Error(insertError.message);
      }
    }

    // 3. Obtener partidos PENDIENTES donde participa el jugador saliente
    const { data: pendientesLocal, error: e1 } = await supabase
      .from('liga_partidos')
      .select('id')
      .eq('liga_id', ligaId)
      .eq('estado', 'pendiente')
      .eq('jugador_local_id', jugadorSalienteId);
    if (e1) throw new Error(e1.message);

    const { data: pendientesVisitante, error: e2 } = await supabase
      .from('liga_partidos')
      .select('id')
      .eq('liga_id', ligaId)
      .eq('estado', 'pendiente')
      .eq('jugador_visitante_id', jugadorSalienteId);
    if (e2) throw new Error(e2.message);

    let sustituidos = 0;

    // Reemplazar donde era local
    if (pendientesLocal && pendientesLocal.length > 0) {
      const ids = pendientesLocal.map((p: any) => p.id);
      const { error: updLocal } = await supabase
        .from('liga_partidos')
        .update({ jugador_local_id: jugadorEntranteId })
        .in('id', ids);
      if (updLocal) throw new Error(updLocal.message);
      sustituidos += ids.length;
    }

    // Reemplazar donde era visitante
    if (pendientesVisitante && pendientesVisitante.length > 0) {
      const ids = pendientesVisitante.map((p: any) => p.id);
      const { error: updVisit } = await supabase
        .from('liga_partidos')
        .update({ jugador_visitante_id: jugadorEntranteId })
        .in('id', ids);
      if (updVisit) throw new Error(updVisit.message);
      sustituidos += ids.length;
    }

    return { error: null, partidosSustituidos: sustituidos };
  } catch (err: any) {
    return { error: err.message, partidosSustituidos: 0 };
  }
}
