import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTorneos } from '../../hooks/useTorneos';
import { supabase } from '../../lib/supabase';
import { crearNotificacion } from '../../hooks/useNotificaciones';
import type { EstadoInscripcion } from '../../types/database';
import { ArrowLeft, Check, X, Clock, Users, Trophy, RefreshCw } from 'lucide-react';

interface InscripcionDetalle {
  id: string;
  torneo_id: string;
  jugador_id: string;
  catalogo_equipo_id: string;
  estado: EstadoInscripcion;
  created_at: string;
  jugador?: { nombre: string; foto_url: string | null; email: string };
  catalogo_equipo?: { nombre: string; escudo_url: string | null };
  torneo?: { nombre: string; tipo: string };
}

const ESTADO_CONFIG: Record<EstadoInscripcion, { label: string; color: string; icon: any }> = {
  pendiente: { label: 'Pendiente', color: 'var(--color-warning, #f59e0b)', icon: Clock },
  confirmada: { label: 'Confirmada', color: 'var(--color-neon)', icon: Check },
  rechazada: { label: 'Rechazada', color: 'var(--color-danger)', icon: X },
};

export default function InscripcionesAdminPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { torneos } = useTorneos();

  const [selectedTorneo, setSelectedTorneo] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<EstadoInscripcion | 'todos'>('pendiente');
  const [inscripciones, setInscripciones] = useState<InscripcionDetalle[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Torneos activos (inscripciones abiertas o en borrador)
  const torneosRelevantes = torneos.filter(
    (t) => t.estado === 'inscripciones' || t.estado === 'borrador' || t.estado === 'en_curso'
  );

  const fetchInscripciones = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('torneo_inscripciones')
        .select(`
          *,
          jugadores:jugador_id (nombre, foto_url, email),
          catalogos_equipos:catalogo_equipo_id (nombre, escudo_url),
          torneos:torneo_id (nombre, tipo)
        `)
        .order('created_at', { ascending: false });

      if (selectedTorneo !== 'todos') {
        query = query.eq('torneo_id', selectedTorneo);
      }
      if (filtroEstado !== 'todos') {
        query = query.eq('estado', filtroEstado);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map((i: any) => ({
        ...i,
        jugador: i.jugadores,
        catalogo_equipo: i.catalogos_equipos,
        torneo: i.torneos,
      }));

      setInscripciones(mapped);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedTorneo, filtroEstado]);

  useEffect(() => {
    if (isAdmin) fetchInscripciones();
  }, [fetchInscripciones, isAdmin]);

  const handleCambiarEstado = async (
    insc: InscripcionDetalle,
    nuevoEstado: 'confirmada' | 'rechazada'
  ) => {
    setActionLoading(insc.id);
    try {
      const { error } = await supabase
        .from('torneo_inscripciones')
        .update({ estado: nuevoEstado })
        .eq('id', insc.id);

      if (error) throw error;

      // Notify the player
      const jugadorNombre = insc.jugador?.nombre || 'Jugador';
      const equipoNombre = insc.catalogo_equipo?.nombre || 'tu equipo';
      const torneoNombre = insc.torneo?.nombre || 'el torneo';

      if (nuevoEstado === 'confirmada') {
        await crearNotificacion(
          insc.jugador_id,
          'equipo_confirmado',
          `✅ Inscripción confirmada`,
          `Tu inscripción en "${torneoNombre}" con ${equipoNombre} ha sido aprobada. ¡Listo para jugar!`
        );
        showToast(`✅ ${jugadorNombre} confirmado`, 'success');
      } else {
        await crearNotificacion(
          insc.jugador_id,
          'recordatorio',
          `❌ Inscripción rechazada`,
          `Tu inscripción en "${torneoNombre}" con ${equipoNombre} fue rechazada. Puedes intentarlo de nuevo.`
        );
        showToast(`❌ ${jugadorNombre} rechazado`, 'success');
      }

      fetchInscripciones();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmarTodos = async () => {
    const pendientes = inscripciones.filter((i) => i.estado === 'pendiente');
    if (pendientes.length === 0) return;
    if (!confirm(`¿Confirmar todas las ${pendientes.length} inscripciones pendientes?`)) return;

    setActionLoading('bulk');
    try {
      const ids = pendientes.map((i) => i.id);
      const { error } = await supabase
        .from('torneo_inscripciones')
        .update({ estado: 'confirmada' })
        .in('id', ids);

      if (error) throw error;

      // Notify all
      for (const insc of pendientes) {
        await crearNotificacion(
          insc.jugador_id,
          'equipo_confirmado',
          `✅ Inscripción confirmada`,
          `Tu inscripción en "${insc.torneo?.nombre || 'el torneo'}" con ${insc.catalogo_equipo?.nombre || 'tu equipo'} ha sido aprobada.`
        );
      }

      showToast(`✅ ${pendientes.length} inscripciones confirmadas`, 'success');
      fetchInscripciones();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAdmin) {
    navigate('/');
    return null;
  }

  const pendienteCount = inscripciones.filter((i) => i.estado === 'pendiente').length;

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="page-container fade-in">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')} style={{ marginBottom: '1rem' }}>
        <ArrowLeft size={16} /> Admin
      </button>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>📋 Gestionar Inscripciones</h1>
          <p>Acepta o rechaza solicitudes de jugadores</p>
        </div>
        {pendienteCount > 0 && filtroEstado !== 'rechazada' && (
          <button
            className="btn btn-primary btn-sm"
            onClick={handleConfirmarTodos}
            disabled={actionLoading === 'bulk'}
          >
            <Check size={16} /> Confirmar todas ({pendienteCount})
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {/* Tournament filter */}
        <select
          value={selectedTorneo}
          onChange={(e) => setSelectedTorneo(e.target.value)}
          style={{ flex: 1, minWidth: 180 }}
        >
          <option value="todos">Todos los torneos</option>
          {torneosRelevantes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.tipo === 'champions' ? '🏆' : t.tipo === 'mundial' ? '🌍' : '⚽'} {t.nombre}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {(['pendiente', 'confirmada', 'rechazada', 'todos'] as const).map((e) => (
            <button
              key={e}
              className={`catalogo-tab ${filtroEstado === e ? 'active' : ''}`}
              onClick={() => setFiltroEstado(e)}
              style={{ fontSize: '0.75rem' }}
            >
              {e === 'pendiente' ? '⏳ Pendientes' : e === 'confirmada' ? '✅ Confirmadas' : e === 'rechazada' ? '❌ Rechazadas' : '📋 Todas'}
            </button>
          ))}
        </div>

        <button
          className="btn btn-ghost btn-sm"
          onClick={fetchInscripciones}
          disabled={loading}
          title="Refrescar"
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : inscripciones.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">📋</div>
          <h3>Sin inscripciones</h3>
          <p>
            {filtroEstado === 'pendiente'
              ? 'No hay inscripciones pendientes de aprobación'
              : `No hay inscripciones ${filtroEstado === 'todos' ? '' : filtroEstado + 's'}`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {inscripciones.map((insc, i) => {
            const estadoConf = ESTADO_CONFIG[insc.estado];
            const isPending = insc.estado === 'pendiente';
            const isLoadingThis = actionLoading === insc.id;

            return (
              <div
                key={insc.id}
                className="card fade-in"
                style={{
                  animationDelay: `${i * 0.03}s`,
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  borderColor: isPending ? 'rgba(245,158,11,0.3)' : undefined,
                }}
              >
                {/* Player avatar */}
                {insc.jugador?.foto_url ? (
                  <img src={insc.jugador.foto_url} alt={insc.jugador.nombre} className="avatar avatar-sm" />
                ) : (
                  <div className="avatar avatar-sm avatar-placeholder" style={{ fontSize: '0.65rem', flexShrink: 0 }}>
                    {insc.jugador ? getInitials(insc.jugador.nombre) : '?'}
                  </div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {insc.jugador?.nombre || 'Jugador desconocido'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {selectedTorneo === 'todos' && insc.torneo && (
                      <span>
                        <Trophy size={10} style={{ verticalAlign: 'middle' }} /> {insc.torneo.nombre}
                      </span>
                    )}
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {new Date(insc.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Team */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                  {insc.catalogo_equipo?.escudo_url ? (
                    <img src={insc.catalogo_equipo.escudo_url} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>
                      {insc.catalogo_equipo?.nombre?.[0] || '?'}
                    </div>
                  )}
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {insc.catalogo_equipo?.nombre || '—'}
                  </span>
                </div>

                {/* Status badge */}
                <div style={{ flexShrink: 0 }}>
                  <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 99, border: `1px solid ${estadoConf.color}`, color: estadoConf.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <estadoConf.icon size={10} />
                    {estadoConf.label}
                  </span>
                </div>

                {/* Actions */}
                {isPending && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleCambiarEstado(insc, 'confirmada')}
                      disabled={!!actionLoading}
                      style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}
                      title="Confirmar inscripción"
                    >
                      {isLoadingThis ? <div className="spinner" style={{ width: 12, height: 12 }} /> : <Check size={14} />}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleCambiarEstado(insc, 'rechazada')}
                      disabled={!!actionLoading}
                      style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem', color: 'var(--color-danger)' }}
                      title="Rechazar inscripción"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Re-enable rejected */}
                {insc.estado === 'rechazada' && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleCambiarEstado(insc, 'confirmada')}
                    disabled={!!actionLoading}
                    style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem', flexShrink: 0 }}
                    title="Aprobar de todas formas"
                  >
                    <Check size={13} /> Aprobar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary footer */}
      {inscripciones.length > 0 && (
        <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', display: 'flex', gap: '1.5rem', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>
            <Users size={13} style={{ verticalAlign: 'middle' }} /> Total: <strong style={{ color: 'var(--color-text)' }}>{inscripciones.length}</strong>
          </span>
          <span style={{ color: 'var(--color-neon)' }}>
            ✅ Confirmadas: <strong>{inscripciones.filter(i => i.estado === 'confirmada').length}</strong>
          </span>
          <span style={{ color: 'var(--color-warning, #f59e0b)' }}>
            ⏳ Pendientes: <strong>{inscripciones.filter(i => i.estado === 'pendiente').length}</strong>
          </span>
          <span style={{ color: 'var(--color-danger)' }}>
            ❌ Rechazadas: <strong>{inscripciones.filter(i => i.estado === 'rechazada').length}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
