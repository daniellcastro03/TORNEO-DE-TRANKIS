import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  useTorneoDetalle,
  cambiarEstadoTorneo,
  eliminarTorneo,
  actualizarTorneo,
  inscribirJugador,
  cancelarInscripcion,
  cambiarEquipoInscripcion,
  getMiInscripcion,
} from '../../hooks/useTorneos';
import TeamSelector from '../../components/TeamSelector';
import GruposSection from './GruposSection';
import BracketSection from './BracketSection';
import { crearNotificacion, notificarJugadores } from '../../hooks/useNotificaciones';
import type { CatalogoEquipo, EstadoTorneo, TorneoInscripcion, TipoTorneo } from '../../types/database';
import {
  ArrowLeft,
  Trophy,
  Users,
  Calendar,
  Settings,
  PlayCircle,
  StopCircle,

  Trash2,
  UserPlus,
  RefreshCw,
  X,
  Shield,
  Lock,
} from 'lucide-react';
import './Torneos.css';

const ESTADO_CONFIG: Record<EstadoTorneo, { label: string; class: string; next?: EstadoTorneo; nextLabel?: string; nextIcon?: any }> = {
  borrador: {
    label: 'Borrador',
    class: 'badge badge-borrador',
    next: 'inscripciones',
    nextLabel: 'Abrir Inscripciones',
    nextIcon: UserPlus,
  },
  inscripciones: {
    label: '🟢 Inscripciones abiertas',
    class: 'badge badge-inscripciones',
    next: 'en_curso',
    nextLabel: 'Iniciar Torneo',
    nextIcon: PlayCircle,
  },
  en_curso: {
    label: '⚡ En curso',
    class: 'badge badge-en-curso',
    next: 'finalizado',
    nextLabel: 'Finalizar Torneo',
    nextIcon: StopCircle,
  },
  finalizado: {
    label: 'Finalizado',
    class: 'badge badge-finalizado',
  },
};

const TIPO_EMOJI: Record<string, string> = {
  champions: '🏆',
  mundial: '🌍',
  liga: '⚽',
  libre: '🎮',
};

