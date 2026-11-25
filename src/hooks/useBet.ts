import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ── Types ──────────────────────────────────────────────────

export type BetMercado = '1x2' | 'goles_local' | 'goles_visitante' | 'total_goles';
export type BetEstado = 'pendiente' | 'ganado' | 'perdido';
export type SelEstado = 'pendiente' | 'ganada' | 'perdida';

export interface BetJornada {
  id: string;
  liga_id: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
  created_by: string;
  created_at: string;
}

export interface BetPartidoDetalle {
  id: string;
  jornada_id: string;
  liga_partido_id: string;
  // enriched from join
  jugador_local_id: string;
  jugador_local_nombre: string;
  jugador_local_foto: string | null;
  jugador_visitante_id: string;
  jugador_visitante_nombre: string;
  jugador_visitante_foto: string | null;
  competicion: string;
  jornada_liga: number | null;
  goles_local: number | null;
  goles_visitante: number | null;
  estado: string;
  cuotas: BetCuota[];
}

export interface BetCuota {
  id: string;
  bet_partido_id: string;
  mercado: BetMercado;
  opcion: string;
  cuota: number;
}

export interface BetBoleto {
  id: string;
  jornada_id: string;
  jugador_id: string;
  monto: number;
  cuota_total: number;
  ganancia_potencial: number;
  estado: BetEstado;
  created_at: string;
  selecciones?: BetSeleccion[];
}

export interface BetSeleccion {
  id: string;
  boleto_id: string;
  bet_cuota_id: string;
  estado: SelEstado;
  // enriched
  cuota?: BetCuota;
  partido?: BetPartidoDetalle;
}

// ── Hook: lista de jornadas de una liga ────────────────────

export function useBetJornadas(ligaId: string | undefined) {
  const [jornadas, setJornadas] = useState<BetJornada[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!ligaId) return;
    setLoading(true);
    const { data } = await supabase
      .from('bet_jornadas')
      .select('*')
      .eq('liga_id', ligaId)
      .order('created_at', { ascending: false });
    setJornadas((data || []) as BetJornada[]);
    setLoading(false);
  }, [ligaId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { jornadas, loading, refetch: fetch };
}

// ── Hook: detalle de una jornada con partidos y cuotas ─────

export function useBetJornadaDetalle(jornadaId: string | undefined) {
  const [partidos, setPartidos] = useState<BetPartidoDetalle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!jornadaId) return;
    setLoading(true);
    try {
      // Fetch bet_partidos with join to liga_partidos and cuotas
      const { data: bpData } = await supabase
        .from('bet_partidos')
        .select(`
          id, jornada_id, liga_partido_id,
          liga_partidos:liga_partido_id (
            id, jugador_local_id, jugador_visitante_id,
            goles_local, goles_visitante, estado, competicion, jornada,
            jugador_local:jugador_local_id (nombre, foto_url),
            jugador_visitante:jugador_visitante_id (nombre, foto_url)
          ),
          bet_cuotas (id, bet_partido_id, mercado, opcion, cuota)
        `)
        .eq('jornada_id', jornadaId);

      const mapped: BetPartidoDetalle[] = ((bpData || []) as any[]).map((bp: any) => {
        const lp = bp.liga_partidos || {};
        return {
          id: bp.id,
          jornada_id: bp.jornada_id,
          liga_partido_id: bp.liga_partido_id,
          jugador_local_id: lp.jugador_local_id,
          jugador_local_nombre: lp.jugador_local?.nombre || '?',
          jugador_local_foto: lp.jugador_local?.foto_url || null,
          jugador_visitante_id: lp.jugador_visitante_id,
          jugador_visitante_nombre: lp.jugador_visitante?.nombre || '?',
          jugador_visitante_foto: lp.jugador_visitante?.foto_url || null,
          competicion: lp.competicion || '',
          jornada_liga: lp.jornada || null,
          goles_local: lp.goles_local,
          goles_visitante: lp.goles_visitante,
          estado: lp.estado || 'pendiente',
          cuotas: (bp.bet_cuotas || []) as BetCuota[],
        };
      });
      setPartidos(mapped);
    } finally {
      setLoading(false);
    }
  }, [jornadaId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { partidos, loading, refetch: fetch };
}

