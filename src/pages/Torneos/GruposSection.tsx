import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  useGrupos,
  calcularClasificacion,
  sortearGrupos,
  eliminarGrupos,
  type GrupoConJugadores,
  type ClasificacionRow,
} from '../../hooks/useGrupos';
import { calcularDistribucion } from '../../hooks/useBracket';
import type { Torneo, Partido, CriteriosClasificacion } from '../../types/database';
import { Shuffle, Trash2, Gamepad2, Info } from 'lucide-react';
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
    else { showToast('Grupos eliminados', 'success'); refetch(); }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <div className="spinner" />
      </div>
    );
  }

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
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Info size={14} /> Distribución automática para {jugadorIds.length} jugadores:
          </p>
          <div className="distrib-grid">
            <div className="distrib-item"><div className="distrib-value">{numGrupos}</div><div className="distrib-label">Grupos</div></div>
            <div className="distrib-item"><div className="distrib-value">~{Math.ceil(jugadorIds.length / numGrupos)}</div><div className="distrib-label">Por grupo</div></div>
            <div className="distrib-item"><div className="distrib-value">{recalc.totalClasificados}</div><div className="distrib-label">Clasifican</div></div>
            <div className="distrib-item"><div className="distrib-value">{faseLabel}</div><div className="distrib-label">Eliminatoria</div></div>
          </div>
          {recalc.mejoresTerceros > 0 && (
            <p style={{ color: 'var(--color-neon)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
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

  return (
    <div className="fade-in">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={handleReset} disabled={sorting} style={{ color: 'var(--color-danger)' }}>
            <Trash2 size={14} /> Reiniciar grupos
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="clasificacion-legend">
        <span className="legend-item legend-classified">Clasificado</span>
        {config.mejoresTerceros > 0 && (
          <span className="legend-item legend-third">Mejor tercero</span>
        )}
        <span className="legend-item legend-eliminated">Eliminado</span>
      </div>

      <div className="grupos-grid">
        {grupos.map((grupo) => (
          <GrupoCard
            key={grupo.id}
            grupo={grupo}
            partidos={partidos}
            criterios={criterios}
            currentUserId={user?.id}
            mejoresTerceros={config.mejoresTerceros}
          />
        ))}
      </div>
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
}: {
  grupo: GrupoConJugadores;
  partidos: Partido[];
  criterios: CriteriosClasificacion;
  currentUserId?: string;
  mejoresTerceros: number;
}) {
  const clasificacion = calcularClasificacion(
    grupo,
    partidos,
    criterios.puntos_victoria,
    criterios.puntos_empate
  );

  const grupoPartidos = partidos.filter((p) => p.grupo_id === grupo.id);
  const clasificados = criterios.clasificados_por_grupo || 2;

  function getRowStatus(row: ClasificacionRow): 'classified' | 'third' | 'eliminated' {
    if (row.posicion <= clasificados) return 'classified';
    if (mejoresTerceros > 0 && row.posicion === clasificados + 1) return 'third';
    return 'eliminated';
  }

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="grupo-card">
      <div className="grupo-card-header">
        <h3>{grupo.nombre}</h3>
        <span className="grupo-count">{grupo.jugadores.length} jugadores</span>
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
            <th>GF</th>
            <th>GC</th>
            <th>DG</th>
            <th>PTS</th>
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
                    {/* Foto de perfil del jugador */}
                    {row.jugador_foto ? (
                      <img
                        src={row.jugador_foto}
                        alt={row.jugador_nombre}
                        className="tabla-avatar"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div
                      className={`tabla-avatar-placeholder ${row.jugador_foto ? 'hidden' : ''}`}
                    >
                      {getInitials(row.jugador_nombre)}
                    </div>

                    {/* Nombre del jugador */}
                    <span className="tabla-jugador-nombre">{row.jugador_nombre}</span>

                    {/* Escudo del equipo */}
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

                    {/* Nombre del equipo */}
                    <span className="tabla-equipo-nombre">{row.equipo_nombre}</span>
                  </div>
                </td>
                <td>{row.pj}</td>
                <td>{row.pg}</td>
                <td>{row.pe}</td>
                <td>{row.pp}</td>
                <td>{row.gf}</td>
                <td>{row.gc}</td>
                <td className={row.dg > 0 ? 'col-dg-pos' : row.dg < 0 ? 'col-dg-neg' : ''}>
                  {row.dg > 0 ? `+${row.dg}` : row.dg}
                </td>
                <td className="col-pts">{row.pts}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Group Matches */}
      {grupoPartidos.length > 0 && (
        <div className="grupo-partidos">
          <h4>
            <Gamepad2 size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            Partidos ({grupoPartidos.filter((p) => p.estado === 'finalizado').length}/{grupoPartidos.length})
          </h4>
          {Object.entries(
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
                <div key={fecha} style={{ marginBottom: '1rem' }}>
                  <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-neon)', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Jornada {fecha} {!isHabilitada && <span style={{ color: 'var(--color-text-muted)' }}>- Bloqueada 🔒</span>}
                  </div>
                  {ps.map((p) => {
                    const localInfo = grupo.jugadores.find((j) => j.jugador_id === p.jugador_local_id);
                    const visitInfo = grupo.jugadores.find((j) => j.jugador_id === p.jugador_visitante_id);
                    return (
                      <div key={p.id} className="partido-row" style={{ opacity: isHabilitada ? 1 : 0.6 }}>
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
