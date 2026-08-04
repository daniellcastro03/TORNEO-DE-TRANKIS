import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMisPartidos, type PartidoConDetalles } from '../../hooks/useMisPartidos';
import { Trophy, Swords } from 'lucide-react';
import './MisPartidos.css';

const FASE_LABELS: Record<string, string> = {
  grupos: 'Grupos',
  octavos: 'Octavos',
  cuartos: 'Cuartos',
  semifinal: 'Semifinal',
  tercer_puesto: '3er puesto',
  final: 'Final',
};

const FILTROS = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'finalizado', label: 'Jugados' },
];

export default function MisPartidosPage() {
  const { user } = useAuth();
  const { partidos, stats, loading } = useMisPartidos(user?.id);
  const [filtro, setFiltro] = useState('todos');

  const filtered = partidos.filter((p) => {
    if (filtro === 'todos') return true;
    return p.estado === filtro;
  });

  const getResult = (p: PartidoConDetalles): 'win' | 'draw' | 'loss' | null => {
    if (p.estado !== 'finalizado' || p.goles_local === null || p.goles_visitante === null) return null;
    const isLocal = p.jugador_local_id === user?.id;
    const myGoals = isLocal ? p.goles_local : p.goles_visitante;
    const theirGoals = isLocal ? p.goles_visitante : p.goles_local;
    if (myGoals > theirGoals) return 'win';
    if (myGoals === theirGoals) return 'draw';
    return 'loss';
  };

  return (
    <div className="mis-partidos-page fade-in">
      <div className="page-header">
        <h1>Mis Partidos</h1>
        <p>Tu historial completo de partidos en torneos</p>
      </div>

      {/* Stats */}
      <div className="mis-partidos-stats">
        <div className="card stat-card fade-in fade-in-delay-1">
          <div className="stat-value">{stats.partidosJugados}</div>
          <div className="stat-label">Jugados</div>
        </div>
        <div className="card stat-card fade-in fade-in-delay-2">
          <div className="stat-value" style={{ color: 'var(--color-neon)' }}>{stats.victorias}</div>
          <div className="stat-label">Victorias</div>
        </div>
        <div className="card stat-card fade-in fade-in-delay-3">
          <div className="stat-value">{stats.golesFavor}</div>
          <div className="stat-label">Goles favor</div>
        </div>
        <div className="card stat-card fade-in fade-in-delay-4">
          <div className="stat-value" style={{ color: stats.porcentajeVictorias >= 50 ? 'var(--color-neon)' : 'var(--color-danger)' }}>
            {stats.porcentajeVictorias}%
          </div>
          <div className="stat-label">% Victorias</div>
        </div>
      </div>

      {/* Filter */}
      <div className="matches-filter">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            className={`catalogo-tab ${filtro === f.value ? 'active' : ''}`}
            onClick={() => setFiltro(f.value)}
          >
            {f.label}
            <span className="tab-count">
              {f.value === 'todos'
                ? partidos.length
                : partidos.filter((p) => p.estado === f.value).length}
            </span>
          </button>
        ))}
      </div>

      {/* Matches list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">🎮</div>
          <h3>{filtro === 'todos' ? 'Sin partidos aún' : 'No hay partidos en esta categoría'}</h3>
          <p>Tu historial de partidos aparecerá aquí</p>
        </div>
      ) : (
        <div>
          {filtered.map((p, i) => {
            const result = getResult(p);
            const isLocal = p.jugador_local_id === user?.id;

            return (
              <div key={p.id} className="match-card fade-in" style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="match-card-header">
                  <span className="match-torneo">
                    <Trophy size={12} />
                    {p.torneo_nombre || 'Torneo'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {p.fecha && (
                      <span className="match-fecha-badge">
                        📅 Fecha {p.fecha}
                      </span>
                    )}
                    <span className="match-fase">{FASE_LABELS[p.fase] || p.fase}</span>
                  </div>
                </div>

                <div className="match-card-body">
                  {/* Local team */}
                  <div className={`match-team ${isLocal ? 'is-me' : ''}`}>
                    {p.local_escudo ? (
                      <img src={p.local_escudo} alt="" />
                    ) : (
                      <div className="equipo-escudo-placeholder" style={{ width: 40, height: 40, fontSize: '1rem' }}>
                        {(p.local_equipo || p.local_nombre || '?')[0]}
                      </div>
                    )}
                    <span className="match-team-name">{p.local_equipo || p.local_nombre || 'Local'}</span>
                    <span className="match-player-name">{p.local_nombre}</span>
                  </div>

                  {/* Score */}
                  <div className="match-score-center">
                    {p.estado === 'finalizado' ? (
                      <>
                        <div className="match-score">
                          <span className="score-num">{p.goles_local}</span>
                          <span className="score-divider">-</span>
                          <span className="score-num">{p.goles_visitante}</span>
                        </div>
                        {result && (
                          <span className={`match-result-badge result-${result}`}>
                            {result === 'win' ? 'Victoria' : result === 'draw' ? 'Empate' : 'Derrota'}
                          </span>
                        )}
                      </>
                    ) : (
                      <div className="match-score pendiente">
                        <Swords size={16} />
                        <span>Pendiente</span>
                      </div>
                    )}
                  </div>

                  {/* Visitor team */}
                  <div className={`match-team ${!isLocal ? 'is-me' : ''}`}>
                    {p.visitante_escudo ? (
                      <img src={p.visitante_escudo} alt="" />
                    ) : (
                      <div className="equipo-escudo-placeholder" style={{ width: 40, height: 40, fontSize: '1rem' }}>
                        {(p.visitante_equipo || p.visitante_nombre || '?')[0]}
                      </div>
                    )}
                    <span className="match-team-name">{p.visitante_equipo || p.visitante_nombre || 'Visitante'}</span>
                    <span className="match-player-name">{p.visitante_nombre}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
