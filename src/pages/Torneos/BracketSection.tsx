import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGrupos } from '../../hooks/useGrupos';
import { supabase } from '../../lib/supabase';
import {
  calcularDistribucion,
  obtenerClasificados,
  generarCrucesMundial,
  generarFaseEliminatoria,
  avanzarFase,
} from '../../hooks/useBracket';
import type { Torneo, Partido, FasePartido, CriteriosClasificacion } from '../../types/database';
import { Zap, ChevronRight, Trophy } from 'lucide-react';
import './Bracket.css';

const FASE_LABELS: Record<string, string> = {
  octavos: 'Octavos de Final',
  cuartos: 'Cuartos de Final',
  semifinal: 'Semifinal',
  tercer_puesto: '3er Puesto',
  final: 'Final',
};

// Show final + 3rd place LAST, everything else in order
const FASE_ORDER: FasePartido[] = ['octavos', 'cuartos', 'semifinal', 'tercer_puesto', 'final'];

interface PlayerInfo {
  nombre: string;
  escudo: string | null;
}

interface BracketSectionProps {
  torneo: Torneo;
  inscripcionesCount: number;
}

export default function BracketSection({ torneo, inscripcionesCount }: BracketSectionProps) {
  const { isAdmin } = useAuth();
  const { grupos, partidos, loading, refetch } = useGrupos(torneo.id);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Independent player map — built from ALL inscriptions, not just group players
  // This ensures knockout round players are always resolved
  const [playerMap, setPlayerMap] = useState<Record<string, PlayerInfo>>({});

  useEffect(() => {
    async function loadPlayerMap() {
      // Fetch all inscriptions for this tournament
      const { data } = await supabase
        .from('torneo_inscripciones')
        .select(`
          jugador_id,
          jugadores:jugador_id (nombre, foto_url),
          catalogos_equipos:catalogo_equipo_id (nombre, escudo_url)
        `)
        .eq('torneo_id', torneo.id);

      if (data) {
        const map: Record<string, PlayerInfo> = {};
        for (const insc of data as any[]) {
          map[insc.jugador_id] = {
            nombre: insc.catalogos_equipos?.nombre || insc.jugadores?.nombre || '?',
            escudo: insc.catalogos_equipos?.escudo_url || null,
          };
        }
        setPlayerMap(map);
      }
    }
    if (torneo.id) loadPlayerMap();
  }, [torneo.id, partidos]); // rebuild when partidos change (new phase)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getPlayerInfo = (jugadorId: string): PlayerInfo => {
    // Try playerMap first (has inscription/team data)
    if (playerMap[jugadorId]) return playerMap[jugadorId];
    // Fallback: search group data
    for (const g of grupos) {
      const j = g.jugadores.find((jg) => jg.jugador_id === jugadorId);
      if (j) return { nombre: j.equipo_nombre || j.jugador_nombre || '?', escudo: j.equipo_escudo || null };
    }
    return { nombre: 'Jugador', escudo: null };
  };

  const criterios = torneo.criterios_json as CriteriosClasificacion;
  const config = calcularDistribucion(inscripcionesCount);

  // All group matches finished?
  const grupoPartidos = partidos.filter((p) => p.fase === 'grupos');
  const gruposCompletos = grupoPartidos.length > 0 && grupoPartidos.every((p) => p.estado === 'finalizado');

  // Knockout matches by phase
  const matchesByPhase: Record<string, Partido[]> = {};
  for (const f of FASE_ORDER) {
    matchesByPhase[f] = partidos.filter((p) => p.fase === f);
  }
  const hasKnockout = FASE_ORDER.some((f) => matchesByPhase[f].length > 0);

  // Champion: winner of the final
  const finalMatch = matchesByPhase['final']?.[0];
  const championId = finalMatch?.estado === 'finalizado' && finalMatch.goles_local !== null && finalMatch.goles_visitante !== null
    ? (finalMatch.goles_local > finalMatch.goles_visitante ? finalMatch.jugador_local_id : finalMatch.jugador_visitante_id)
    : null;

  // Generate knockout bracket (World Cup seeding)
  const handleGenerarEliminatoria = async () => {
    if (!confirm('¿Generar la fase eliminatoria con cruces estilo Mundial (A1 vs B2, etc.)?')) return;
    setActionLoading(true);

    const clasificados = obtenerClasificados(grupos, partidos, config, criterios.puntos_victoria, criterios.puntos_empate);
    const cruces = generarCrucesMundial(clasificados.primeros, clasificados.segundos, clasificados.mejoresTerceros, config);

    if (cruces.length === 0) {
      showToast('No hay suficientes clasificados para generar la eliminatoria', 'error');
      setActionLoading(false);
      return;
    }

    const { error } = await generarFaseEliminatoria(torneo.id, cruces, config.faseInicial);
    setActionLoading(false);

    if (error) showToast(error, 'error');
    else { showToast(`¡${FASE_LABELS[config.faseInicial]} generada! ${cruces.length} cruces.`, 'success'); refetch(); }
  };

  // Advance winners to next round
  const handleAvanzar = async (fase: FasePartido) => {
    const pendientes = matchesByPhase[fase].filter((p) => p.estado === 'pendiente');
    if (pendientes.length > 0) {
      showToast(`Aún hay ${pendientes.length} partido(s) pendientes`, 'error');
      return;
    }
    setActionLoading(true);
    const { error } = await avanzarFase(torneo.id, partidos, fase);
    setActionLoading(false);
    if (error) showToast(error, 'error');
    else { showToast('¡Fase avanzada!', 'success'); refetch(); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spinner" /></div>;

  const grupoFinalizados = grupoPartidos.filter((p) => p.estado === 'finalizado').length;

  // If no knockout yet and groups aren't done, show pending message
  if (!hasKnockout && !gruposCompletos) {
    return (
      <div className="empty-state card" style={{ padding: '2rem' }}>
        <div className="empty-state-icon">⏳</div>
        <h3>Fase de grupos en curso</h3>
        <p>La eliminatoria se generará cuando todos los partidos de grupos estén finalizados</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
          {grupoFinalizados} / {grupoPartidos.length} partidos jugados
        </p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      {/* Champion celebration */}
      {championId && (
        <div className="champion-card fade-in">
          <div className="champion-trophy">🏆</div>
          {getPlayerInfo(championId).escudo && (
            <img src={getPlayerInfo(championId).escudo!} alt="" />
          )}
          <div className="champion-name">{getPlayerInfo(championId).nombre}</div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>¡CAMPEÓN DEL TORNEO!</p>
        </div>
      )}

      {/* Admin: generate knockout */}
      {isAdmin && gruposCompletos && !hasKnockout && (
        <div className="bracket-advance-panel fade-in">
          <div>
            <h3><Zap size={18} /> Fase de grupos completada</h3>
            <p className="bracket-advance-info">
              Clasifican: top {config.clasificadosPorGrupo} por grupo
              {config.mejoresTerceros > 0 && ` + ${config.mejoresTerceros} mejores terceros`}
              {' → '}{FASE_LABELS[config.faseInicial]}
            </p>
          </div>
          <button
            className={`btn btn-primary ${actionLoading ? 'btn-loading' : ''}`}
            onClick={handleGenerarEliminatoria}
            disabled={actionLoading}
          >
            <Trophy size={16} /> Generar Eliminatoria
          </button>
        </div>
      )}

      {/* Bracket visualization */}
      {hasKnockout && (
        <div className="bracket-container">
          <div className="bracket-rounds">
            {FASE_ORDER.map((fase) => {
              const matches = matchesByPhase[fase];
              if (matches.length === 0) return null;

              const allFinished = matches.every((m) => m.estado === 'finalizado');
              const nextFaseIndex = FASE_ORDER.indexOf(fase) + 1;
              // Skip tercer_puesto when looking for "next" phase in bracket progression
              const nextFase = fase === 'semifinal' ? 'final' : FASE_ORDER[nextFaseIndex];
              const nextExists = nextFase && matchesByPhase[nextFase]?.length > 0;

              return (
                <div key={fase} className="bracket-round">
                  <span className="bracket-round-title">
                    {fase === 'tercer_puesto' ? '🥉 3er Puesto' : FASE_LABELS[fase]}
                  </span>

                  {matches.map((m) => {
                    const localInfo = getPlayerInfo(m.jugador_local_id);
                    const visitInfo = getPlayerInfo(m.jugador_visitante_id);
                    const finished = m.estado === 'finalizado' && m.goles_local !== null && m.goles_visitante !== null;
                    const localWins = finished && m.goles_local! > m.goles_visitante!;
                    const visitWins = finished && m.goles_visitante! > m.goles_local!;
                    const isFinal = fase === 'final';

                    return (
                      <div key={m.id} className={`bracket-match ${isFinal ? 'bracket-final' : ''}`}>
                        <div className={`bracket-team-row ${localWins ? 'winner' : finished && !localWins ? 'loser' : ''}`}>
                          {localInfo.escudo
                            ? <img src={localInfo.escudo} alt="" />
                            : <div style={{ width: 20, height: 20, background: 'var(--color-bg-hover)', borderRadius: 4, flexShrink: 0 }} />
                          }
                          <span className="bracket-team-name">{localInfo.nombre}</span>
                          <span className="bracket-team-score">{finished ? m.goles_local : '-'}</span>
                        </div>
                        <div className={`bracket-team-row ${visitWins ? 'winner' : finished && !visitWins ? 'loser' : ''}`}>
                          {visitInfo.escudo
                            ? <img src={visitInfo.escudo} alt="" />
                            : <div style={{ width: 20, height: 20, background: 'var(--color-bg-hover)', borderRadius: 4, flexShrink: 0 }} />
                          }
                          <span className="bracket-team-name">{visitInfo.nombre}</span>
                          <span className="bracket-team-score">{finished ? m.goles_visitante : '-'}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Admin: advance to next phase */}
                  {isAdmin && allFinished && !nextExists && fase !== 'final' && fase !== 'tercer_puesto' && (
                    <button
                      className={`btn btn-primary btn-sm ${actionLoading ? 'btn-loading' : ''}`}
                      onClick={() => handleAvanzar(fase)}
                      disabled={actionLoading}
                      style={{ marginTop: 'var(--space-sm)', width: '100%' }}
                    >
                      <ChevronRight size={14} /> Avanzar a {FASE_LABELS[nextFase] || 'siguiente fase'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
