import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  useGrupos,
  calcularClasificacion,
  sortearGrupos,
  eliminarGrupos,
  completarSorteoGrupos,
  type GrupoConJugadores,
  type ClasificacionRow,
} from '../../hooks/useGrupos';
import { calcularDistribucion } from '../../hooks/useBracket';
import type { Torneo, Partido, CriteriosClasificacion } from '../../types/database';
import { Shuffle, Trash2, Gamepad2, Info, LayoutGrid, ChevronDown, ChevronUp } from 'lucide-react';
import './Grupos.css';

interface GruposSectionProps {
  torneo: Torneo;
  inscripcionesCount: number;
  jugadorIds: string[];
}

export default function GruposSection({ torneo, jugadorIds }: GruposSectionProps) {
  const { isAdmin, user } = useAuth();
  const { grupos, partidos, loading, refetch } = useGrupos(torneo.id);
  const config = calcularDistribucion(jugadorIds.length);
  const [numGrupos, setNumGrupos] = useState(config.numGrupos);
  const [sorting, setSorting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  // "overview" = ver todos los grupos a la vez; o el nombre del grupo activo
  const [activeTab, setActiveTab] = useState<string>('overview');

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const criterios = torneo.criterios_json as CriteriosClasificacion;

  const handleSortear = async () => {
    if (!confirm(`¿Sortear ${numGrupos} grupos con ${jugadorIds.length} jugadores?`)) return;
    setSorting(true);
    const { error } = await sortearGrupos(torneo.id, numGrupos, jugadorIds);
    setSorting(false);
    if (error) showToast(error, 'error');
    else { showToast('¡Grupos sorteados!', 'success'); refetch(); }
  };

  const handleReset = async () => {
    if (!confirm('¿Eliminar todos los grupos y partidos? Esta acción no se puede deshacer.')) return;
    setSorting(true);
    const { error } = await eliminarGrupos(torneo.id);
    setSorting(false);
    if (error) showToast(error, 'error');
    else { showToast('Grupos eliminados', 'success'); refetch(); setActiveTab('overview'); }
  };

  const handleCompletar = async () => {
    if (!confirm(`¿Completar el sorteo? Se crearán los grupos faltantes con los ${unassignedCount} jugadores sin asignar.`)) return;
    setCompleting(true);
    const { error } = await completarSorteoGrupos(torneo.id, numGrupos, jugadorIds);
    setCompleting(false);
    if (error) showToast(error, 'error');
    else { showToast('¡Sorteo completado!', 'success'); refetch(); }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <div className="spinner" />
      </div>
    );
  }

  // ── Empty state: no groups yet ──
  if (grupos.length === 0) {
    if (!isAdmin) {
      return (
        <div className="empty-state card" style={{ padding: '2rem' }}>
          <div className="empty-state-icon">🎲</div>
          <h3>Esperando sorteo</h3>
          <p>El admin sorteará los grupos pronto. ¡Mantente atento!</p>
        </div>
      );
    }

    const recalc = calcularDistribucion(jugadorIds.length);
    const faseLabel = recalc.faseInicial === 'octavos' ? 'Octavos' : recalc.faseInicial === 'cuartos' ? 'Cuartos' : recalc.faseInicial === 'semifinal' ? 'Semis' : 'Final';

    return (
      <div className="sorteo-panel fade-in">
        {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
        <h3><Shuffle size={18} /> Sortear Grupos</h3>

        <div className="distrib-panel" style={{ marginBottom: '1rem' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Info size={14} /> Distribución automática para {jugadorIds.length} jugadores:
          </p>
          <div className="distrib-grid">
            <div className="distrib-item"><div className="distrib-value">{numGrupos}</div><div className="distrib-label">Grupos</div></div>
            <div className="distrib-item"><div className="distrib-value">~{Math.ceil(jugadorIds.length / numGrupos)}</div><div className="distrib-label">Por grupo</div></div>
            <div className="distrib-item"><div className="distrib-value">{recalc.totalClasificados}</div><div className="distrib-label">Clasifican</div></div>
            <div className="distrib-item"><div className="distrib-value" style={{ fontSize: '0.8rem' }}>{faseLabel}</div><div className="distrib-label">Eliminatoria</div></div>
          </div>
          {recalc.mejoresTerceros > 0 && (
            <p style={{ color: 'var(--color-neon)', fontSize: '0.72rem', marginTop: '0.5rem' }}>
              ⭐ Top {recalc.clasificadosPorGrupo} por grupo + {recalc.mejoresTerceros} mejores terceros
            </p>
          )}
        </div>

        <div className="sorteo-controls">
          <div className="form-group">
            <label htmlFor="num-grupos">Nº de grupos</label>
            <input
              id="num-grupos"
              type="number"
              value={numGrupos}
              onChange={(e) => setNumGrupos(Math.max(2, Math.min(16, parseInt(e.target.value) || 2)))}
              min={2}
              max={Math.floor(jugadorIds.length / 2)}
            />
          </div>
          <button
            className={`btn btn-primary ${sorting ? 'btn-loading' : ''}`}
            onClick={handleSortear}
            disabled={sorting || jugadorIds.length < 4}
          >
            <Shuffle size={16} /> Sortear
          </button>
        </div>
        {jugadorIds.length < 4 && (
          <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Se necesitan al menos 4 jugadores inscritos
          </p>
        )}
      </div>
    );
  }

  // ── Groups exist — show tab navigation ──
  const gruposOrdenados = [...grupos].sort((a, b) => a.nombre.localeCompare(b.nombre));

  // Detect incomplete sorteo: players not yet assigned to any group
  const assignedPlayerIds = new Set(
    grupos.flatMap((g) => g.jugadores.map((j) => j.jugador_id))
  );
  const unassignedCount = jugadorIds.filter((id) => !assignedPlayerIds.has(id)).length;
  const isIncomplete = unassignedCount > 0 && isAdmin;

  // Count pending/done per group for tab badge
  const getGroupStats = (grupoId: string) => {
    const gPartidos = partidos.filter(p => p.grupo_id === grupoId);
    const done = gPartidos.filter(p => p.estado === 'finalizado').length;
    return { total: gPartidos.length, done };
  };

  const activeGroup = activeTab !== 'overview'
    ? gruposOrdenados.find(g => g.id === activeTab) || null
    : null;

  return (
    <div className="grupos-tabs-wrapper fade-in">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      {/* ── Legend ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div className="clasificacion-legend">
          <span className="legend-item legend-classified">Clasificado</span>
          {config.mejoresTerceros > 0 && (
            <span className="legend-item legend-third">Mejor tercero</span>
          )}
          <span className="legend-item legend-eliminated">Eliminado</span>
        </div>
        {isAdmin && (
          <button className="btn btn-ghost btn-sm" onClick={handleReset} disabled={sorting} style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>
            <Trash2 size={13} /> Reiniciar
          </button>
        )}
      </div>

      {/* ── Incomplete sorteo warning ── */}
      {isIncomplete && (
        <div className="fade-in" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          background: 'rgba(255,184,0,0.06)',
          border: '1px solid rgba(255,184,0,0.35)',
          borderRadius: 'var(--radius-md)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>⚠️</span>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-warning)' }}>
                Sorteo incompleto
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)' }}>
                {unassignedCount} jugador{unassignedCount !== 1 ? 'es' : ''} sin grupo — solo existe{grupos.length > 1 ? 'n' : ''} {grupos.length} de {numGrupos} grupos
              </div>
            </div>
          </div>
          <button
            className={`btn btn-sm ${completing ? 'btn-loading' : ''}`}
            style={{
              background: 'var(--color-warning)',
              color: '#000',
              fontWeight: 700,
              flexShrink: 0,
            }}
            onClick={handleCompletar}
            disabled={completing}
          >
            <Shuffle size={14} /> Completar sorteo
          </button>
        </div>
      )}


      <div className="grupos-tabs-nav">
        {/* Overview tab */}
        <button
          className={`grupo-tab-btn grupo-tab-all ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
          title="Ver todos los grupos"
        >
          <LayoutGrid size={13} />
          Todos
        </button>

        {/* Individual group tabs */}
        {gruposOrdenados.map(grupo => {
          const { total, done } = getGroupStats(grupo.id);
          const isComplete = total > 0 && done === total;
          // Extract the letter/name for the tab: "Grupo A" → "A"
          const tabLabel = grupo.nombre.replace('Grupo ', '').replace('grupo ', '');
          return (
            <button
              key={grupo.id}
              className={`grupo-tab-btn ${activeTab === grupo.id ? 'active' : ''} ${isComplete ? 'tab-complete' : ''}`}
              onClick={() => setActiveTab(grupo.id)}
              title={`${grupo.nombre} — ${done}/${total} partidos`}
            >
              {isComplete && activeTab !== grupo.id ? '✅ ' : ''}{tabLabel}
              {total > 0 && (
                <span className="grupo-tab-badge">{done}/{total}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      {activeTab === 'overview' ? (
        // All groups overview
        <div className="grupos-overview-grid">
          {gruposOrdenados.map((grupo, i) => (
            <GrupoCard
              key={grupo.id}
              grupo={grupo}
              partidos={partidos}
              criterios={criterios}
              currentUserId={user?.id}
              mejoresTerceros={config.mejoresTerceros}
              compact={true}
              animationDelay={i * 0.05}
              onSelectGroup={() => setActiveTab(grupo.id)}
            />
          ))}
        </div>
      ) : (
        // Single group detail
        activeGroup && (
          <div className="grupo-panel">
            <GrupoCard
              grupo={activeGroup}
              partidos={partidos}
              criterios={criterios}
              currentUserId={user?.id}
              mejoresTerceros={config.mejoresTerceros}
              compact={false}
              animationDelay={0}
            />
          </div>
        )
      )}
    </div>
  );
}

// ===========================
// Single Group Card
// ===========================
function GrupoCard({
  grupo,
  partidos,
  criterios,
  currentUserId,
  mejoresTerceros,
  compact,
  animationDelay,
  onSelectGroup,
}: {
  grupo: GrupoConJugadores;
  partidos: Partido[];
  criterios: CriteriosClasificacion;
  currentUserId?: string;
  mejoresTerceros: number;
  compact: boolean;
  animationDelay: number;
  onSelectGroup?: () => void;
}) {
  const [showMatches, setShowMatches] = useState(!compact);

  const clasificacion = calcularClasificacion(
    grupo,
    partidos,
    criterios.puntos_victoria,
    criterios.puntos_empate
  );

  const grupoPartidos = partidos.filter((p) => p.grupo_id === grupo.id);
  const done = grupoPartidos.filter(p => p.estado === 'finalizado').length;
  const clasificados = criterios.clasificados_por_grupo || 2;

  function getRowStatus(row: ClasificacionRow): 'classified' | 'third' | 'eliminated' {
    if (row.posicion <= clasificados) return 'classified';
    if (mejoresTerceros > 0 && row.posicion === clasificados + 1) return 'third';
    return 'eliminated';
  }

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Next pending opponent for a player within this group
  type OpponentInfo = { nombre: string; escudo: string | null; equipo: string } | null;
  function getNextOpponent(jugadorId: string): OpponentInfo {
    const pendientes = grupoPartidos
      .filter(
        (p) =>
          p.estado === 'pendiente' &&
          (p.jugador_local_id === jugadorId || p.jugador_visitante_id === jugadorId)
      )
      .sort((a, b) => {
        const fa = Number(a.fecha) || 999;
        const fb = Number(b.fecha) || 999;
        return fa - fb;
      });

    if (pendientes.length === 0) return null;

    const next = pendientes[0];
    const rivalId =
      next.jugador_local_id === jugadorId
        ? next.jugador_visitante_id
        : next.jugador_local_id;

    const rivalInfo = grupo.jugadores.find((j) => j.jugador_id === rivalId);
    if (!rivalInfo) return null;

    return {
      nombre: rivalInfo.jugador_nombre || '?',
      escudo: rivalInfo.equipo_escudo || null,
      equipo: rivalInfo.equipo_nombre || '',
    };
  }

  return (
    <div
      className="grupo-card fade-in"
      style={{ animationDelay: `${animationDelay}s` }}
    >
      {/* Card header */}
      <div
        className="grupo-card-header"
        style={onSelectGroup ? { cursor: 'pointer' } : {}}
        onClick={onSelectGroup}
      >
        <h3>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 6,
            background: 'var(--color-neon)', color: '#000',
            fontSize: '0.7rem', fontWeight: 900, flexShrink: 0,
          }}>
            {grupo.nombre.replace('Grupo ', '').replace('grupo ', '')}
          </span>
          {grupo.nombre}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="grupo-card-progress">
            <span className={`grupo-card-progress-dot ${done > 0 ? 'done' : ''}`} />
            {done}/{grupoPartidos.length}
          </span>
          <span className="grupo-count">{grupo.jugadores.length} jug.</span>
          {onSelectGroup && (
            <span style={{ fontSize: '0.65rem', color: 'var(--color-neon)', fontWeight: 700 }}>Ver →</span>
          )}
        </div>
      </div>

      {/* Classification Table */}
      <table className="tabla-clasificacion">
        <thead>
          <tr>
            <th>#</th>
            <th>Jugador / Equipo</th>
            <th>PJ</th>
            <th>PG</th>
            <th>PE</th>
            <th>PP</th>
            {!compact && <><th>GF</th><th>GC</th></>}
            <th>DG</th>
            <th>PTS</th>
            <th title="Próximo rival pendiente">Próx.</th>
          </tr>
        </thead>
        <tbody>
          {clasificacion.map((row) => {
            const status = getRowStatus(row);
            const isMe = row.jugador_id === currentUserId;

            return (
              <tr
                key={row.jugador_id}
                className={`row-${status} ${isMe ? 'row-me' : ''}`}
              >
                <td className="td-pos">
                  <span className={`pos-indicator pos-${status}`}>{row.posicion}</span>
                </td>
                <td>
                  <div className="tabla-player-full">
                    {/* Avatar jugador */}
                    {row.jugador_foto ? (
                      <img
                        src={row.jugador_foto}
                        alt={row.jugador_nombre}
                        className="tabla-avatar"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const next = (e.target as HTMLImageElement).nextElementSibling;
                          if (next) next.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`tabla-avatar-placeholder ${row.jugador_foto ? 'hidden' : ''}`}>
                      {getInitials(row.jugador_nombre)}
                    </div>

                    <span className="tabla-jugador-nombre" title={row.jugador_nombre}>{row.jugador_nombre}</span>

                    {/* Escudo equipo */}
                    {row.equipo_escudo ? (
                      <img
                        src={row.equipo_escudo}
                        alt={row.equipo_nombre}
                        className="tabla-escudo"
                        onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                      />
                    ) : (
                      <span className="tabla-escudo-emoji">⚽</span>
                    )}
                    <span className="tabla-equipo-nombre" title={row.equipo_nombre}>{row.equipo_nombre}</span>
                  </div>
                </td>
                <td>{row.pj}</td>
                <td>{row.pg}</td>
                <td>{row.pe}</td>
                <td>{row.pp}</td>
                {!compact && <><td>{row.gf}</td><td>{row.gc}</td></>}
                <td className={row.dg > 0 ? 'col-dg-pos' : row.dg < 0 ? 'col-dg-neg' : ''}>
                  {row.dg > 0 ? `+${row.dg}` : row.dg}
                </td>
                <td className="col-pts">{row.pts}</td>
                <td className="col-proximo">
                  {(() => {
                    const rival = getNextOpponent(row.jugador_id);
                    if (!rival) {
                      return <span className="proximo-done" title="Sin más partidos">✅</span>;
                    }
                    return (
                      <div className="proximo-rival" title={`Próximo: ${rival.equipo || rival.nombre}`}>
                        {rival.escudo ? (
                          <img
                            src={rival.escudo}
                            alt={rival.equipo}
                            className="proximo-escudo"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const sib = (e.target as HTMLImageElement).nextElementSibling;
                              if (sib) (sib as HTMLElement).style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <span
                          className="proximo-escudo-placeholder"
                          style={{ display: rival.escudo ? 'none' : 'flex' }}
                        >
                          {(rival.equipo || rival.nombre).charAt(0).toUpperCase()}
                        </span>
                        {!compact && (
                          <span className="proximo-nombre">{rival.equipo || rival.nombre}</span>
                        )}
                      </div>
                    );
                  })()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Group Matches */}
      {grupoPartidos.length > 0 && (
        <div className="grupo-partidos">
          <div className="grupo-partidos-header">
            <h4>
              <Gamepad2 size={13} />
              Partidos ({done}/{grupoPartidos.length})
            </h4>
            <button
              className="grupo-partidos-toggle"
              onClick={() => setShowMatches(!showMatches)}
            >
              {showMatches ? <><ChevronUp size={13} /> Ocultar</> : <><ChevronDown size={13} /> Ver partidos</>}
            </button>
          </div>

          {showMatches && Object.entries(
            grupoPartidos.reduce((acc, p) => {
              const f = p.fecha || '?';
              if (!acc[f]) acc[f] = [];
              acc[f].push(p);
              return acc;
            }, {} as Record<string, Partido[]>)
          )
            .sort(([a], [b]) => (a === '?' ? 1 : b === '?' ? -1 : Number(a) - Number(b)))
            .map(([fecha, ps]) => {
              const isHabilitada = (criterios.fechas_habilitadas || ['1']).includes(fecha);
              return (
                <div key={fecha} style={{ marginBottom: '0.75rem' }}>
                  <div className={`jornada-label ${isHabilitada ? '' : 'locked'}`}>
                    {isHabilitada ? '🔓' : '🔒'}
                    <span>Jornada {fecha}</span>
                    {!isHabilitada && <span style={{ opacity: 0.5 }}>— Bloqueada</span>}
                  </div>
                  {ps.map((p) => {
                    const localInfo = grupo.jugadores.find((j) => j.jugador_id === p.jugador_local_id);
                    const visitInfo = grupo.jugadores.find((j) => j.jugador_id === p.jugador_visitante_id);
                    return (
                      <div
                        key={p.id}
                        className="partido-row"
                        style={{ opacity: isHabilitada ? 1 : 0.6 }}
                      >
                        <div className="partido-equipo local">
                          <span>{localInfo?.equipo_nombre || localInfo?.jugador_nombre || '?'}</span>
                          {localInfo?.equipo_escudo && <img src={localInfo.equipo_escudo} alt="" />}
                        </div>
                        <div className={`partido-score ${p.estado === 'finalizado' ? 'finalizado' : 'pendiente'}`}>
                          {p.estado === 'finalizado' ? (
                            <><span>{p.goles_local}</span><span className="score-divider">-</span><span>{p.goles_visitante}</span></>
                          ) : (
                            <span>vs</span>
                          )}
                        </div>
                        <div className="partido-equipo visitante">
                          {visitInfo?.equipo_escudo && <img src={visitInfo.equipo_escudo} alt="" />}
                          <span>{visitInfo?.equipo_nombre || visitInfo?.jugador_nombre || '?'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
