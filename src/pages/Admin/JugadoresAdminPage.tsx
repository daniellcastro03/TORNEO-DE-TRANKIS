import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Shield, User as UserIcon, Search, RefreshCw, Crown } from 'lucide-react';
import type { RolUsuario } from '../../types/database';

interface JugadorRow {
  id: string;
  nombre: string;
  email: string;
  foto_url: string | null;
  rol: RolUsuario;
  created_at: string;
  // computed
  torneos?: number;
}

export default function JugadoresAdminPage() {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();

  const [jugadores, setJugadores] = useState<JugadorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchJugadores = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('jugadores')
        .select('id, nombre, email, foto_url, rol, created_at')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get inscription counts per player
      const { data: inscData } = await supabase
        .from('torneo_inscripciones')
        .select('jugador_id');

      const conteo: Record<string, number> = {};
      for (const i of (inscData || []) as { jugador_id: string }[]) {
        conteo[i.jugador_id] = (conteo[i.jugador_id] || 0) + 1;
      }

      setJugadores(
        (data || []).map((j: any) => ({
          ...j,
          torneos: conteo[j.id] || 0,
        }))
      );
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchJugadores();
  }, [fetchJugadores, isAdmin]);

  const handleRolChange = async (jugadorId: string, nuevoRol: RolUsuario) => {
    // Prevent removing own admin role
    if (jugadorId === user?.id && nuevoRol === 'jugador') {
      if (!confirm('¿Quitarte el rol de Admin? Ya no podrás gestionar el sistema.')) return;
    }

    setSavingId(jugadorId);
    try {
      const { error } = await supabase
        .from('jugadores')
        .update({ rol: nuevoRol })
        .eq('id', jugadorId);

      if (error) throw error;

      setJugadores((prev) =>
        prev.map((j) => (j.id === jugadorId ? { ...j, rol: nuevoRol } : j))
      );

      const jugador = jugadores.find((j) => j.id === jugadorId);
      showToast(
        nuevoRol === 'admin'
          ? `✅ ${jugador?.nombre} ahora es Admin`
          : `👤 ${jugador?.nombre} ahora es Jugador`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingId(null);
    }
  };

  if (!isAdmin) {
    navigate('/');
    return null;
  }

  const filtered = jugadores.filter(
    (j) =>
      j.nombre.toLowerCase().includes(search.toLowerCase()) ||
      j.email.toLowerCase().includes(search.toLowerCase())
  );

  const adminCount = jugadores.filter((j) => j.rol === 'admin').length;
  const playerCount = jugadores.filter((j) => j.rol === 'jugador').length;

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="page-container fade-in">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <button
        className="btn btn-ghost btn-sm"
        onClick={() => navigate('/admin')}
        style={{ marginBottom: '1rem' }}
      >
        <ArrowLeft size={16} /> Admin
      </button>

      <div className="page-header">
        <h1>👥 Gestión de Jugadores</h1>
        <p>Administra roles y permisos de todos los usuarios</p>
      </div>

      {/* Summary */}
      <div className="grid-3" style={{ marginBottom: '1.5rem', gap: '0.75rem' }}>
        <div className="card stat-card" style={{ padding: '0.9rem' }}>
          <div className="stat-value">{jugadores.length}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="card stat-card" style={{ padding: '0.9rem' }}>
          <div className="stat-value" style={{ color: 'var(--color-neon)', fontSize: '1.5rem' }}>
            {adminCount}
          </div>
          <div className="stat-label">Admins</div>
        </div>
        <div className="card stat-card" style={{ padding: '0.9rem' }}>
          <div className="stat-value" style={{ fontSize: '1.5rem' }}>{playerCount}</div>
          <div className="stat-label">Jugadores</div>
        </div>
      </div>

      {/* Search + Refresh */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.2rem' }}
          />
          <Search
            size={16}
            style={{
              position: 'absolute', left: '0.65rem', top: '50%',
              transform: 'translateY(-50%)', color: 'var(--color-text-muted)',
              pointerEvents: 'none',
            }}
          />
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={fetchJugadores}
          disabled={loading}
          title="Refrescar"
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Players list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">👥</div>
          <h3>Sin jugadores</h3>
          <p>{search ? 'No se encontró ningún usuario con ese criterio' : 'No hay jugadores registrados'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map((j, i) => {
            const isMe = j.id === user?.id;
            const isSaving = savingId === j.id;

            return (
              <div
                key={j.id}
                className="card fade-in"
                style={{
                  animationDelay: `${i * 0.03}s`,
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  borderColor: isMe ? 'var(--color-border-neon)' : undefined,
                }}
              >
                {/* Avatar */}
                {j.foto_url ? (
                  <img src={j.foto_url} alt={j.nombre} className="avatar avatar-sm" style={{ flexShrink: 0 }} />
                ) : (
                  <div
                    className="avatar avatar-sm avatar-placeholder"
                    style={{ fontSize: '0.65rem', flexShrink: 0 }}
                  >
                    {getInitials(j.nombre)}
                  </div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      color: isMe ? 'var(--color-neon)' : 'var(--color-text)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {j.nombre}
                    </span>
                    {isMe && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--color-neon)' }}>(Tú)</span>
                    )}
                    {j.rol === 'admin' && (
                      <Crown size={13} color="var(--color-warning)" />
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'flex', gap: '0.75rem' }}>
                    <span>{j.email}</span>
                    <span>{j.torneos} inscripción{j.torneos !== 1 ? 'es' : ''}</span>
                    <span>Desde {new Date(j.created_at).toLocaleDateString('es', { month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* Role selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  {/* Current badge */}
                  {j.rol === 'admin' ? (
                    <span className="badge badge-neon" style={{ fontSize: '0.65rem' }}>
                      <Shield size={10} /> ADMIN
                    </span>
                  ) : (
                    <span className="badge badge-draw" style={{ fontSize: '0.65rem' }}>
                      <UserIcon size={10} /> JUGADOR
                    </span>
                  )}

                  {/* Role toggle button */}
                  {isSaving ? (
                    <div className="spinner" style={{ width: 20, height: 20 }} />
                  ) : j.rol === 'jugador' ? (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleRolChange(j.id, 'admin')}
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.25rem 0.6rem',
                        color: 'var(--color-neon)',
                        border: '1px solid var(--color-border-neon)',
                      }}
                      title="Promover a Admin"
                    >
                      <Shield size={12} /> Hacer Admin
                    </button>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleRolChange(j.id, 'jugador')}
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.25rem 0.6rem',
                        color: 'var(--color-danger)',
                      }}
                      title="Quitar rol de Admin"
                    >
                      <UserIcon size={12} /> Quitar Admin
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
