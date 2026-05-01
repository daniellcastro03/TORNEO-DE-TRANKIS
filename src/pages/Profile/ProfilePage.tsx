import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMisPartidos } from '../../hooks/useMisPartidos';
import { supabase } from '../../lib/supabase';
import { Camera, Save, LogOut, Shield, User as UserIcon } from 'lucide-react';
import './Profile.css';

export default function ProfilePage() {
  const { jugador, user, signOut, updateProfile, refreshProfile, isAdmin } = useAuth();
  const { stats } = useMisPartidos(user?.id);
  const [nombre, setNombre] = useState(jugador?.nombre ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      showToast('Solo se permiten imágenes', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('La imagen no debe superar 2MB', 'error');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${user.id}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await updateProfile({
        foto_url: urlData.publicUrl,
      });

      if (updateError) throw new Error(updateError);

      await refreshProfile();
      showToast('Foto actualizada', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al subir imagen', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!nombre.trim()) return;
    setSaving(true);

    const { error } = await updateProfile({ nombre: nombre.trim() });

    if (error) {
      showToast(error, 'error');
    } else {
      showToast('Perfil actualizado', 'success');
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!jugador) return null;

  return (
    <div className="profile-page fade-in">
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      <div className="profile-header">
        <div className="profile-avatar-wrapper">
          {jugador.foto_url ? (
            <img
              src={jugador.foto_url}
              alt={jugador.nombre}
              className="avatar"
              style={{ width: 100, height: 100, fontSize: '2.5rem' }}
            />
          ) : (
            <div
              className="avatar avatar-placeholder"
              style={{ width: 100, height: 100, fontSize: '2.5rem' }}
            >
              {getInitials(jugador.nombre)}
            </div>
          )}

          <label className="profile-avatar-upload" title="Cambiar foto">
            <Camera size={16} />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={uploading}
            />
          </label>
        </div>

        {uploading && (
          <div className="upload-progress" style={{ width: 100 }}>
            <div className="upload-progress-bar" style={{ width: '60%' }} />
          </div>
        )}

        <h2 className="profile-name">{jugador.nombre}</h2>
        <p className="profile-email">{jugador.email}</p>

        <div className="profile-role-badge">
          {isAdmin ? (
            <span className="badge badge-neon">
              <Shield size={12} />
              ADMIN
            </span>
          ) : (
            <span className="badge badge-draw">
              <UserIcon size={12} />
              JUGADOR
            </span>
          )}
        </div>
      </div>

      {/* Stats preview — real data */}
      <div className="profile-stats">
        <div className="card stat-card">
          <div className="stat-value">{stats.torneosActivos}</div>
          <div className="stat-label">Torneos</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{stats.partidosJugados}</div>
          <div className="stat-label">Partidos</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value" style={{ color: stats.porcentajeVictorias >= 50 ? 'var(--color-neon)' : undefined }}>
            {stats.porcentajeVictorias}%
          </div>
          <div className="stat-label">Victorias</div>
        </div>
      </div>

      <hr className="neon-line" />

      {/* Edit Profile */}
      <h3 className="profile-section-title">Editar Perfil</h3>

      <div className="profile-form">
        <div className="form-group">
          <label htmlFor="profile-name">Nombre de jugador</label>
          <input
            id="profile-name"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
            maxLength={50}
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={jugador.email}
            disabled
            style={{ opacity: 0.5 }}
          />
        </div>

        <div className="profile-actions">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !nombre.trim()}
            id="profile-save"
          >
            <Save size={18} />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            className="btn btn-danger"
            onClick={handleSignOut}
            id="profile-logout"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}
