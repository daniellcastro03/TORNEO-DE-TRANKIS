import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTorneos } from '../../hooks/useTorneos';
import { useGrupos } from '../../hooks/useGrupos';
import { supabase } from '../../lib/supabase';
import { registrarResultado, resetearResultado } from '../../hooks/useMisPartidos';
import { crearNotificacion } from '../../hooks/useNotificaciones';
import type { Partido } from '../../types/database';
import { ArrowLeft, Save, RotateCcw, Check, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import '../MisPartidos/MisPartidos.css';
import '../Torneos/Grupos.css';

const FASE_LABELS: Record<string, string> = {
  octavos: '🏟️ Octavos de Final',
  cuartos: '🏟️ Cuartos de Final',
  semifinal: '🏟️ Semifinal',
  tercer_puesto: '🥉 3er Puesto',
  final: '🏆 Final',
};

export default function ResultadosPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { torneos } = useTorneos();
  const torneosEnCurso = torneos.filter((t) => t.estado === 'en_curso');
  const [selectedTorneo, setSelectedTorneo] = useState<string>('');
  const [showOnlyPending, setShowOnlyPending] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (torneosEnCurso.length > 0 && !selectedTorneo) {
      setSelectedTorneo(torneosEnCurso[0].id);
    }
  }, [torneosEnCurso, selectedTorneo]);

  if (!isAdmin) { navigate('/'); return null; }

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="page-container fade-in">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')} style={{ marginBottom: '1rem' }}>
        <ArrowLeft size={16} /> Admin
      </button>
      <div className="page-header">
        <h1>⚽ Registrar Resultados</h1>
        <p>Ingresa los scores de los partidos jugados</p>
      </div>
      {torneosEnCurso.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">🏆</div>
          <h3>Sin torneos en curso</h3>
          <p>Inicia un torneo para poder registrar resultados</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={selectedTorneo} onChange={(e) => setSelectedTorneo(e.target.value)} style={{ flex: 1, minWidth: 200 }}>
              {torneosEnCurso.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tipo === 'champions' ? '🏆' : t.tipo === 'mundial' ? '🌍' : '⚽'} {t.nombre}
                </option>
              ))}
            </select>
            <button className={`catalogo-tab ${showOnlyPending ? 'active' : ''}`} onClick={() => setShowOnlyPending(!showOnlyPending)}>
              <Filter size={14} />
              {showOnlyPending ? 'Solo pendientes' : 'Todos'}
            </button>
          </div>
          {selectedTorneo && (
            <PartidosEditor
              torneo={torneosEnCurso.find((t) => t.id === selectedTorneo)!}
              showOnlyPending={showOnlyPending}
              showToast={showToast}
            />
          )}
        </>
      )}
    </div>
  );
}

