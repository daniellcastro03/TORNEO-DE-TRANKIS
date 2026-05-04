import { useState, useEffect, useRef } from 'react';
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
import { Zap, ChevronRight, Trophy, Download, Image as ImageIcon } from 'lucide-react';
import './Bracket.css';

const FASE_LABELS: Record<string, string> = {
  octavos: 'Octavos de Final',
  cuartos: 'Cuartos de Final',
  semifinal: 'Semifinal',
  tercer_puesto: '3er Puesto',
  final: 'Final',
};

const FASE_ORDER: FasePartido[] = ['octavos', 'cuartos', 'semifinal', 'tercer_puesto', 'final'];

interface PlayerInfo {
  nombre: string;
  escudo: string | null;
  foto_url: string | null;
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
  const [playerMap, setPlayerMap] = useState<Record<string, PlayerInfo>>({});
  const bracketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadPlayerMap() {
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
            foto_url: insc.jugadores?.foto_url || null,
          };
        }
        setPlayerMap(map);
      }
    }
    if (torneo.id) loadPlayerMap();
  }, [torneo.id, partidos]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getPlayerInfo = (jugadorId: string): PlayerInfo => {
    if (playerMap[jugadorId]) return playerMap[jugadorId];
    for (const g of grupos) {
      const j = g.jugadores.find((jg) => jg.jugador_id === jugadorId);
      if (j) return { nombre: j.equipo_nombre || j.jugador_nombre || '?', escudo: j.equipo_escudo || null, foto_url: j.jugador_foto || null };
    }
    return { nombre: 'Jugador', escudo: null, foto_url: null };
  };

  const criterios = torneo.criterios_json as CriteriosClasificacion;
  const config = calcularDistribucion(inscripcionesCount);

  const grupoPartidos = partidos.filter((p) => p.fase === 'grupos');
  const gruposCompletos = grupoPartidos.length > 0 && grupoPartidos.every((p) => p.estado === 'finalizado');

  const matchesByPhase: Record<string, Partido[]> = {};
  for (const f of FASE_ORDER) {
    matchesByPhase[f] = partidos.filter((p) => p.fase === f);
  }
  const hasKnockout = FASE_ORDER.some((f) => matchesByPhase[f].length > 0);

  const finalMatch = matchesByPhase['final']?.[0];
  const championId = finalMatch?.estado === 'finalizado' && finalMatch.goles_local !== null && finalMatch.goles_visitante !== null
    ? (finalMatch.goles_local > finalMatch.goles_visitante ? finalMatch.jugador_local_id : finalMatch.jugador_visitante_id)
    : null;

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
    else { showToast(`¡${FASE_LABELS[config.faseInicial]} generada!`, 'success'); refetch(); }
  };

  const handleAvanzar = async (fase: FasePartido) => {
    const pendientes = matchesByPhase[fase].filter((p) => p.estado === 'pendiente');
    if (pendientes.length > 0) { showToast(`Aún hay ${pendientes.length} partido(s) pendientes`, 'error'); return; }
    setActionLoading(true);
    const { error } = await avanzarFase(torneo.id, partidos, fase);
    setActionLoading(false);
    if (error) showToast(error, 'error');
    else { showToast('¡Fase avanzada!', 'success'); refetch(); }
  };

  // Export bracket as image via browser print (PDF-friendly)
  const handleExportPrint = () => {
    window.print();
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spinner" /></div>;

  const grupoFinalizados = grupoPartidos.filter((p) => p.estado === 'finalizado').length;

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
          <div className="champion-details">
            {getPlayerInfo(championId).foto_url && (
              <img src={getPlayerInfo(championId).foto_url!} alt="" className="champion-avatar" />
            )}
            {getPlayerInfo(championId).escudo && (
              <img src={getPlayerInfo(championId).escudo!} alt="" className="champion-escudo" />
            )}
            <div className="champion-name">{getPlayerInfo(championId).nombre}</div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>¡CAMPEÓN DEL TORNEO!</p>
          </div>
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
        <>
          {/* Export toolbar */}
          <div className="bracket-toolbar no-print">
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              🏆 {torneo.nombre}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={handleExportPrint} title="Exportar / Imprimir">
                <Download size={15} /> PDF / Imprimir
              </button>
            </div>
          </div>

          <div className="bracket-container" ref={bracketRef} id="bracket-exportable">
            <div className="bracket-rounds">
              {FASE_ORDER.map((fase) => {
                const matches = matchesByPhase[fase];
                if (matches.length === 0) return null;

                const allFinished = matches.every((m) => m.estado === 'finalizado');
                const nextFaseIndex = FASE_ORDER.indexOf(fase) + 1;
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
                          {/* Local */}
                          <div className={`bracket-team-row ${localWins ? 'winner' : finished && !localWins ? 'loser' : ''}`}>
                            <div className="bracket-team-identity">
                              {localInfo.foto_url ? (
                                <img src={localInfo.foto_url} alt="" className="bracket-player-avatar" />
                              ) : (
                                <div className="bracket-player-avatar-placeholder">
                                  {localInfo.nombre.charAt(0)}
                                </div>
                              )}
                              {localInfo.escudo ? (
                                <img src={localInfo.escudo} alt="" className="bracket-team-shield" />
                              ) : (
                                <span className="bracket-team-shield-emoji">⚽</span>
                              )}
                              <span className="bracket-team-name">{localInfo.nombre}</span>
                            </div>
                            <span className="bracket-team-score">{finished ? m.goles_local : '-'}</span>
                          </div>
                          {/* Visitante */}
                          <div className={`bracket-team-row ${visitWins ? 'winner' : finished && !visitWins ? 'loser' : ''}`}>
                            <div className="bracket-team-identity">
                              {visitInfo.foto_url ? (
                                <img src={visitInfo.foto_url} alt="" className="bracket-player-avatar" />
                              ) : (
                                <div className="bracket-player-avatar-placeholder">
                                  {visitInfo.nombre.charAt(0)}
                                </div>
                              )}
                              {visitInfo.escudo ? (
                                <img src={visitInfo.escudo} alt="" className="bracket-team-shield" />
                              ) : (
                                <span className="bracket-team-shield-emoji">⚽</span>
                              )}
                              <span className="bracket-team-name">{visitInfo.nombre}</span>
                            </div>
                            <span className="bracket-team-score">{finished ? m.goles_visitante : '-'}</span>
                          </div>
                        </div>
                      );
                    })}

                    {isAdmin && allFinished && !nextExists && fase !== 'final' && fase !== 'tercer_puesto' && (
                      <button
                        className={`btn btn-primary btn-sm no-print ${actionLoading ? 'btn-loading' : ''}`}
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
        </>
      )}
    </div>
  );
}