export default function TorneoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const { torneo, inscripciones, loading, error, refetch } = useTorneoDetalle(id);

  const [miInscripcion, setMiInscripcion] = useState<TorneoInscripcion | null>(null);
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [changingTeam, setChangingTeam] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editTipo, setEditTipo] = useState<TipoTorneo>('champions');

  useEffect(() => {
    if (showEditModal && torneo) {
      setEditNombre(torneo.nombre);
      setEditTipo(torneo.tipo);
    }
  }, [showEditModal, torneo]);

  const handleActualizar = async () => {
    if (!torneo) return;
    setActionLoading(true);
    const { error: err } = await actualizarTorneo(torneo.id, {
      nombre: editNombre,
      tipo: editTipo
    });
    setActionLoading(false);

    if (err) {
      showToast(err, 'error');
    } else {
      showToast('Configuración del torneo actualizada', 'success');
      setShowEditModal(false);
      refetch();
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Check if current user is inscribed
  useEffect(() => {
    if (id && user) {
      getMiInscripcion(id, user.id).then(setMiInscripcion);
    }
  }, [id, user, inscripciones]);

  // Find my team details from inscriptions
  const miEquipo = miInscripcion
    ? inscripciones.find((i) => i.id === miInscripcion.id)?.catalogo_equipo
    : null;

  const handleCambiarEstado = async (nuevoEstado: EstadoTorneo) => {
    if (!torneo) return;

    const confirmMsg =
      nuevoEstado === 'inscripciones'
        ? '¿Abrir inscripciones? Los jugadores podrán inscribirse.'
        : nuevoEstado === 'en_curso'
          ? `¿Iniciar el torneo con ${inscripciones.length} jugadores? Las inscripciones se cerrarán.`
          : nuevoEstado === 'finalizado'
            ? '¿Finalizar el torneo? Esta acción no se puede deshacer.'
            : '';

    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    const { error: err } = await cambiarEstadoTorneo(torneo.id, nuevoEstado);
    setActionLoading(false);

    if (err) {
      showToast(err, 'error');
    } else {
      showToast(`Estado cambiado a: ${nuevoEstado}`, 'success');

      // Notify all inscribed players about state change
      if (torneo && inscripciones.length > 0) {
        const playerIds = inscripciones.map((i) => i.jugador_id);
        const msgs: Record<string, { titulo: string; cuerpo: string }> = {
          inscripciones: {
            titulo: `🟢 Inscripciones abiertas: ${torneo.nombre}`,
            cuerpo: '¡Las inscripciones están abiertas! Entra y elige tu equipo.',
          },
          en_curso: {
            titulo: `⚡ Torneo iniciado: ${torneo.nombre}`,
            cuerpo: '¡El torneo ha comenzado! Revisa tu grupo y partidos.',
          },
          finalizado: {
            titulo: `🏁 Torneo finalizado: ${torneo.nombre}`,
            cuerpo: 'El torneo ha terminado. ¡Revisa las clasificaciones finales!',
          },
        };
        const msg = msgs[nuevoEstado];
        if (msg) {
          notificarJugadores(playerIds, 'recordatorio', msg.titulo, msg.cuerpo);
        }
      }

      refetch();
    }
  };

  const handleEliminar = async () => {
    if (!torneo) return;
    if (!confirm(`¿Eliminar "${torneo.nombre}"? Esta acción no se puede deshacer.`)) return;

    setActionLoading(true);
    const { error: err } = await eliminarTorneo(torneo.id);
    setActionLoading(false);

    if (err) {
      showToast(err, 'error');
    } else {
      navigate('/torneos');
    }
  };

  const handleInscribir = async (equipo: CatalogoEquipo) => {
    if (!user || !id) return;

    setActionLoading(true);
    const { error: err } = await inscribirJugador(id, user.id, equipo.id);
    setActionLoading(false);

    if (err) {
      showToast(err, 'error');
    } else {
      showToast(`¡Solicitud enviada con ${equipo.nombre}! Espera la confirmación del admin.`, 'success');

      // Notification for player
      if (user) {
        crearNotificacion(
          user.id,
          'equipo_confirmado',
          `⏳ Inscripción en revisión`,
          `Tu solicitud para "${torneo?.nombre}" con ${equipo.nombre} está pendiente de aprobación.`
        );
      }

      setShowTeamSelector(false);
      refetch();
    }
  };

  const handleCambiarEquipo = async (equipo: CatalogoEquipo) => {
    if (!miInscripcion) return;

    setActionLoading(true);
    const { error: err } = await cambiarEquipoInscripcion(miInscripcion.id, equipo.id);
    setActionLoading(false);

    if (err) {
      showToast(err, 'error');
    } else {
      showToast(`Equipo cambiado a ${equipo.nombre}`, 'success');
      setChangingTeam(false);
      refetch();
    }
  };

  const handleCancelarInscripcion = async () => {
    if (!miInscripcion) return;
    if (!confirm('¿Cancelar tu inscripción? Perderás tu equipo seleccionado.')) return;

    setActionLoading(true);
    const { error: err } = await cancelarInscripcion(miInscripcion.id);
    setActionLoading(false);

    if (err) {
      showToast(err, 'error');
    } else {
      showToast('Inscripción cancelada', 'success');
      setMiInscripcion(null);
      refetch();
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (error || !torneo) {
    return (
      <div className="page-container fade-in">
        <div className="empty-state card">
          <div className="empty-state-icon">❌</div>
          <h3>Torneo no encontrado</h3>
          <button className="btn btn-secondary" onClick={() => navigate('/torneos')} style={{ marginTop: '1rem' }}>
            Volver a torneos
          </button>
        </div>
      </div>
    );
  }

  const estadoConfig = ESTADO_CONFIG[torneo.estado];
  const puedeInscribirse = torneo.estado === 'inscripciones' && !miInscripcion && !!user;
  const puedeCambiarEquipo = torneo.estado === 'inscripciones' && torneo.permite_cambio_equipo && miInscripcion;
  const puedeCancelar = torneo.estado === 'inscripciones' && miInscripcion;
  const isFull = inscripciones.length >= torneo.max_jugadores;

  return (
    <div className="torneo-detail fade-in">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      {/* Header */}
      <div className="torneo-detail-header">
        <button className="btn btn-ghost btn-sm back-btn" onClick={() => navigate('/torneos')}>
          <ArrowLeft size={16} /> Torneos
        </button>

        <div className="torneo-detail-title">
          <h1>{TIPO_EMOJI[torneo.tipo]} {torneo.nombre}</h1>
          <span className={estadoConfig.class}>{estadoConfig.label}</span>
        </div>

        <div className="torneo-detail-meta">
          <span className="badge badge-draw" style={{ fontSize: '0.75rem' }}>
            <Trophy size={12} /> {torneo.tipo.toUpperCase()}
          </span>
          <span className="badge badge-draw" style={{ fontSize: '0.75rem' }}>
            <Users size={12} /> {inscripciones.length} / {torneo.max_jugadores}
          </span>
          {torneo.fecha_inicio && (
            <span className="badge badge-draw" style={{ fontSize: '0.75rem' }}>
              <Calendar size={12} /> {new Date(torneo.fecha_inicio).toLocaleDateString('es')}
            </span>
          )}
          {torneo.permite_cambio_equipo && (
            <span className="badge badge-neon" style={{ fontSize: '0.7rem' }}>
              <RefreshCw size={10} /> Cambio de equipo permitido
            </span>
          )}
        </div>
      </div>

      {/* Admin Controls */}
      {isAdmin && (
        <div className="admin-controls">
          {estadoConfig.next && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => handleCambiarEstado(estadoConfig.next!)}
              disabled={actionLoading}
            >
              {estadoConfig.nextIcon && <estadoConfig.nextIcon size={16} />}
              {estadoConfig.nextLabel}
            </button>
          )}
          <button
            className="btn btn-danger btn-sm"
            onClick={handleEliminar}
            disabled={actionLoading}
          >
            <Trash2 size={16} /> Eliminar
          </button>
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={() => setShowEditModal(true)} 
            disabled={actionLoading}
          >
            <Settings size={16} /> Editar Config
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="card fade-in" style={{ marginBottom: 'var(--space-xl)', border: '1px solid var(--color-neon)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ color: 'var(--color-neon)' }}><Settings size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}/>Editar Configuración</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowEditModal(false)}><X size={16} /></button>
          </div>
          <div className="form-group">
            <label>Nombre del Torneo</label>
            <input 
              type="text" 
              className="input" 
              value={editNombre} 
              onChange={e => setEditNombre(e.target.value)} 
            />
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Tipo de Torneo</label>
            <select 
              className="input" 
              value={editTipo} 
              onChange={e => setEditTipo(e.target.value as TipoTorneo)}
            >
              <option value="champions">🏆 Champions League</option>
              <option value="mundial">🌍 Mundial</option>
              <option value="liga">⚽ Liga</option>
              <option value="libre">🎮 Libre</option>
            </select>
            <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: '0.5rem' }}>
              Cambiar el tipo afectará cómo se buscan los equipos y el formato general si aún no ha iniciado.
            </small>
          </div>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setShowEditModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleActualizar} disabled={actionLoading}>Guardar Cambios</button>
          </div>
        </div>
      )}

      {/* My Inscription */}
      {miInscripcion && miEquipo && (
        <div className="mi-inscripcion-card fade-in">
          <div className="mi-equipo">
            {miEquipo.escudo_url && (
              <img src={miEquipo.escudo_url} alt={miEquipo.nombre} />
            )}
            <div className="mi-equipo-info">
              <h4>{miEquipo.nombre}</h4>
              {miInscripcion.estado === 'pendiente' && (
                <p style={{ color: 'var(--color-warning, #f59e0b)' }}>⏳ Inscripción pendiente de aprobación</p>
              )}
              {miInscripcion.estado === 'confirmada' && (
                <p>✅ Inscripción confirmada — ¡Listo para jugar!</p>
              )}
              {miInscripcion.estado === 'rechazada' && (
                <p style={{ color: 'var(--color-danger)' }}>❌ Inscripción rechazada — elige otro equipo o contacta al admin</p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {puedeCambiarEquipo && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setChangingTeam(true)}
                disabled={actionLoading}
              >
                <RefreshCw size={14} /> Cambiar equipo
              </button>
            )}
            {puedeCancelar && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleCancelarInscripcion}
                disabled={actionLoading}
                style={{ color: 'var(--color-danger)' }}
              >
                <X size={14} /> Salir del torneo
              </button>
            )}
          </div>
        </div>
      )}

      {/* Inscription CTA for players */}
      {puedeInscribirse && !showTeamSelector && (
        <div className="card inscripcion-cta fade-in">
          {isFull ? (
            <>
              <Lock size={32} color="var(--color-text-muted)" style={{ marginBottom: '0.5rem' }} />
              <h3 style={{ color: 'var(--color-text-muted)' }}>Torneo lleno</h3>
              <p>Se alcanzó el máximo de {torneo.max_jugadores} jugadores</p>
            </>
          ) : (
            <>
              <Shield size={32} color="var(--color-neon)" style={{ marginBottom: '0.5rem' }} />
              <h3>¡Inscríbete!</h3>
              <p>Elige tu equipo y únete al torneo</p>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => setShowTeamSelector(true)}
                style={{ marginTop: '0.5rem' }}
              >
                <UserPlus size={18} /> Elegir equipo
              </button>
            </>
          )}
        </div>
      )}

      {/* Team Selector */}
      {(showTeamSelector || changingTeam) && id && (
        <div className="card fade-in" style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ color: 'var(--color-neon)' }}>
              {changingTeam ? '🔄 Cambiar equipo' : '🛡️ Selecciona tu equipo'}
            </h3>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setShowTeamSelector(false); setChangingTeam(false); }}
            >
              <X size={16} /> Cancelar
            </button>
          </div>
          <TeamSelector
            tipo={torneo.tipo}
            torneoId={id}
            jugadorId={user?.id || ''}
            selectedTeamId={changingTeam ? miInscripcion?.catalogo_equipo_id : null}
            onSelect={changingTeam ? handleCambiarEquipo : handleInscribir}
            disabled={actionLoading}
          />
        </div>
      )}

      {/* Inscriptions List */}
      <div className="inscripciones-section">
        <div className="dashboard-section-header">
          <h2>
            <Users size={20} style={{ color: 'var(--color-neon)' }} />
            Jugadores inscritos ({inscripciones.length})
            {inscripciones.some(i => i.estado === 'pendiente') && (
              <span className="badge badge-draw" style={{ fontSize: '0.65rem', marginLeft: '0.5rem', color: 'var(--color-warning, #f59e0b)', borderColor: 'var(--color-warning, #f59e0b)' }}>
                ⏳ {inscripciones.filter(i => i.estado === 'pendiente').length} pendientes
              </span>
            )}
          </h2>
        </div>

        {inscripciones.length === 0 ? (
          <div className="empty-state card" style={{ padding: '2rem' }}>
            <div className="empty-state-icon">👥</div>
            <h3>Sin inscripciones</h3>
            <p>
              {torneo.estado === 'borrador'
                ? 'Abre las inscripciones para que los jugadores se inscriban'
                : 'Aún no se ha inscrito ningún jugador'}
            </p>
          </div>
        ) : (
          <div className="inscripciones-list">
            {inscripciones.map((insc, i) => (
              <div
                key={insc.id}
                className={`inscripcion-row fade-in ${insc.jugador_id === user?.id ? 'mi-inscripcion-card' : ''}`}
                style={{
                  animationDelay: `${i * 0.04}s`,
                  ...(insc.jugador_id === user?.id ? { borderColor: 'var(--color-border-neon)' } : {}),
                  opacity: insc.estado === 'rechazada' ? 0.5 : 1,
                }}
              >
                <span className="inscripcion-num">#{i + 1}</span>

                <div className="inscripcion-player">
                  {insc.jugador?.foto_url ? (
                    <img
                      src={insc.jugador.foto_url}
                      alt={insc.jugador.nombre}
                      className="avatar avatar-sm"
                    />
                  ) : (
                    <div className="avatar avatar-sm avatar-placeholder" style={{ fontSize: '0.6rem' }}>
                      {insc.jugador?.nombre?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <span className="player-name">
                    {insc.jugador?.nombre || 'Jugador'}
                    {insc.jugador_id === user?.id && (
                      <span style={{ color: 'var(--color-neon)', fontSize: '0.75rem', marginLeft: '0.4rem' }}>
                        (Tú)
                      </span>
                    )}
                  </span>
                </div>

                <div className="inscripcion-team">
                  {insc.catalogo_equipo?.escudo_url && (
                    <img src={insc.catalogo_equipo.escudo_url} alt="" />
                  )}
                  <span>{insc.catalogo_equipo?.nombre || 'Sin equipo'}</span>
                </div>

                {/* Estado badge */}
                <div style={{ flexShrink: 0 }}>
                  {insc.estado === 'pendiente' && (
                    <span style={{ fontSize: '0.62rem', padding: '2px 7px', borderRadius: 99, border: '1px solid var(--color-warning, #f59e0b)', color: 'var(--color-warning, #f59e0b)' }}>⏳ Pendiente</span>
                  )}
                  {insc.estado === 'confirmada' && (
                    <span style={{ fontSize: '0.62rem', padding: '2px 7px', borderRadius: 99, border: '1px solid var(--color-neon)', color: 'var(--color-neon)' }}>✅ Confirmado</span>
                  )}
                  {insc.estado === 'rechazada' && (
                    <span style={{ fontSize: '0.62rem', padding: '2px 7px', borderRadius: 99, border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>❌ Rechazado</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Groups & Classification (en_curso or finalizado) */}
      {(torneo.estado === 'en_curso' || torneo.estado === 'finalizado') && (
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="dashboard-section-header">
            <h2>
              <Trophy size={20} style={{ color: 'var(--color-neon)' }} />
              Grupos y Clasificación
            </h2>
          </div>
          <GruposSection
            torneo={torneo}
            inscripcionesCount={inscripciones.filter(i => i.estado === 'confirmada').length}
            jugadorIds={inscripciones.filter(i => i.estado === 'confirmada').map((i) => i.jugador_id)}
          />
        </div>
      )}

      {/* Knockout Bracket (en_curso or finalizado) */}
      {(torneo.estado === 'en_curso' || torneo.estado === 'finalizado') && (
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="dashboard-section-header">
            <h2>
              <Trophy size={20} style={{ color: 'var(--color-neon)' }} />
              Fase Eliminatoria
            </h2>
          </div>
          <BracketSection
            torneo={torneo}
            inscripcionesCount={inscripciones.length}
          />
        </div>
      )}
    </div>
  );
}