// ── Hook: boletos del jugador actual ───────────────────────

export function useMisBoletos(jugadorId: string | undefined) {
  const [boletos, setBoletos] = useState<BetBoleto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!jugadorId) return;
    setLoading(true);
    const { data } = await supabase
      .from('bet_boletos')
      .select(`
        *,
        bet_selecciones (
          id, boleto_id, bet_cuota_id, estado,
          bet_cuotas:bet_cuota_id (id, bet_partido_id, mercado, opcion, cuota)
        )
      `)
      .eq('jugador_id', jugadorId)
      .order('created_at', { ascending: false });
    setBoletos((data || []) as any[]);
    setLoading(false);
  }, [jugadorId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { boletos, loading, refetch: fetch };
}

// ── Hook: todos los boletos (admin) ────────────────────────

export function useAllBoletos(jornadaId: string | undefined) {
  const [boletos, setBoletos] = useState<(BetBoleto & { jugador_nombre: string; jugador_foto: string | null })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!jornadaId) return;
    setLoading(true);
    const { data } = await supabase
      .from('bet_boletos')
      .select(`
        *,
        jugadores:jugador_id (nombre, foto_url),
        bet_selecciones (
          id, boleto_id, bet_cuota_id, estado,
          bet_cuotas:bet_cuota_id (id, bet_partido_id, mercado, opcion, cuota)
        )
      `)
      .eq('jornada_id', jornadaId)
      .order('created_at', { ascending: false });
    const mapped = ((data || []) as any[]).map((b: any) => ({
      ...b,
      jugador_nombre: b.jugadores?.nombre || '?',
      jugador_foto: b.jugadores?.foto_url || null,
    }));
    setBoletos(mapped);
    setLoading(false);
  }, [jornadaId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { boletos, loading, refetch: fetch };
}

// ── Hook: ranking / boletos por liga (único por torneo) ────

