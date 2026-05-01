import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTorneos } from '../../hooks/useTorneos';
import type { EstadoTorneo, TipoTorneo } from '../../types/database';
import { Trophy, Users, Calendar, Plus, Search } from 'lucide-react';
import './Torneos.css';

const ESTADO_BADGES: Record<EstadoTorneo, { label: string; class: string }> = {
  borrador: { label: 'Borrador', class: 'badge badge-borrador' },
  inscripciones: { label: '🟢 Inscripciones abiertas', class: 'badge badge-inscripciones' },
  en_curso: { label: '⚡ En curso', class: 'badge badge-en-curso' },
  finalizado: { label: 'Finalizado', class: 'badge badge-finalizado' },
};

const TIPO_EMOJI: Record<TipoTorneo, string> = {
  champions: '🏆',
  mundial: '🌍',
  liga: '⚽',
  libre: '🎮',
};

const FILTROS: { value: EstadoTorneo | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'inscripciones', label: '🟢 Inscripciones' },
  { value: 'en_curso', label: '⚡ En curso' },
  { value: 'finalizado', label: 'Finalizados' },
  { value: 'borrador', label: 'Borradores' },
];

export default function TorneosPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<EstadoTorneo | 'todos'>('todos');
  const [search, setSearch] = useState('');

  const { torneos, loading } = useTorneos(
    filtro === 'todos' ? undefined : filtro
  );

  const filtered = torneos.filter((t) =>
    t.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="torneos-page fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Torneos</h1>
          <p>
            {filtered.length} torneo{filtered.length !== 1 ? 's' : ''}
            {filtro !== 'todos' ? ` · ${FILTROS.find((f) => f.value === filtro)?.label}` : ''}
          </p>
        </div>
        {isAdmin && (
          <button
            className="btn btn-primary"
            onClick={() => navigate('/admin/torneos/crear')}
            id="btn-crear-torneo"
          >
            <Plus size={18} /> Crear Torneo
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="torneos-filters">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            className={`catalogo-tab ${filtro === f.value ? 'active' : ''}`}
            onClick={() => setFiltro(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="catalogo-search" style={{ marginBottom: 'var(--space-lg)' }}>
        <input
          type="text"
          placeholder="Buscar torneo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Search size={18} className="search-icon" />
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">🏆</div>
          <h3>{search ? 'No se encontraron torneos' : 'No hay torneos'}</h3>
          <p>
            {isAdmin
              ? 'Crea tu primer torneo desde el botón de arriba'
              : 'Cuando un admin cree un torneo, aparecerá aquí'}
          </p>
        </div>
      ) : (
        <div className="torneos-list">
          {filtered.map((torneo, i) => {
            const pct = torneo.max_jugadores
              ? Math.min(((torneo.inscripciones_count || 0) / torneo.max_jugadores) * 100, 100)
              : 0;

            return (
              <div
                key={torneo.id}
                className="torneo-card fade-in"
                style={{ animationDelay: `${i * 0.05}s` }}
                onClick={() => navigate(`/torneos/${torneo.id}`)}
                role="button"
                tabIndex={0}
              >
                <div className="torneo-card-top">
                  <h3>
                    {TIPO_EMOJI[torneo.tipo]} {torneo.nombre}
                  </h3>
                  <div className="torneo-card-badges">
                    <span className={ESTADO_BADGES[torneo.estado].class}>
                      {ESTADO_BADGES[torneo.estado].label}
                    </span>
                  </div>
                </div>

                <div className="torneo-card-info">
                  <div className="info-item">
                    <Trophy size={14} />
                    <span style={{ textTransform: 'capitalize' }}>{torneo.tipo}</span>
                  </div>
                  <div className="info-item">
                    <Users size={14} />
                    <span>{torneo.inscripciones_count || 0} / {torneo.max_jugadores}</span>
                  </div>
                  {torneo.fecha_inicio && (
                    <div className="info-item">
                      <Calendar size={14} />
                      <span>{new Date(torneo.fecha_inicio).toLocaleDateString('es')}</span>
                    </div>
                  )}
                </div>

                <div className="torneo-card-footer">
                  <div className="players-bar">
                    <div className="players-bar-track">
                      <div className="players-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="players-bar-label">
                      {torneo.inscripciones_count || 0} de {torneo.max_jugadores} jugadores
                    </div>
                  </div>
                  <span className="badge badge-neon" style={{ fontSize: '0.7rem' }}>
                    Ver detalles →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
