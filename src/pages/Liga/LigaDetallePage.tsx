import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { LigaJugadorConDetalles } from '../../hooks/useLiga';
import {
  useLigaDetalle,
  calcularClasificacionLiga,
  actualizarLiga,
  eliminarLiga,
  generarCalendarioLiga,
  generarFACup,
  avanzarFaseFACup,
  registrarResultadoLiga,
  resetearResultadoLiga,
  removerJugadorLiga,
  toggleActivoJugador,
  agregarJugadorLiga,
  fetchAllJugadores,
} from '../../hooks/useLiga';
import DivisionTable from './DivisionTable';
import FACupBracket from './FACupBracket';
import type { LigaPartido, Jugador, DivisionLiga } from '../../types/database';
import {
  ArrowLeft, Trophy, Users, Play, StopCircle, Trash2,
  ChevronDown, ChevronRight, Save, RotateCcw, Shuffle,
  UserMinus, UserCheck, Settings, X, Plus, UserPlus
} from 'lucide-react';
import './Liga.css';

const DIVISION_COLORS = {
  primera: 'var(--color-neon)',
  segunda: '#3b82f6',
};

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function LigaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { liga, jugadores, partidos, loading, refetch } = useLigaDetalle(id);

  const [activeTab, setActiveTab] = useState<'primera' | 'segunda' | 'fa_cup' | 'partidos' | 'gestionar'>('primera');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Results editor state
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [golesLocal, setGolesLocal] = useState(0);
  const [golesVisitante, setGolesVisitante] = useState(0);
  const [saving, setSaving] = useState(false);
  const [filterComp, setFilterComp] = useState<'all' | 'primera' | 'segunda' | 'fa_cup'>('all');
  const [showOnlyPending, setShowOnlyPending] = useState(true);

  // Player management state
  const [allJugadores, setAllJugadores] = useState<Jugador[]>([]);
  const [addingDiv, setAddingDiv] = useState<DivisionLiga | null>(null);
  const [selectedNewPlayer, setSelectedNewPlayer] = useState<string>('');
  const [addingPlayerLoading, setAddingPlayerLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'gestionar' && isAdmin) {
      fetchAllJugadores().then(setAllJugadores);
    }
  }, [activeTab, isAdmin]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (!liga) {
    return (
      <div className="liga-page">
        <div className="empty-state card">
          <div className="empty-state-icon">❌</div>
          <h3>Liga no encontrada</h3>
          <button className="btn btn-secondary" onClick={() => navigate('/liga')} style={{ marginTop: '1rem' }}>
            Volver a Ligas
          </button>
        </div>
      </div>
    );
  }

  // Classification
  const clasPrimera = calcularClasificacionLiga(jugadores, partidos, 'primera');
  const clasSegunda = calcularClasificacionLiga(jugadores, partidos, 'segunda');

  const jugadoresPrimera = jugadores.filter(j => j.division === 'primera' && j.activo);
  const jugadoresSegunda = jugadores.filter(j => j.division === 'segunda' && j.activo);

  // Admin actions
  const handleIniciarLiga = async () => {
    if (!id) return;
    if (jugadoresPrimera.length < 2 && jugadoresSegunda.length < 2) {
      showToast('Se necesitan jugadores en las divisiones para iniciar', 'error');
      return;
    }
    if (!confirm(`¿Iniciar la liga "${liga.nombre}" y generar el calendario?`)) return;
    setActionLoading(true);
    const { error } = await generarCalendarioLiga(id, jugadores, liga.ida_vuelta);
    setActionLoading(false);
    if (error) showToast(error, 'error');
    else { showToast('¡Calendario generado! La liga está en curso.', 'success'); refetch(); }
  };

  const handleFinalizarLiga = async () => {
    if (!id) return;
    if (!confirm('¿Finalizar la liga? No podrás editar más resultados.')) return;
    setActionLoading(true);
    const { error } = await actualizarLiga(id, { estado: 'finalizada' });
    setActionLoading(false);
    if (error) showToast(error, 'error');
    else { showToast('Liga finalizada', 'success'); refetch(); }
  };

  const handleEliminar = async () => {
    if (!id) return;
    if (!confirm(`¿Eliminar "${liga.nombre}"? Esta acción no se puede deshacer.`)) return;
    setActionLoading(true);
    const { error } = await eliminarLiga(id);
    setActionLoading(false);
    if (error) showToast(error, 'error');
    else navigate('/liga');
  };

  const handleGenerarFACup = async () => {
    if (!id) return;
    if (!confirm('¿Generar sorteo de la FA Cup? Se sortearán todos los jugadores activos de forma aleatoria.')) return;
    setActionLoading(true);
    const { error } = await generarFACup(id, jugadores);
    setActionLoading(false);
    if (error) showToast(error, 'error');
    else { showToast('¡FA Cup sorteada!', 'success'); setActiveTab('fa_cup'); refetch(); }
  };

  const handleAvanzarFACup = async () => {
    if (!id) return;
    if (!confirm('¿Avanzar a la siguiente ronda de la FA Cup?')) return;
    setActionLoading(true);
    const { error } = await avanzarFaseFACup(id, partidos);
    setActionLoading(false);
    if (error) showToast(error, 'error');
    else { showToast('¡Siguiente ronda generada!', 'success'); refetch(); }
  };

  const handleRemover = async (jugadorId: string, nombre: string) => {
    if (!id) return;
    if (!confirm(`¿Remover a ${nombre} de la liga? Si hay partidos ya jugados, su historial se mantendrá pero quedará fuera del torneo.`)) return;
    const { error } = await removerJugadorLiga(id, jugadorId);
    if (error) showToast(error, 'error');
    else { showToast(`${nombre} removido`, 'success'); refetch(); }
  };

  const handleToggleActivo = async (jugadorId: string, activo: boolean, nombre: string) => {
    if (!id) return;
    const { error } = await toggleActivoJugador(id, jugadorId, !activo);
    if (error) showToast(error, 'error');
    else { showToast(`${nombre} ${!activo ? 'activado' : 'desactivado (abandonó)'}`, 'success'); refetch(); }
  };

  const handleAddPlayer = async (division: DivisionLiga) => {
    if (!id || !selectedNewPlayer) return;
    setAddingPlayerLoading(true);
    const { error } = await agregarJugadorLiga(id, selectedNewPlayer, division);
    setAddingPlayerLoading(false);
    if (error) {
      showToast(error, 'error');
    } else {
      showToast('Jugador añadido exitosamente', 'success');
      setSelectedNewPlayer('');
      setAddingDiv(null);
      refetch();
    }
  };

  // Results editing
  const startEdit = (p: LigaPartido) => {
    setEditingMatch(p.id);
    setGolesLocal(p.goles_local ?? 0);
    setGolesVisitante(p.goles_visitante ?? 0);
  };

  const handleSave = async (p: LigaPartido) => {
    setSaving(true);
    const { error } = await registrarResultadoLiga(p.id, golesLocal, golesVisitante);
    setSaving(false);
    if (error) showToast(error, 'error');
    else {
      showToast(`Resultado: ${golesLocal} - ${golesVisitante}`, 'success');
      setEditingMatch(null);
      refetch();
    }
  };

  const handleReset = async (p: LigaPartido) => {
    if (!confirm('¿Resetear este resultado?')) return;
    const { error } = await resetearResultadoLiga(p.id);
    if (error) showToast(error, 'error');
    else { showToast('Resultado reseteado', 'success'); refetch(); }
  };

  const getJugador = (id: string) => jugadores.find(j => j.jugador_id === id);

  // Filtered partidos for "Partidos" tab
  const filteredPartidos = partidos.filter(p => {
    if (filterComp !== 'all' && p.competicion !== filterComp) return false;
    if (showOnlyPending && p.estado !== 'pendiente') return false;
    return true;
  });

  // Group partidos by (competicion, jornada/fase)
  const groupPartidos = () => {
    const groups: { key: string; label: string; competicion: string; partidos: LigaPartido[] }[] = [];
    const seen = new Set<string>();
    for (const p of filteredPartidos) {
      const key = p.competicion === 'fa_cup'
        ? `fa_cup_${p.fase}`
        : `${p.competicion}_j${p.jornada}`;
      if (!seen.has(key)) {
        seen.add(key);
        const compLabel = p.competicion === 'primera' ? '1ª División' : p.competicion === 'segunda' ? '2ª División' : 'FA Cup';
        const subLabel = p.competicion === 'fa_cup'
          ? (({ ronda_32: '32avos', ronda_16: '16avos', octavos: 'Octavos', cuartos: 'Cuartos', semifinal: 'Semifinal', final: 'Final' } as Record<string, string>)[p.fase] || p.fase)
          : `Jornada ${p.jornada}`;
        groups.push({ key, label: `${compLabel} — ${subLabel}`, competicion: p.competicion, partidos: [] });
      }
      groups.find(g => g.key === key)!.partidos.push(p);
    }
    return groups;
  };

  const grupos = groupPartidos();

  // Tab label helpers
  const pendientesPrimera = partidos.filter(p => p.competicion === 'primera' && p.estado === 'pendiente').length;
  const pendientesSegunda = partidos.filter(p => p.competicion === 'segunda' && p.estado === 'pendiente').length;
  const pendientesFaCup = partidos.filter(p => p.competicion === 'fa_cup' && p.estado === 'pendiente').length;
  const totalPendientes = pendientesPrimera + pendientesSegunda + pendientesFaCup;

  const estadoBadge = {
    configuracion: { label: '⚙️ Configuración', color: 'var(--color-text-muted)' },
    en_curso: { label: '⚡ En curso', color: 'var(--color-neon)' },
    finalizada: { label: '🏁 Finalizada', color: 'var(--color-text-muted)' },
  }[liga.estado];

  return (
    <div className="liga-page fade-in">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      {/* Back */}
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/liga')} style={{ marginBottom: '1rem' }}>
        <ArrowLeft size={16} /> Ligas
      </button>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ color: 'var(--color-neon)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🏟️ {liga.nombre}
            </h1>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-neon" style={{ fontSize: '0.7rem', color: estadoBadge.color }}>
                {estadoBadge.label}
              </span>
              <span className="badge badge-draw" style={{ fontSize: '0.7rem' }}>
                <Users size={11} /> {jugadoresPrimera.length} + {jugadoresSegunda.length} jugadores
              </span>
              {liga.ida_vuelta && (
                <span className="badge badge-draw" style={{ fontSize: '0.7rem' }}>🔄 Ida y vuelta</span>
              )}
            </div>
          </div>

          {/* Admin controls */}
          {isAdmin && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {liga.estado === 'configuracion' && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleIniciarLiga}
                  disabled={actionLoading}
                >
                  <Play size={15} /> Iniciar Liga
                </button>
              )}
              {liga.estado === 'en_curso' && (
                <>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleGenerarFACup}
                    disabled={actionLoading}
                  >
                    <Shuffle size={15} /> {partidos.some(p => p.competicion === 'fa_cup') ? 'Reiniciar FA Cup' : 'Sortear FA Cup'}
                  </button>
                  {partidos.some(p => p.competicion === 'fa_cup') && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleAvanzarFACup}
                      disabled={actionLoading}
                    >
                      <Trophy size={15} /> Siguiente ronda FA Cup
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={handleFinalizarLiga}
                    disabled={actionLoading}
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <StopCircle size={15} /> Finalizar
                  </button>
                </>
              )}
              <button
                className="btn btn-danger btn-sm"
                onClick={handleEliminar}
                disabled={actionLoading}
              >
                <Trash2 size={15} /> Eliminar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="liga-tabs">
        <button
          className={`liga-tab ${activeTab === 'primera' ? 'active' : ''}`}
          id="liga-tab-primera"
          onClick={() => setActiveTab('primera')}
        >
          🥇 1ª División
          {pendientesPrimera > 0 && <span className="tab-badge">{pendientesPrimera}</span>}
        </button>
        <button
          className={`liga-tab ${activeTab === 'segunda' ? 'active' : ''}`}
          id="liga-tab-segunda"
          onClick={() => setActiveTab('segunda')}
        >
          🥈 2ª División
          {pendientesSegunda > 0 && <span className="tab-badge">{pendientesSegunda}</span>}
        </button>
        <button
          className={`liga-tab ${activeTab === 'fa_cup' ? 'active' : ''}`}
          id="liga-tab-facup"
          onClick={() => setActiveTab('fa_cup')}
        >
          🏆 FA Cup
          {pendientesFaCup > 0 && <span className="tab-badge">{pendientesFaCup}</span>}
        </button>
        {isAdmin && (
          <>
            <button
              className={`liga-tab ${activeTab === 'partidos' ? 'active' : ''}`}
              id="liga-tab-partidos"
              onClick={() => setActiveTab('partidos')}
            >
              ⚽ Resultados
              {totalPendientes > 0 && <span className="tab-badge">{totalPendientes}</span>}
            </button>
            <button
              className={`liga-tab ${activeTab === 'gestionar' ? 'active' : ''}`}
              id="liga-tab-gestionar"
              onClick={() => setActiveTab('gestionar')}
            >
              <Settings size={13} /> Gestionar
            </button>
          </>
        )}
      </div>

      {/* ── Tab Content ── */}

      {/* Primera División */}
      {activeTab === 'primera' && (
        <div className="fade-in">
          <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1rem', color: DIVISION_COLORS.primera, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              🥇 Primera División
              <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-body)', fontWeight: 400, color: 'var(--color-text-muted)' }}>
                {jugadoresPrimera.length} jugadores
              </span>
            </h2>
          </div>
          <DivisionTable
            clasificacion={clasPrimera}
            division="primera"
            totalJugadores={jugadoresPrimera.length}
          />

          {/* Matches preview */}
          {partidos.filter(p => p.competicion === 'primera').length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <MatchesPreview
                partidos={partidos.filter(p => p.competicion === 'primera')}
                jugadores={jugadores}
                currentUserId={user?.id}
              />
            </div>
          )}
        </div>
      )}

      {/* Segunda División */}
      {activeTab === 'segunda' && (
        <div className="fade-in">
          <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1rem', color: DIVISION_COLORS.segunda, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              🥈 Segunda División
              <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-body)', fontWeight: 400, color: 'var(--color-text-muted)' }}>
                {jugadoresSegunda.length} jugadores
              </span>
            </h2>
          </div>
          <DivisionTable
            clasificacion={clasSegunda}
            division="segunda"
            totalJugadores={jugadoresSegunda.length}
          />

          {/* Matches preview */}
          {partidos.filter(p => p.competicion === 'segunda').length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <MatchesPreview
                partidos={partidos.filter(p => p.competicion === 'segunda')}
                jugadores={jugadores}
                currentUserId={user?.id}
              />
            </div>
          )}
        </div>
      )}

      {/* FA Cup */}
      {activeTab === 'fa_cup' && (
        <div className="fade-in">
          <FACupBracket partidos={partidos} jugadores={jugadores} />
        </div>
      )}

      {/* Resultados (admin) */}
      {activeTab === 'partidos' && isAdmin && (
        <div className="fade-in">
          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {(['all', 'primera', 'segunda', 'fa_cup'] as const).map(c => (
              <button
                key={c}
                className={`btn btn-sm ${filterComp === c ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilterComp(c)}
              >
                {c === 'all' ? 'Todos' : c === 'primera' ? '1ª Div' : c === 'segunda' ? '2ª Div' : 'FA Cup'}
              </button>
            ))}
            <button
              className={`btn btn-sm ${showOnlyPending ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setShowOnlyPending(!showOnlyPending)}
            >
              {showOnlyPending ? '🔒 Solo pendientes' : '📋 Todos'}
            </button>
          </div>

          {filteredPartidos.length === 0 ? (
            <div className="empty-state card" style={{ padding: '2rem' }}>
              <div className="empty-state-icon">✅</div>
              <h3>Sin partidos</h3>
              <p>{showOnlyPending ? 'No hay partidos pendientes' : 'No hay partidos generados aún'}</p>
            </div>
          ) : (
            <div>
              {grupos.map(g => {
                const isCollapsed = collapsed[g.key];
                const done = g.partidos.filter(p => p.estado === 'finalizado').length;
                return (
                  <div key={g.key} style={{ marginBottom: '1rem' }}>
                    <div
                      className="jornada-header"
                      onClick={() => setCollapsed(prev => ({ ...prev, [g.key]: !prev[g.key] }))}
                    >
                      <h4>
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                        {g.label}
                      </h4>
                      <span className="jornada-progress">{done}/{g.partidos.length} {done === g.partidos.length && g.partidos.length > 0 ? '✅' : ''}</span>
                    </div>
                    {!isCollapsed && g.partidos.map(p => {
                      const local = getJugador(p.jugador_local_id);
                      const visita = getJugador(p.jugador_visitante_id);
                      const isEditing = editingMatch === p.id;
                      return (
                        <div key={p.id} className="liga-match-card" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {/* Local */}
                            <div className="liga-match-team">
                              {local?.jugador_foto ? (
                                <img src={local.jugador_foto} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                              ) : (
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#2bcc10,#39FF14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 800, color: '#000', flexShrink: 0 }}>
                                  {getInitials(local?.jugador_nombre || '?')}
                                </div>
                              )}
                              <span className="liga-match-team-name">{local?.jugador_nombre || '?'}</span>
                            </div>

                            {/* Score */}
                            {isEditing ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 100, justifyContent: 'center' }}>
                                <input
                                  type="number"
                                  value={golesLocal}
                                  onChange={e => setGolesLocal(Math.max(0, parseInt(e.target.value) || 0))}
                                  style={{ width: 40, textAlign: 'center', padding: '0.3rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}
                                  min={0} max={99}
                                />
                                <span style={{ color: 'var(--color-text-muted)' }}>-</span>
                                <input
                                  type="number"
                                  value={golesVisitante}
                                  onChange={e => setGolesVisitante(Math.max(0, parseInt(e.target.value) || 0))}
                                  style={{ width: 40, textAlign: 'center', padding: '0.3rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}
                                  min={0} max={99}
                                />
                              </div>
                            ) : p.estado === 'finalizado' ? (
                              <div className="liga-match-score">{p.goles_local} - {p.goles_visitante}</div>
                            ) : (
                              <div className="liga-match-vs">vs</div>
                            )}

                            {/* Visita */}
                            <div className="liga-match-team away">
                              <span className="liga-match-team-name">{visita?.jugador_nombre || '?'}</span>
                              {visita?.jugador_foto ? (
                                <img src={visita.jugador_foto} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                              ) : (
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#2bcc10,#39FF14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 800, color: '#000', flexShrink: 0 }}>
                                  {getInitials(visita?.jugador_nombre || '?')}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginTop: '0.6rem' }}>
                            {isEditing ? (
                              <>
                                <button
                                  className={`btn btn-primary btn-sm ${saving ? 'btn-loading' : ''}`}
                                  onClick={() => handleSave(p)}
                                  disabled={saving}
                                >
                                  <Save size={13} /> Guardar
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => setEditingMatch(null)}
                                  disabled={saving}
                                >
                                  <X size={13} /> Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                <button className="btn btn-secondary btn-sm" onClick={() => startEdit(p)}>
                                  {p.estado === 'finalizado' ? 'Editar' : 'Ingresar resultado'}
                                </button>
                                {p.estado === 'finalizado' && (
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => handleReset(p)}
                                    style={{ color: 'var(--color-danger)', fontSize: '0.72rem' }}
                                  >
                                    <RotateCcw size={12} /> Reset
                                  </button>
                                )}
                              </>
                            )}
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
      )}

      {/* Gestionar (admin) */}
      {activeTab === 'gestionar' && isAdmin && (
        <div className="fade-in">
          <div style={{ marginBottom: '1rem', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
            Gestiona los participantes de cada división. Puedes desactivar o eliminar jugadores que no concluyan el torneo o agregar reemplazos en cualquier momento.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {/* Primera */}
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h3 style={{ color: DIVISION_COLORS.primera, fontSize: '0.95rem', margin: 0 }}>
                  🥇 Primera División ({jugadoresPrimera.length})
                </h3>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setAddingDiv(addingDiv === 'primera' ? null : 'primera'); setSelectedNewPlayer(''); }}
                  style={{ color: 'var(--color-neon)', fontSize: '0.75rem', padding: '3px 8px' }}
                >
                  <Plus size={14} /> Añadir
                </button>
              </div>

              {addingDiv === 'primera' && (
                <div style={{ padding: '0.75rem', background: 'rgba(57,255,20,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-neon)', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-neon)', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Añadir jugador a 1ª División:
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select
                      value={selectedNewPlayer}
                      onChange={e => setSelectedNewPlayer(e.target.value)}
                      style={{ flex: 1, padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: '0.75rem' }}
                    >
                      <option value="">Seleccionar jugador...</option>
                      {allJugadores
                        .filter(j => !jugadores.some(lj => lj.jugador_id === j.id))
                        .map(j => (
                          <option key={j.id} value={j.id}>{j.nombre}</option>
                        ))}
                    </select>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleAddPlayer('primera')}
                      disabled={!selectedNewPlayer || addingPlayerLoading}
                    >
                      <UserPlus size={13} />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setAddingDiv(null)}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              )}

              {jugadores.filter(j => j.division === 'primera').map(j => (
                <div
                  key={j.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.55rem 0.75rem',
                    background: j.activo ? 'var(--color-bg-card)' : 'rgba(255,59,59,0.04)',
                    border: `1px solid ${j.activo ? 'var(--color-border)' : 'rgba(255,59,59,0.2)'}`,
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '0.35rem',
                    opacity: j.activo ? 1 : 0.6,
                  }}
                >
                  {j.jugador_foto ? (
                    <img src={j.jugador_foto} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#2bcc10,#39FF14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 800, color: '#000', flexShrink: 0 }}>
                      {getInitials(j.jugador_nombre)}
                    </div>
                  )}
                  <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {j.jugador_nombre} {!j.activo && <span style={{ color: 'var(--color-danger)', fontSize: '0.65rem' }}>(Inactivo)</span>}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleToggleActivo(j.jugador_id, j.activo, j.jugador_nombre)}
                    style={{ padding: '2px 6px', color: j.activo ? 'var(--color-text-muted)' : 'var(--color-neon)', fontSize: '0.65rem' }}
                    title={j.activo ? 'Marcar como inactivo / abandonó' : 'Reactivar'}
                  >
                    {j.activo ? <UserMinus size={12} /> : <UserCheck size={12} />}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleRemover(j.jugador_id, j.jugador_nombre)}
                    style={{ padding: '2px 6px', color: 'var(--color-danger)', fontSize: '0.65rem' }}
                    title="Remover de la liga"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Segunda */}
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h3 style={{ color: DIVISION_COLORS.segunda, fontSize: '0.95rem', margin: 0 }}>
                  🥈 Segunda División ({jugadoresSegunda.length})
                </h3>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setAddingDiv(addingDiv === 'segunda' ? null : 'segunda'); setSelectedNewPlayer(''); }}
                  style={{ color: '#3b82f6', fontSize: '0.75rem', padding: '3px 8px' }}
                >
                  <Plus size={14} /> Añadir
                </button>
              </div>

              {addingDiv === 'segunda' && (
                <div style={{ padding: '0.75rem', background: 'rgba(59,130,246,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59,130,246,0.25)', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Añadir jugador a 2ª División:
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select
                      value={selectedNewPlayer}
                      onChange={e => setSelectedNewPlayer(e.target.value)}
                      style={{ flex: 1, padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: '0.75rem' }}
                    >
                      <option value="">Seleccionar jugador...</option>
                      {allJugadores
                        .filter(j => !jugadores.some(lj => lj.jugador_id === j.id))
                        .map(j => (
                          <option key={j.id} value={j.id}>{j.nombre}</option>
                        ))}
                    </select>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleAddPlayer('segunda')}
                      disabled={!selectedNewPlayer || addingPlayerLoading}
                    >
                      <UserPlus size={13} />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setAddingDiv(null)}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              )}

              {jugadores.filter(j => j.division === 'segunda').map(j => (
                <div
                  key={j.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.55rem 0.75rem',
                    background: j.activo ? 'var(--color-bg-card)' : 'rgba(255,59,59,0.04)',
                    border: `1px solid ${j.activo ? 'var(--color-border)' : 'rgba(255,59,59,0.2)'}`,
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '0.35rem',
                    opacity: j.activo ? 1 : 0.6,
                  }}
                >
                  {j.jugador_foto ? (
                    <img src={j.jugador_foto} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#60a5fa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {getInitials(j.jugador_nombre)}
                    </div>
                  )}
                  <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {j.jugador_nombre} {!j.activo && <span style={{ color: 'var(--color-danger)', fontSize: '0.65rem' }}>(Inactivo)</span>}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleToggleActivo(j.jugador_id, j.activo, j.jugador_nombre)}
                    style={{ padding: '2px 6px', color: j.activo ? 'var(--color-text-muted)' : '#3b82f6', fontSize: '0.65rem' }}
                    title={j.activo ? 'Marcar como inactivo / abandonó' : 'Reactivar'}
                  >
                    {j.activo ? <UserMinus size={12} /> : <UserCheck size={12} />}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleRemover(j.jugador_id, j.jugador_nombre)}
                    style={{ padding: '2px 6px', color: 'var(--color-danger)', fontSize: '0.65rem' }}
                    title="Remover de la liga"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Matches Preview (read-only, by jornada) ──────────────────────────────────
function MatchesPreview({ partidos, jugadores, currentUserId }: {
  partidos: LigaPartido[];
  jugadores: LigaJugadorConDetalles[];
  currentUserId?: string;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ '1': false });
  const getJugador = (id: string) => jugadores.find(j => j.jugador_id === id);

  const jornadas = [...new Set(partidos.map(p => p.jornada))].sort((a, b) => (a ?? 0) - (b ?? 0));

  return (
    <div>
      <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        📅 Calendario
      </h3>
      {jornadas.map(jornada => {
        const key = `j_${jornada}`;
        const jornadaPartidos = partidos.filter(p => p.jornada === jornada);
        const done = jornadaPartidos.filter(p => p.estado === 'finalizado').length;
        const isCollapsed = collapsed[key] ?? (done === jornadaPartidos.length);

        return (
          <div key={jornada} style={{ marginBottom: '0.65rem' }}>
            <div
              className="jornada-header"
              onClick={() => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))}
            >
              <h4>
                {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                Jornada {jornada}
              </h4>
              <span className="jornada-progress">
                {done}/{jornadaPartidos.length} {done === jornadaPartidos.length && '✅'}
              </span>
            </div>
            {!isCollapsed && jornadaPartidos.map(p => {
              const local = getJugador(p.jugador_local_id);
              const visita = getJugador(p.jugador_visitante_id);
              const isMe = p.jugador_local_id === currentUserId || p.jugador_visitante_id === currentUserId;

              return (
                <div
                  key={p.id}
                  className="liga-match-card"
                  style={{
                    border: isMe ? '1px solid var(--color-border-neon)' : undefined,
                    background: isMe ? 'rgba(57,255,20,0.02)' : undefined,
                  }}
                >
                  <div className="liga-match-team">
                    {local?.jugador_foto ? (
                      <img src={local.jugador_foto} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#2bcc10,#39FF14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 800, color: '#000', flexShrink: 0 }}>
                        {getInitials(local?.jugador_nombre || '?')}
                      </div>
                    )}
                    <span className="liga-match-team-name" style={{ fontWeight: isMe && p.jugador_local_id === currentUserId ? 700 : 500 }}>
                      {local?.jugador_nombre || '?'}
                    </span>
                  </div>
                  {p.estado === 'finalizado' ? (
                    <div className="liga-match-score">{p.goles_local} - {p.goles_visitante}</div>
                  ) : (
                    <div className="liga-match-vs">vs</div>
                  )}
                  <div className="liga-match-team away">
                    <span className="liga-match-team-name" style={{ fontWeight: isMe && p.jugador_visitante_id === currentUserId ? 700 : 500 }}>
                      {visita?.jugador_nombre || '?'}
                    </span>
                    {visita?.jugador_foto ? (
                      <img src={visita.jugador_foto} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#2bcc10,#39FF14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 800, color: '#000', flexShrink: 0 }}>
                        {getInitials(visita?.jugador_nombre || '?')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
