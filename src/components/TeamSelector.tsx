import { useState } from 'react';
import { useCatalogo } from '../hooks/useCatalogo';
import type { CatalogoEquipo, TipoTorneo } from '../types/database';
import { Search, Check, Lock, AlertCircle } from 'lucide-react';

interface TeamSelectorProps {
  tipo: TipoTorneo;
  liga?: string;
  torneoId: string;
  jugadorId: string;
  selectedTeamId?: string | null;
  onSelect: (equipo: CatalogoEquipo) => void;
  disabled?: boolean;
}

export default function TeamSelector({
  tipo,
  liga,
  torneoId,
  jugadorId: _jugadorId,
  selectedTeamId,
  onSelect,
  disabled = false,
}: TeamSelectorProps) {
  const { equipos, loading, equiposTomados, error } = useCatalogo({
    tipo,
    liga: liga || undefined,
    torneoId,
  });
  const [search, setSearch] = useState('');

  const filteredEquipos = equipos.filter((e) =>
    e.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const availableCount = equipos.filter((e) => !equiposTomados.has(e.id)).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-error" style={{ margin: '1rem 0' }}>
        <AlertCircle size={16} />
        {error}
      </div>
    );
  }

  return (
    <div className="team-selector fade-in">
      {/* Info bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-md)',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <div>
          <span className="badge badge-neon" style={{ fontSize: '0.75rem' }}>
            {availableCount} disponible{availableCount !== 1 ? 's' : ''}
          </span>
          <span className="badge badge-loss" style={{ fontSize: '0.75rem', marginLeft: '0.5rem' }}>
            {equiposTomados.size} tomado{equiposTomados.size !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="catalogo-search">
        <input
          type="text"
          placeholder="Buscar equipo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
        />
        <Search size={18} className="search-icon" />
      </div>

      {/* Grid */}
      {filteredEquipos.length === 0 ? (
        <div className="empty-state card" style={{ padding: '2rem' }}>
          <p>No se encontraron equipos</p>
        </div>
      ) : (
        <div className="equipos-grid">
          {filteredEquipos.map((equipo, index) => {
            const isTaken = equiposTomados.has(equipo.id);
            const isSelected = selectedTeamId === equipo.id;

            return (
              <div
                key={equipo.id}
                className={`equipo-card fade-in ${
                  isSelected ? 'equipo-card-selected' : ''
                } ${isTaken && !isSelected ? 'equipo-card-disabled' : ''}`}
                style={{ animationDelay: `${Math.min(index * 0.03, 0.5)}s` }}
                onClick={() => {
                  if (!isTaken && !disabled) {
                    onSelect(equipo);
                  }
                }}
                role="button"
                tabIndex={isTaken || disabled ? -1 : 0}
                aria-label={`${equipo.nombre}${isTaken ? ' - Tomado' : ''}${isSelected ? ' - Seleccionado' : ''}`}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 10,
                    background: 'var(--color-neon)',
                    color: 'var(--color-bg)',
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}

                {/* Lock indicator for taken teams */}
                {isTaken && !isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 10,
                    color: 'var(--color-danger)',
                    opacity: 0.6,
                  }}>
                    <Lock size={14} />
                  </div>
                )}

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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
