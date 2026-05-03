import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  useCatalogo,
  crearEquipoCatalogo,
  actualizarEquipoCatalogo,
  eliminarEquipoCatalogo,
  getEstadisticasCatalogo,
} from '../../hooks/useCatalogo';
import type { CatalogoEquipo, TipoTorneo } from '../../types/database';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Trophy,
  Globe,
  Shield,
  Sparkles,
  ArrowLeft,
  Upload,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import './Catalogo.css';

const TIPO_CONFIG: Record<TipoTorneo | 'todos', { label: string; icon: any; emoji: string }> = {
  todos: { label: 'Todos', icon: Sparkles, emoji: '⭐' },
  champions: { label: 'Champions', icon: Trophy, emoji: '🏆' },
  mundial: { label: 'Mundial', icon: Globe, emoji: '🌍' },
  liga: { label: 'Liga', icon: Shield, emoji: '⚽' },
  libre: { label: 'Libre', icon: Sparkles, emoji: '🎮' },
};

const LIGAS = [
  { value: '', label: 'Todas las ligas' },
  { value: 'la_liga', label: 'La Liga' },
  { value: 'premier_league', label: 'Premier League' },
  { value: 'serie_a', label: 'Serie A' },
  { value: 'bundesliga', label: 'Bundesliga' },
  { value: 'ligue_1', label: 'Ligue 1' },
];

