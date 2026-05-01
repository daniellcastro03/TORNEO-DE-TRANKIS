import { useState } from 'react';
import { useCatalogo } from '../../hooks/useCatalogo';
import type { TipoTorneo } from '../../types/database';
import { Search } from 'lucide-react';
import '../../pages/Admin/Catalogo.css';

const TIPO_CONFIG: Record<TipoTorneo | 'todos', { label: string; emoji: string }> = {
  todos: { label: 'Todos', emoji: '⭐' },
  champions: { label: 'Champions', emoji: '🏆' },
  mundial: { label: 'Mundial', emoji: '🌍' },
  liga: { label: 'Liga', emoji: '⚽' },
  libre: { label: 'Libre', emoji: '🎮' },
};

const LIGAS = [
  { value: '', label: 'Todas' },
  { value: 'la_liga', label: 'La Liga' },
  { value: 'premier_league', label: 'Premier League' },
];

export default function CatalogoPublicoPage() {
  const [tipoFiltro, setTipoFiltro] = useState<TipoTorneo | 'todos'>('todos');
  const [ligaFiltro, setLigaFiltro] = useState('');
  const [search, setSearch] = useState('');

  const catalogoOptions: any = {};
  if (tipoFiltro !== 'todos') catalogoOptions.tipo = tipoFiltro;
  if (tipoFiltro === 'liga' && ligaFiltro) catalogoOptions.liga = ligaFiltro;

  const { equipos, loading } = useCatalogo(catalogoOptions);

  const filteredEquipos = equipos.filter((e) =>
    e.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="catalogo-page fade-in">
      <div className="page-header">
        <h1>Equipos</h1>
        <p>Explora todos los equipos disponibles en cada tipo de torneo</p>
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
          </button>
        ))}
      </div>

      {/* League sub-filter */}
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

      {/* Search */}
      <div className="catalogo-toolbar">
        <div className="catalogo-search">
          <input
            type="text"
            placeholder="Buscar equipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
              : 'No hay equipos en este catálogo aún'}
          </p>
        </div>
      ) : (
        <div className="equipos-grid">
          {filteredEquipos.map((equipo, index) => (
            <div
              key={equipo.id}
              className="equipo-card fade-in"
              style={{ animationDelay: `${Math.min(index * 0.03, 0.5)}s`, cursor: 'default' }}
            >
              {equipo.escudo_url ? (
                <img
                  src={equipo.escudo_url}
                  alt={equipo.nombre}
                  className="equipo-escudo"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="equipo-escudo-placeholder">
                  {equipo.nombre[0]}
                </div>
              )}
              <span className="equipo-nombre">{equipo.nombre}</span>
              <span className="equipo-tipo">
                {TIPO_CONFIG[equipo.tipo_torneo]?.emoji} {equipo.tipo_torneo}
                {equipo.liga ? ` · ${equipo.liga.replace('_', ' ')}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
