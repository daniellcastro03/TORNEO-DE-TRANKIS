import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import AvatarCropModal from '../../components/AvatarCropModal';
import { ArrowLeft, Shield, User as UserIcon, Search, RefreshCw, Crown, Pencil, Trash2, X, Check, Camera } from 'lucide-react';
import type { RolUsuario } from '../../types/database';

interface JugadorRow {
  id: string;
  nombre: string;
  email: string;
  foto_url: string | null;
  rol: RolUsuario;
  created_at: string;
  torneos?: number;
}

// ── Modal de edición completa ────────────────────────────────
function EditJugadorModal({
  jugador,
  onClose,
  onSaved,
  showToast,
}: {
  jugador: JugadorRow;
  onClose: () => void;
  onSaved: (updated: Partial<JugadorRow>) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [nombre, setNombre] = useState(jugador.nombre);
  const [fotoUrl, setFotoUrl] = useState(jugador.foto_url ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const getInitials = (n: string) =>
    n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Solo imágenes', 'error'); return; }
    const reader = new FileReader();
    reader.onload = ev => { if (ev.target?.result) setCropSrc(ev.target.result as string); };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleCropConfirm = async (blob: Blob) => {
    setCropSrc(null);
    setUploading(true);
    try {
      const filePath = `avatars/${jugador.id}_${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setFotoUrl(`${data.publicUrl}?t=${Date.now()}`);
      showToast('Foto lista — guarda para aplicar', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al subir foto', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('jugadores')
        .update({ nombre: nombre.trim(), foto_url: fotoUrl || null })
        .eq('id', jugador.id);
      if (error) throw error;
      showToast('Jugador actualizado ✅', 'success');
      onSaved({ nombre: nombre.trim(), foto_url: fotoUrl || null });
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>✏️ Editar Jugador</h2>
            <button className="modal-close" onClick={onClose}><X size={18} /></button>
          </div>

          <div className="modal-form">
            {/* Avatar + upload */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                {fotoUrl ? (
                  <img src={fotoUrl} alt="" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-border-neon)' }} />
                ) : (
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--color-neon-dim), var(--color-neon))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#000', fontWeight: 700, fontSize: '1.4rem',
                  }}>
                    {getInitials(jugador.nombre)}
                  </div>
                )}
                <label style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'var(--color-neon)', color: '#000',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  border: '2px solid var(--color-bg-card)',
                }}>
                  {uploading
                    ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                    : <Camera size={13} />
                  }
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} disabled={uploading} />
                </label>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                Clic en el ícono para cambiar foto
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="edit-jugador-nombre">Nombre</label>
              <input
                id="edit-jugador-nombre"
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Nombre del jugador"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input type="email" value={jugador.email} disabled style={{ opacity: 0.5 }} />
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
              <button
                className={`btn btn-primary ${saving ? 'btn-loading' : ''}`}
                onClick={handleSave}
                disabled={saving || !nombre.trim()}
              >
                <Check size={16} /> Guardar
              </button>
            </div>
          </div>
        </div>
      </div>
      {cropSrc && (
        <AvatarCropModal imageSrc={cropSrc} onCrop={handleCropConfirm} onClose={() => setCropSrc(null)} />
      )}
    </>
  );
}

// ── Página principal ─────────────────────────────────────────
export default function JugadoresAdminPage() {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();

  const [jugadores, setJugadores] = useState<JugadorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingJugador, setEditingJugador] = useState<JugadorRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<JugadorRow | null>(null);
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

      const { data: inscData } = await supabase
        .from('torneo_inscripciones')
        .select('jugador_id');

      const conteo: Record<string, number> = {};
      for (const i of (inscData || []) as { jugador_id: string }[]) {
        conteo[i.jugador_id] = (conteo[i.jugador_id] || 0) + 1;
      }

      setJugadores(
        (data || []).map((j: any) => ({ ...j, torneos: conteo[j.id] || 0 }))
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
    if (jugadorId === user?.id && nuevoRol === 'jugador') {
      if (!confirm('¿Quitarte el rol de Admin?')) return;
    }
    setSavingId(jugadorId);
    try {
      const { error } = await supabase.from('jugadores').update({ rol: nuevoRol }).eq('id', jugadorId);
      if (error) throw error;
      setJugadores(prev => prev.map(j => j.id === jugadorId ? { ...j, rol: nuevoRol } : j));
      const jugador = jugadores.find(j => j.id === jugadorId);
      showToast(nuevoRol === 'admin' ? `✅ ${jugador?.nombre} ahora es Admin` : `👤 ${jugador?.nombre} ahora es Jugador`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteJugador = async (id: string) => {
    setSavingId(id);
    try {
      const { error } = await supabase.from('jugadores').delete().eq('id', id);
      if (error) throw error;
      setJugadores(prev => prev.filter(j => j.id !== id));
      showToast('Jugador eliminado', 'success');
    } catch {
      showToast('No se puede eliminar: tiene datos vinculados (torneos/partidos)', 'error');
    } finally {
      setSavingId(null);
      setDeleteConfirm(null);
    }
  };

  const handleEditSaved = (id: string, updated: Partial<JugadorRow>) => {
    setJugadores(prev => prev.map(j => j.id === id ? { ...j, ...updated } : j));
    setEditingJugador(null);
  };

  if (!isAdmin) { navigate('/'); return null; }

  const filtered = jugadores.filter(
    j => j.nombre.toLowerCase().includes(search.toLowerCase()) ||
         j.email.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="page-container fade-in">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      {/* Edit modal */}
      {editingJugador && (
        <EditJugadorModal
          jugador={editingJugador}
          onClose={() => setEditingJugador(null)}
          onSaved={updated => handleEditSaved(editingJugador.id, updated)}
          showToast={showToast}
        />
      )}

      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')} style={{ marginBottom: '1rem' }}>
        <ArrowLeft size={16} /> Admin
      </button>

      <div className="page-header">
        <h1>👥 Gestión de Jugadores</h1>
        <p>Administra roles, permisos y fotos de todos los usuarios</p>
      </div>

      {/* Summary */}
      <div className="grid-3" style={{ marginBottom: '1.5rem', gap: '0.75rem' }}>
        <div className="card stat-card" style={{ padding: '0.9rem' }}>
          <div className="stat-value">{jugadores.length}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="card stat-card" style={{ padding: '0.9rem' }}>
          <div className="stat-value" style={{ color: 'var(--color-neon)', fontSize: '1.5rem' }}>
            {jugadores.filter(j => j.rol === 'admin').length}
          </div>
          <div className="stat-label">Admins</div>
        </div>
        <div className="card stat-card" style={{ padding: '0.9rem' }}>
          <div className="stat-value" style={{ fontSize: '1.5rem' }}>{jugadores.filter(j => j.rol === 'jugador').length}</div>
          <div className="stat-label">Jugadores</div>
        </div>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input type="text" placeholder="Buscar por nombre o email..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.2rem' }} />
          <Search size={16} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchJugadores} disabled={loading} title="Refrescar">
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">👥</div>
          <h3>Sin jugadores</h3>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map((j, i) => {
            const isMe = j.id === user?.id;
            const isSaving = savingId === j.id;
            return (
              <div key={j.id} className="card fade-in" style={{
                animationDelay: `${i * 0.03}s`, padding: '0.85rem 1rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                borderColor: isMe ? 'var(--color-border-neon)' : undefined,
              }}>
                {/* Avatar */}
                {j.foto_url ? (
                  <img src={j.foto_url} alt={j.nombre} className="avatar avatar-sm" style={{ flexShrink: 0 }} />
                ) : (
                  <div className="avatar avatar-sm avatar-placeholder" style={{ fontSize: '0.65rem', flexShrink: 0 }}>
                    {getInitials(j.nombre)}
                  </div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: isMe ? 'var(--color-neon)' : 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {j.nombre}
                    </span>
                    {isMe && <span style={{ fontSize: '0.65rem', color: 'var(--color-neon)' }}>(Tú)</span>}
                    {j.rol === 'admin' && <Crown size={13} color="var(--color-warning)" />}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span>{j.email}</span>
                    <span>{j.torneos} inscripción{j.torneos !== 1 ? 'es' : ''}</span>
                    <span>Desde {new Date(j.created_at).toLocaleDateString('es', { month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingJugador(j)}
                    title="Editar nombre y foto" style={{ padding: '0.25rem' }} disabled={isSaving}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirm(j)}
                    title="Eliminar jugador" style={{ padding: '0.25rem', color: 'var(--color-danger)' }}
                    disabled={isSaving || isMe}>
                    <Trash2 size={14} />
                  </button>

                  <div style={{ width: '1px', height: '24px', background: 'var(--color-border)', margin: '0 0.25rem' }} />

                  {j.rol === 'admin' ? (
                    <span className="badge badge-neon" style={{ fontSize: '0.65rem' }}><Shield size={10} /> ADMIN</span>
                  ) : (
                    <span className="badge badge-draw" style={{ fontSize: '0.65rem' }}><UserIcon size={10} /> JUGADOR</span>
                  )}

                  {isSaving ? (
                    <div className="spinner" style={{ width: 20, height: 20 }} />
                  ) : j.rol === 'jugador' ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleRolChange(j.id, 'admin')}
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', color: 'var(--color-neon)', border: '1px solid var(--color-border-neon)' }}>
                      <Shield size={12} /> Hacer Admin
                    </button>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleRolChange(j.id, 'jugador')}
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', color: 'var(--color-danger)' }}>
                      <UserIcon size={12} /> Quitar Admin
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => !savingId && setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-dialog">
              <h2 style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-md)' }}>¿Eliminar jugador?</h2>
              <p>Vas a eliminar a <strong>{deleteConfirm.nombre}</strong>.</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                Solo es posible si no tiene torneos ni partidos vinculados.
              </p>
              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)} disabled={!!savingId}>Cancelar</button>
                <button className={`btn btn-danger ${savingId ? 'btn-loading' : ''}`}
                  onClick={() => handleDeleteJugador(deleteConfirm.id)} disabled={!!savingId}>
                  <Trash2 size={16} /> Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