// ========================
function PartidosEditor({
  torneo, showOnlyPending, showToast,
}: {
  torneo: any;
  showOnlyPending: boolean;
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const torneoId = torneo.id;
  const { grupos, partidos, loading, refetch } = useGrupos(torneoId);
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [golesLocal, setGolesLocal] = useState(0);
  const [golesVisitante, setGolesVisitante] = useState(0);
  const [saving, setSaving] = useState(false);
  const [openingDate, setOpeningDate] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  // Local copy of enabled dates — initialized from torneo prop, updated after habilitarFecha
  const [fechasHabilitadas, setFechasHabilitadas] = useState<string[]>(
    torneo.criterios_json?.fechas_habilitadas || ['1']
  );

  // Sync when torneo changes (different tournament selected)
  useEffect(() => {
    setFechasHabilitadas(torneo.criterios_json?.fechas_habilitadas || ['1']);
  }, [torneoId]);

  const [playerMap, setPlayerMap] = useState<Record<string, { nombre: string; escudo: string | null }>>({});

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('torneo_inscripciones')
        .select('jugador_id, jugadores:jugador_id (nombre), catalogos_equipos:catalogo_equipo_id (*)')
        .eq('torneo_id', torneoId);
      if (data) {
        const map: Record<string, { nombre: string; escudo: string | null }> = {};
        for (const i of data as any[]) {
          map[i.jugador_id] = {
            nombre: i.catalogos_equipos?.nombre || i.jugadores?.nombre || 'Jugador',
            escudo: i.catalogos_equipos?.escudo_url || null,
          };
        }
        setPlayerMap(map);
      }
    }
    if (torneoId) load();
  }, [torneoId, partidos]);

  const filteredPartidos = showOnlyPending ? partidos.filter((p) => p.estado === 'pendiente') : partidos;

  const toggleSection = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const getPlayerInfo = (id: string): { equipo: string; jugador: string; escudo: string | null } => {
    for (const g of grupos) {
      const j = g.jugadores.find((jg) => jg.jugador_id === id);
      if (j) return {
        equipo: j.equipo_nombre || j.jugador_nombre || 'Jugador',
        jugador: j.jugador_nombre || '',
        escudo: j.equipo_escudo || null,
      };
    }
    const pm = playerMap[id];
    return {
      equipo: pm?.nombre || 'Jugador',
      jugador: '',
      escudo: pm?.escudo || null,
    };
  };

  const getPlayerName = (id: string): string => {
    const info = getPlayerInfo(id);
    return info.equipo;
  };

  const startEdit = (p: Partido) => {
    setEditingMatch(p.id);
    setGolesLocal(p.goles_local ?? 0);
    setGolesVisitante(p.goles_visitante ?? 0);
  };

  const handleSave = async (p: Partido) => {
    setSaving(true);
    const { error } = await registrarResultado(p.id, golesLocal, golesVisitante);
    setSaving(false);
    if (error) {
      showToast(error, 'error');
    } else {
      showToast(`Resultado: ${golesLocal} - ${golesVisitante}`, 'success');
      try {
        const ln = getPlayerName(p.jugador_local_id);
        const vn = getPlayerName(p.jugador_visitante_id);
        crearNotificacion(p.jugador_local_id, 'resultado', '📊 Resultado registrado', `${ln} ${golesLocal} - ${golesVisitante} ${vn}`);
        crearNotificacion(p.jugador_visitante_id, 'resultado', '📊 Resultado registrado', `${ln} ${golesLocal} - ${golesVisitante} ${vn}`);
      } catch {}
      setEditingMatch(null);
      refetch();
    }
  };

  const handleReset = async (p: Partido) => {
    if (!confirm('¿Resetear este resultado?')) return;
    const { error } = await resetearResultado(p.id);
    if (error) showToast(error, 'error');
    else { showToast('Resultado reseteado', 'success'); refetch(); }
  };

  const handleHabilitar = async (fecha: string) => {
    if (!confirm(`¿Abrir Jornada ${fecha}?`)) return;
    setOpeningDate(fecha);
    const { habilitarFecha } = await import('../../hooks/useTorneos');
    const { error } = await habilitarFecha(torneoId, fecha);
    setOpeningDate(null);
    if (error) showToast(error, 'error');
    else {
      showToast(`¡Jornada ${fecha} habilitada!`, 'success');
      setFechasHabilitadas(prev => prev.includes(fecha) ? prev : [...prev, fecha]);
      refetch();
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spinner" /></div>;

  if (grupos.length === 0 && partidos.length === 0) {
    return (
      <div className="empty-state card" style={{ padding: '2rem' }}>
        <div className="empty-state-icon">🎲</div>
        <h3>Sin partidos generados</h3>
        <p>Sortea los grupos en el detalle del torneo primero</p>
      </div>
    );
  }

  const totalFinished = partidos.filter((p) => p.estado === 'finalizado').length;
  const totalPending = partidos.filter((p) => p.estado === 'pendiente').length;

  function SectionHeader({ id, label, finished, total }: { id: string; label: string; finished: number; total: number }) {
    return (
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.6rem 0.75rem',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          marginBottom: '0.75rem',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => toggleSection(id)}
      >
        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-neon)', fontFamily: 'var(--font-display)' }}>
          {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.72rem', color: finished === total ? 'var(--color-neon)' : 'var(--color-text-muted)' }}>
            {finished}/{total} {finished === total && total > 0 ? '✅' : ''}
          </span>
          {collapsed[id] ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>
    );
  }

  function renderMatchCard(p: Partido, isHabilitado: boolean) {
    const localInfo = getPlayerInfo(p.jugador_local_id);
    const visitInfo = getPlayerInfo(p.jugador_visitante_id);
    const isEditing = editingMatch === p.id;

    return (
      <div key={p.id} className="match-card" style={{ marginBottom: '0.5rem', opacity: isHabilitado ? 1 : 0.55 }}>
        <div className="match-card-body">
          <div className="match-team">
            {localInfo.escudo
              ? <img src={localInfo.escudo} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
              : <div className="equipo-escudo-placeholder" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>{localInfo.equipo[0]}</div>
            }
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span className="match-team-name" style={{ fontSize: '0.75rem' }}>{localInfo.equipo}</span>
              {localInfo.jugador && localInfo.jugador !== localInfo.equipo && (
                <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {localInfo.jugador}
                </span>
              )}
            </div>
          </div>
          <div className="match-score-center">
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="number" className="result-score-input" value={golesLocal} onChange={(e) => setGolesLocal(Math.max(0, parseInt(e.target.value) || 0))} min={0} max={99} />
                <span className="result-divider">-</span>
                <input type="number" className="result-score-input" value={golesVisitante} onChange={(e) => setGolesVisitante(Math.max(0, parseInt(e.target.value) || 0))} min={0} max={99} />
              </div>
            ) : p.estado === 'finalizado' ? (
              <div className="match-score">
                <span className="score-num">{p.goles_local}</span>
                <span className="score-divider">-</span>
                <span className="score-num">{p.goles_visitante}</span>
              </div>
            ) : (
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>vs</span>
            )}
          </div>
          <div className="match-team">
            {visitInfo.escudo
              ? <img src={visitInfo.escudo} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
              : <div className="equipo-escudo-placeholder" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>{visitInfo.equipo[0]}</div>
            }
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span className="match-team-name" style={{ fontSize: '0.75rem' }}>{visitInfo.equipo}</span>
              {visitInfo.jugador && visitInfo.jugador !== visitInfo.equipo && (
                <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {visitInfo.jugador}
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem' }}>
          {isEditing ? (
            <>
              <button className={`btn btn-primary btn-sm ${saving ? 'btn-loading' : ''}`} onClick={() => handleSave(p)} disabled={saving}>
                <Save size={14} /> Guardar
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingMatch(null)} disabled={saving}>Cancelar</button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => startEdit(p)} disabled={!isHabilitado}>
                {p.estado === 'finalizado' ? 'Editar' : 'Ingresar resultado'}
              </button>
              {p.estado === 'finalizado' && (
                <button className="btn btn-ghost btn-sm" onClick={() => handleReset(p)} style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>
                  <RotateCcw size={12} /> Reset
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Jornadas únicas de fase de grupos
  const jornadas = [...new Set(
    partidos.filter(p => p.fase === 'grupos').map(p => p.fecha || '?')
  )].sort((a, b) => a === '?' ? 1 : b === '?' ? -1 : Number(a) - Number(b));

  const gruposPartidosTotal = partidos.filter(p => p.fase === 'grupos');
  const gruposPartidosFinished = gruposPartidosTotal.filter(p => p.estado === 'finalizado');

  return (
    <div>
      {/* Progress */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
            <span style={{ color: 'var(--color-neon)' }}>{totalFinished} jugados</span>
            <span style={{ color: 'var(--color-text-muted)' }}>{totalPending} pendientes</span>
          </div>
          <div className="torneo-progress-bar" style={{ height: 6 }}>
            <div className="torneo-progress-fill" style={{ width: `${partidos.length > 0 ? (totalFinished / partidos.length) * 100 : 0}%` }} />
          </div>
        </div>
        {totalFinished === partidos.length && partidos.length > 0 && (
          <span className="badge badge-neon" style={{ fontSize: '0.7rem' }}><Check size={12} /> ¡Completo!</span>
        )}
      </div>

      {/* Fase de Grupos */}
      {grupos.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <SectionHeader id="fase_grupos" label="⚽ Fase de Grupos" finished={gruposPartidosFinished.length} total={gruposPartidosTotal.length} />
          {!collapsed['fase_grupos'] && jornadas.map(jornada => {
            const isHabilitada = fechasHabilitadas.includes(jornada);
            const jornadaAll = partidos.filter(p => p.fase === 'grupos' && (p.fecha || '?') === jornada);
            const jornadaFiltered = filteredPartidos.filter(p => p.fase === 'grupos' && (p.fecha || '?') === jornada);
            if (jornadaFiltered.length === 0 && showOnlyPending) return null;

            return (
              <div key={jornada} style={{ marginBottom: '1rem' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.4rem 0.75rem',
                  background: isHabilitada ? 'rgba(57,255,20,0.06)' : 'rgba(255,255,255,0.02)',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${isHabilitada ? 'var(--color-border-neon)' : 'var(--color-border)'}`,
                  marginBottom: '0.5rem',
                  cursor: 'pointer',
                }}
                  onClick={() => toggleSection(`jornada_${jornada}`)}
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isHabilitada ? 'var(--color-neon)' : 'var(--color-text-secondary)' }}>
                    {isHabilitada ? '🔓' : '🔒'} Jornada {jornada}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {!isHabilitada && jornada !== '?' && (
                      <button
                        className={`btn btn-primary btn-sm ${openingDate === jornada ? 'btn-loading' : ''}`}
                        onClick={(e) => { e.stopPropagation(); handleHabilitar(jornada); }}
                        disabled={openingDate === jornada}
                        style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                      >
                        Abrir
                      </button>
                    )}
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      {jornadaAll.filter(p => p.estado === 'finalizado').length}/{jornadaAll.length}
                    </span>
                    {collapsed[`jornada_${jornada}`] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                {!collapsed[`jornada_${jornada}`] && grupos
                  .slice().sort((a, b) => a.nombre.localeCompare(b.nombre))
                  .map(grupo => {
                    const gps = jornadaFiltered.filter(p => p.grupo_id === grupo.id);
                    if (gps.length === 0) return null;
                    return (
                      <div key={grupo.id} style={{ marginBottom: '0.75rem' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-neon)', marginBottom: '0.35rem', fontWeight: 600, paddingLeft: '0.5rem' }}>
                          {grupo.nombre}
                        </div>
                        {gps.map(p => renderMatchCard(p, isHabilitada))}
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      )}

      {/* Fases eliminatorias */}
      {(['octavos', 'cuartos', 'semifinal', 'tercer_puesto', 'final'] as const).map((fase) => {
        const allFaseMatches = partidos.filter((p) => p.fase === fase);
        if (allFaseMatches.length === 0) return null;
        const visibleMatches = filteredPartidos.filter((p) => p.fase === fase);
        return (
          <div key={fase} style={{ marginBottom: '1.25rem' }}>
            <SectionHeader
              id={`fase_${fase}`}
              label={FASE_LABELS[fase]}
              finished={allFaseMatches.filter(p => p.estado === 'finalizado').length}
              total={allFaseMatches.length}
            />
            {!collapsed[`fase_${fase}`] && (
              visibleMatches.length === 0 && showOnlyPending ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', padding: '0.5rem 0.75rem' }}>
                  ✅ Todos los partidos de esta fase están jugados
                </p>
              ) : (
                visibleMatches.map(p => renderMatchCard(p, true))
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