export function useBoletosPorLiga(ligaId: string | undefined) {
  const [boletos, setBoletos] = useState<(BetBoleto & { jugador_nombre: string; jugador_foto: string | null; jornada_nombre: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!ligaId) return;
    setLoading(true);
    const { data: jorData } = await supabase
      .from('bet_jornadas')
      .select('id, nombre')
      .eq('liga_id', ligaId);

    const jornadas = (jorData || []) as { id: string; nombre: string }[];
    if (jornadas.length === 0) {
      setBoletos([]);
      setLoading(false);
      return;
    }

    const jorMap = new Map(jornadas.map(j => [j.id, j.nombre]));
    const { data } = await supabase
      .from('bet_boletos')
      .select(`
        *,
        jugadores:jugador_id (nombre, foto_url),
        bet_selecciones (
          id, boleto_id, bet_cuota_id, estado,
          bet_cuotas:bet_cuota_id (id, bet_partido_id, mercado, opcion, cuota)
        )
      `)
      .in('jornada_id', jornadas.map(j => j.id))
      .order('created_at', { ascending: false });

    const mapped = ((data || []) as any[]).map((b: any) => ({
      ...b,
      jugador_nombre: b.jugadores?.nombre || '?',
      jugador_foto: b.jugadores?.foto_url || null,
      jornada_nombre: jorMap.get(b.jornada_id) || 'Jornada',
    }));
    setBoletos(mapped);
    setLoading(false);
  }, [ligaId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { boletos, loading, refetch: fetch };
}

// ── CRUD Functions ──────────────────────────────────────────

export async function crearBetJornada(
  ligaId: string, nombre: string, descripcion: string, createdBy: string
): Promise<{ data: BetJornada | null; error: string | null }> {
  const { data, error } = await supabase
    .from('bet_jornadas')
    .insert({ liga_id: ligaId, nombre, descripcion, created_by: createdBy })
    .select().single();
  return { data: data as BetJornada, error: error?.message || null };
}

export async function agregarPartidoBet(
  jornadaId: string, ligaPartidoId: string
): Promise<{ data: any; error: string | null }> {
  const { data, error } = await supabase
    .from('bet_partidos')
    .insert({ jornada_id: jornadaId, liga_partido_id: ligaPartidoId })
    .select().single();
  return { data, error: error?.message || null };
}

export async function upsertCuota(
  betPartidoId: string, mercado: BetMercado, opcion: string, cuota: number
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('bet_cuotas')
    .upsert({ bet_partido_id: betPartidoId, mercado, opcion, cuota }, { onConflict: 'bet_partido_id,mercado,opcion' });
  return { error: error?.message || null };
}

export async function eliminarCuota(cuotaId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('bet_cuotas').delete().eq('id', cuotaId);
  return { error: error?.message || null };
}

export async function autoCargarPartidosYCuotas(
  jornadaId: string,
  ligaId: string,
  jornadaNumero: number
): Promise<{ error: string | null; partidosCargados: number }> {
  // 1. Get all liga_partidos for this liga + jornada number
  const { data: ligaPartidos, error: lpErr } = await supabase
    .from('liga_partidos')
    .select('id')
    .eq('liga_id', ligaId)
    .eq('jornada', jornadaNumero)
    .in('competicion', ['primera', 'segunda']);
  if (lpErr) return { error: lpErr.message, partidosCargados: 0 };
  if (!ligaPartidos || ligaPartidos.length === 0) return { error: null, partidosCargados: 0 };

  // 2. Check existing bet_partidos for this jornada to avoid relying on DB ON CONFLICT constraint
  const { data: existingBp, error: exErr } = await supabase
    .from('bet_partidos')
    .select('liga_partido_id')
    .eq('jornada_id', jornadaId);
  if (exErr) return { error: exErr.message, partidosCargados: 0 };

  const existingIds = new Set((existingBp || []).map((b: any) => b.liga_partido_id));
  const nuevos = ligaPartidos.filter((lp: any) => !existingIds.has(lp.id));
  if (nuevos.length === 0) return { error: null, partidosCargados: 0 };

  const inserts = nuevos.map((lp: any) => ({ jornada_id: jornadaId, liga_partido_id: lp.id }));
  const { data: bpInserted, error: bpErr } = await supabase
    .from('bet_partidos')
    .insert(inserts)
    .select('id, liga_partido_id');
  if (bpErr) return { error: bpErr.message, partidosCargados: 0 };

  const bpList: { id: string; liga_partido_id: string }[] = (bpInserted || []) as any[];

  // 3. For each newly inserted bet_partido, insert default cuotas
  if (bpList.length > 0) {
    const defaultCuotas: any[] = [];
    for (const bp of bpList) {
      defaultCuotas.push(
        { bet_partido_id: bp.id, mercado: '1x2', opcion: '1', cuota: 1.80 },
        { bet_partido_id: bp.id, mercado: '1x2', opcion: 'X', cuota: 1.80 },
        { bet_partido_id: bp.id, mercado: '1x2', opcion: '2', cuota: 1.80 },
        { bet_partido_id: bp.id, mercado: 'total_goles', opcion: '+1.5', cuota: 1.80 },
        { bet_partido_id: bp.id, mercado: 'total_goles', opcion: '+2.5', cuota: 1.80 },
        { bet_partido_id: bp.id, mercado: 'total_goles', opcion: '+3.5', cuota: 1.80 },
        { bet_partido_id: bp.id, mercado: 'total_goles', opcion: '+4.5', cuota: 1.80 },
        { bet_partido_id: bp.id, mercado: 'goles_local', opcion: '+1.5', cuota: 1.80 },
        { bet_partido_id: bp.id, mercado: 'goles_local', opcion: '+2.5', cuota: 1.80 },
        { bet_partido_id: bp.id, mercado: 'goles_local', opcion: '+3.5', cuota: 1.80 },
        { bet_partido_id: bp.id, mercado: 'goles_local', opcion: '+4.5', cuota: 1.80 },
        { bet_partido_id: bp.id, mercado: 'goles_visitante', opcion: '+1.5', cuota: 1.80 },
        { bet_partido_id: bp.id, mercado: 'goles_visitante', opcion: '+2.5', cuota: 1.80 },
        { bet_partido_id: bp.id, mercado: 'goles_visitante', opcion: '+3.5', cuota: 1.80 },
        { bet_partido_id: bp.id, mercado: 'goles_visitante', opcion: '+4.5', cuota: 1.80 },
      );
    }
    const { error: cErr } = await supabase.from('bet_cuotas').insert(defaultCuotas);
    if (cErr) return { error: cErr.message, partidosCargados: bpList.length };
  }

  return { error: null, partidosCargados: bpList.length };
}

export async function colocarBoleto(
  jornadaId: string,
  jugadorId: string,
  selecciones: { bet_cuota_id: string }[],
  cuotaTotal: number
): Promise<{ data: BetBoleto | null; error: string | null }> {
  if (selecciones.length < 7) return { data: null, error: 'Debes seleccionar mínimo 7 partidos' };

  // Check 1 boleto per player per jornada
  const { count } = await supabase
    .from('bet_boletos')
    .select('id', { count: 'exact', head: true })
    .eq('jornada_id', jornadaId)
    .eq('jugador_id', jugadorId);
  if ((count ?? 0) > 0) return { data: null, error: '¡Ya tienes un boleto en esta jornada! Solo se permite 1 por jornada.' };

  // Check that none of the selected cuotas belong to finished matches
  const cuotaIds = selecciones.map(s => s.bet_cuota_id);
  const { data: cuotasData, error: cuotasErr } = await supabase
    .from('bet_cuotas')
    .select('id, bet_partido_id')
    .in('id', cuotaIds);
  if (cuotasErr) return { data: null, error: cuotasErr.message };

  const betPartidoIds = [...new Set((cuotasData || []).map((c: any) => c.bet_partido_id))];
  if (betPartidoIds.length > 0) {
    const { data: bpList, error: bpErr } = await supabase
      .from('bet_partidos')
      .select('id, liga_partidos:liga_partido_id(estado)')
      .in('id', betPartidoIds);
    if (bpErr) return { data: null, error: bpErr.message };

    const finalizados = (bpList || []).filter((bp: any) => bp.liga_partidos?.estado === 'finalizado');
    if (finalizados.length > 0) {
      return { data: null, error: `Tu boleto incluye ${finalizados.length} partido(s) ya finalizado(s). Solo se puede apostar a partidos pendientes.` };
    }
  }

  const ganancia = parseFloat((100 * cuotaTotal).toFixed(2));
  const { data: boleto, error: bErr } = await supabase
    .from('bet_boletos')
    .insert({ jornada_id: jornadaId, jugador_id: jugadorId, monto: 100, cuota_total: cuotaTotal, ganancia_potencial: ganancia })
    .select().single();
  if (bErr) return { data: null, error: bErr.message };

  const sels = selecciones.map(s => ({ boleto_id: (boleto as any).id, bet_cuota_id: s.bet_cuota_id }));
  const { error: sErr } = await supabase.from('bet_selecciones').insert(sels);
  if (sErr) return { data: null, error: sErr.message };

  return { data: boleto as BetBoleto, error: null };
}

// ── Resolver resultados (llamar cuando se ingresa resultado de partido) ─────

export async function resolverBoletos(ligaPartidoId: string): Promise<{ error: string | null }> {
  try {
    // Get the liga_partido result
    const { data: lp } = await supabase
      .from('liga_partidos')
      .select('id, jugador_local_id, jugador_visitante_id, goles_local, goles_visitante, estado')
      .eq('id', ligaPartidoId)
      .single();

    if (!lp || lp.estado !== 'finalizado' || lp.goles_local === null) return { error: null };

    const gl = lp.goles_local as number;
    const gv = lp.goles_visitante as number;

    // Get all bet_partidos for this liga_partido
    const { data: bpList } = await supabase
      .from('bet_partidos')
      .select('id')
      .eq('liga_partido_id', ligaPartidoId);

    if (!bpList || bpList.length === 0) return { error: null };

    for (const bp of bpList) {
      // Get all cuotas for this bet_partido
      const { data: cuotas } = await supabase
        .from('bet_cuotas')
        .select('id, mercado, opcion')
        .eq('bet_partido_id', bp.id);

      if (!cuotas) continue;

      for (const cuota of cuotas) {
        let ganada = false;

        if (cuota.mercado === '1x2') {
          if (cuota.opcion === '1') ganada = gl > gv;
          else if (cuota.opcion === 'X') ganada = gl === gv;
          else if (cuota.opcion === '2') ganada = gv > gl;
        } else if (cuota.mercado === 'total_goles') {
          const total = gl + gv;
          const threshold = Math.abs(parseFloat(cuota.opcion));
          ganada = cuota.opcion.startsWith('+') ? total > threshold : total < threshold;
        } else if (cuota.mercado === 'goles_local') {
          const threshold = Math.abs(parseFloat(cuota.opcion));
          ganada = cuota.opcion.startsWith('+') ? gl > threshold : gl < threshold;
        } else if (cuota.mercado === 'goles_visitante') {
          const threshold = Math.abs(parseFloat(cuota.opcion));
          ganada = cuota.opcion.startsWith('+') ? gv > threshold : gv < threshold;
        }

        // Update all selecciones with this cuota
        await supabase
          .from('bet_selecciones')
          .update({ estado: ganada ? 'ganada' : 'perdida' })
          .eq('bet_cuota_id', cuota.id);
      }
    }

    // Now update boleto states: check all boletos that have selecciones on these partidos
    const cuotaIds = (await supabase.from('bet_cuotas').select('id').in('bet_partido_id', bpList.map(b => b.id))).data?.map(c => c.id) || [];

    if (cuotaIds.length > 0) {
      await recalcularBoletosPorCuotas(cuotaIds);
    }

    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}

async function recalcularBoletosPorCuotas(cuotaIds: string[]) {
  const { data: affectedSels } = await supabase
    .from('bet_selecciones')
    .select('boleto_id')
    .in('bet_cuota_id', cuotaIds);

  const boletoIds = [...new Set((affectedSels || []).map((s: any) => s.boleto_id))];

  for (const boletoId of boletoIds) {
    const { data: allSels } = await supabase
      .from('bet_selecciones')
      .select('estado')
      .eq('boleto_id', boletoId);

    if (!allSels) continue;
    const hasPendiente = allSels.some((s: any) => s.estado === 'pendiente');
    const hasPerdida = allSels.some((s: any) => s.estado === 'perdida');

    if (hasPerdida) {
      await supabase.from('bet_boletos').update({ estado: 'perdido' }).eq('id', boletoId);
    } else if (!hasPendiente) {
      await supabase.from('bet_boletos').update({ estado: 'ganado' }).eq('id', boletoId);
    } else {
      await supabase.from('bet_boletos').update({ estado: 'pendiente' }).eq('id', boletoId);
    }
  }
}

export async function resolverCuotaManual(cuotaId: string, ganada: boolean): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('bet_selecciones')
      .update({ estado: ganada ? 'ganada' : 'perdida' })
      .eq('bet_cuota_id', cuotaId);
    if (error) throw error;
    await recalcularBoletosPorCuotas([cuotaId]);
    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function toggleJornadaActiva(jornadaId: string, activa: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.from('bet_jornadas').update({ activa }).eq('id', jornadaId);
  return { error: error?.message || null };
}

export async function eliminarPartidoBet(betPartidoId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('bet_partidos').delete().eq('id', betPartidoId);
  return { error: error?.message || null };
}