export default function CatalogoAdminPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tipoFiltro, setTipoFiltro] = useState<TipoTorneo | 'todos'>('todos');
  const [ligaFiltro, setLigaFiltro] = useState('');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ champions: 0, mundial: 0, liga: 0, libre: 0, total: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editingEquipo, setEditingEquipo] = useState<CatalogoEquipo | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CatalogoEquipo | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const catalogoOptions: any = {};
  if (tipoFiltro !== 'todos') catalogoOptions.tipo = tipoFiltro;
  if (tipoFiltro === 'liga' && ligaFiltro) catalogoOptions.liga = ligaFiltro;

  const { equipos, loading, refetch } = useCatalogo(catalogoOptions);

  useEffect(() => {
    getEstadisticasCatalogo().then(setStats);
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Filter by search
  const filteredEquipos = equipos.filter((e) =>
    e.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (equipo: CatalogoEquipo) => {
    const { error } = await eliminarEquipoCatalogo(equipo.id);
    if (error) {
      showToast(error, 'error');
    } else {
      showToast(`${equipo.nombre} eliminado`, 'success');
      refetch();
      getEstadisticasCatalogo().then(setStats);
    }
    setDeleteConfirm(null);
  };

  const handleEdit = (equipo: CatalogoEquipo) => {
    setEditingEquipo(equipo);
    setShowModal(true);
  };

  const handleSaved = () => {
    setShowModal(false);
    setEditingEquipo(null);
    refetch();
    getEstadisticasCatalogo().then(setStats);
  };

  if (!isAdmin) {
    return (
      <div className="page-container fade-in">
        <div className="empty-state card">
          <div className="empty-state-icon">🔒</div>
          <h3>Acceso denegado</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="catalogo-page fade-in">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/admin')}
            style={{ marginBottom: '0.5rem' }}
          >
            <ArrowLeft size={16} /> Volver al panel
          </button>
          <h1>Catálogo de Equipos</h1>
          <p>Gestiona los equipos disponibles para cada tipo de torneo</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setEditingEquipo(null); setShowModal(true); }}
          id="btn-add-equipo"
        >
          <Plus size={18} /> Agregar Equipo
        </button>
      </div>

      {/* Stats */}
      <div className="catalogo-stats">
        {(Object.entries(stats) as [string, number][]).map(([key, value]) => (
          <div className="card stat-card" key={key}>
            <div className="stat-value">{value}</div>
            <div className="stat-label">
              {key === 'total' ? 'Total' : TIPO_CONFIG[key as TipoTorneo]?.label || key}
            </div>
          </div>
        ))}
      </div>

      {/* Type filter tabs */}
      <div className="catalogo-tabs">
        {(Object.entries(TIPO_CONFIG) as [string, any][]).map(([key, config]) => (
          <button
            key={key}
            className={`catalogo-tab ${tipoFiltro === key ? 'active' : ''}`}
            onClick={() => { setTipoFiltro(key as TipoTorneo | 'todos'); setLigaFiltro(''); }}
          >
            {config.emoji} {config.label}
            <span className="tab-count">
              {key === 'todos' ? stats.total : stats[key as keyof typeof stats] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* League sub-filter (only for 'liga' type) */}
      {tipoFiltro === 'liga' && (
        <div className="league-tabs">
          {LIGAS.map((liga) => (
            <button
              key={liga.value}
              className={`league-tab ${ligaFiltro === liga.value ? 'active' : ''}`}
              onClick={() => setLigaFiltro(liga.value)}
            >
              {liga.label}
            </button>
          ))}
        </div>
      )}

      {/* Search + count */}
      <div className="catalogo-toolbar">
        <div className="catalogo-search">
          <input
            type="text"
            placeholder="Buscar equipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="search-equipos"
          />
          <Search size={18} className="search-icon" />
        </div>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
          {filteredEquipos.length} equipo{filteredEquipos.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Teams grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : filteredEquipos.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">📭</div>
          <h3>No hay equipos</h3>
          <p>
            {search
              ? 'No se encontraron equipos con ese nombre'
              : 'Agrega equipos al catálogo para este tipo de torneo'}
          </p>
        </div>
      ) : (
        <div className="equipos-grid">
          {filteredEquipos.map((equipo, index) => (
            <div
              key={equipo.id}
              className="equipo-card fade-in"
              style={{ animationDelay: `${Math.min(index * 0.03, 0.5)}s` }}
            >
              {/* Admin actions overlay */}
              <div className="equipo-card-actions">
                <button onClick={() => handleEdit(equipo)} title="Editar">
                  <Pencil size={14} />
                </button>
                <button
                  className="delete-btn"
                  onClick={() => setDeleteConfirm(equipo)}
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {equipo.escudo_url ? (
                <img
                  src={equipo.escudo_url}
                  alt={equipo.nombre}
                  className="equipo-escudo"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div
                className={`equipo-escudo-placeholder ${equipo.escudo_url ? 'hidden' : ''}`}
                style={equipo.escudo_url ? { display: 'none' } : {}}
              >
                {equipo.nombre[0]}
              </div>

              <span className="equipo-nombre">{equipo.nombre}</span>
              <span className="equipo-tipo">
                {TIPO_CONFIG[equipo.tipo_torneo]?.emoji} {equipo.tipo_torneo}
                {equipo.liga ? ` · ${equipo.liga.replace('_', ' ')}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <EquipoModal
          key={editingEquipo ? editingEquipo.id : 'new'}
          equipo={editingEquipo}
          onClose={() => { setShowModal(false); setEditingEquipo(null); }}
          onSaved={handleSaved}
          showToast={showToast}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-dialog">
              <h2 style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-md)' }}>
                ¿Eliminar equipo?
              </h2>
              <div className="team-preview">
                {deleteConfirm.escudo_url && (
                  <img src={deleteConfirm.escudo_url} alt="" />
                )}
                <strong>{deleteConfirm.nombre}</strong>
              </div>
              <p>Esta acción no se puede deshacer. Si hay jugadores inscritos con este equipo, puede causar problemas.</p>
              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>
                  Cancelar
                </button>
                <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>
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

// ===========================
// Equipo Add/Edit Modal
// ===========================

interface EquipoModalProps {
  equipo: CatalogoEquipo | null;
  onClose: () => void;
  onSaved: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

function EquipoModal({ equipo, onClose, onSaved, showToast }: EquipoModalProps) {
  const isEditing = !!equipo;
  const [nombre, setNombre] = useState(equipo?.nombre ?? '');
  const [escudoUrl, setEscudoUrl] = useState(equipo?.escudo_url ?? '');
  const [tipo, setTipo] = useState<TipoTorneo>(equipo?.tipo_torneo ?? 'champions');
  const [liga, setLiga] = useState(equipo?.liga ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('equipos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('equipos')
        .getPublicUrl(filePath);

      setEscudoUrl(publicUrl);
    } catch (error: any) {
      showToast('Error al subir imagen. Verifica los permisos del bucket de equipos.', 'error');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      // Reset input so the same file can be uploaded again if needed
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setSaving(true);

    if (isEditing && equipo) {
      const { error } = await actualizarEquipoCatalogo(equipo.id, {
        nombre: nombre.trim(),
        escudo_url: escudoUrl.trim() || null,
        tipo_torneo: tipo,
        liga: tipo === 'liga' ? liga || null : null,
      });
      if (error) {
        showToast(error, 'error');
      } else {
        showToast('Equipo actualizado', 'success');
        onSaved();
      }
    } else {
      const { error } = await crearEquipoCatalogo({
        nombre: nombre.trim(),
        escudo_url: escudoUrl.trim() || null,
        tipo_torneo: tipo,
        liga: tipo === 'liga' ? liga || null : null,
      });
      if (error) {
        showToast(error.includes('duplicate') ? 'Ya existe un equipo con ese nombre en este tipo' : error, 'error');
      } else {
        showToast('Equipo agregado', 'success');
        onSaved();
      }
    }

    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Editar Equipo' : 'Agregar Equipo'}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="equipo-nombre">Nombre del equipo</label>
            <input
              id="equipo-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Real Madrid"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Escudo del Equipo</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <button 
                type="button" 
                className={`btn btn-secondary btn-sm ${uploading ? 'btn-loading' : ''}`}
                onClick={() => document.getElementById('escudo-upload')?.click()}
                disabled={uploading}
                style={{ flex: 1, display: 'flex', justifyContent: 'center' }}
              >
                <Upload size={16} /> Subir Imagen
              </button>
              <input
                id="escudo-upload"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>
            <div style={{ textAlign: 'center', margin: '0.5rem 0', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>o</div>
            <input
              id="equipo-escudo"
              type="url"
              value={escudoUrl}
              onChange={(e) => setEscudoUrl(e.target.value)}
              placeholder="Ingresar URL de la imagen..."
            />
            {escudoUrl && (
              <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                <img
                  src={escudoUrl}
                  alt="Preview"
                  style={{ width: 48, height: 48, objectFit: 'contain' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="equipo-tipo">Tipo de torneo</label>
            <select
              id="equipo-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoTorneo)}
            >
              <option value="champions">🏆 Champions League</option>
              <option value="mundial">🌍 Copa del Mundo</option>
              <option value="liga">⚽ Liga</option>
              <option value="libre">🎮 Libre</option>
            </select>
          </div>

          {tipo === 'liga' && (
            <div className="form-group">
              <label htmlFor="equipo-liga">Liga</label>
              <select
                id="equipo-liga"
                value={liga}
                onChange={(e) => setLiga(e.target.value)}
              >
                <option value="">Seleccionar liga...</option>
                {LIGAS.filter((l) => l.value).map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className={`btn btn-primary ${saving ? 'btn-loading' : ''}`}
              disabled={saving || !nombre.trim()}
            >
              {isEditing ? 'Guardar cambios' : 'Agregar equipo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
