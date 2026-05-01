import { useAuth } from '../../context/AuthContext';
import { useMisPartidos } from '../../hooks/useMisPartidos';
import { useTorneos } from '../../hooks/useTorneos';
import { useNavigate } from 'react-router-dom';
import { Trophy, Gamepad2, Target, TrendingUp, Users, ArrowRight } from 'lucide-react';
import './Dashboard.css';

export default function DashboardPage() {
  const { jugador, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { stats, partidos } = useMisPartidos(user?.id);
  const { torneos } = useTorneos();

  const torneosActivos = torneos.filter((t) => t.estado === 'inscripciones' || t.estado === 'en_curso');
  const proximosPartidos = partidos.filter((p) => p.estado === 'pendiente').slice(0, 5);

  return (
    <div className="dashboard fade-in">
      {/* Welcome */}
      <div className="dashboard-welcome">
        <p className="welcome-greeting">
          {getGreeting()} 👋
        </p>
        <h1>
          Bienvenido, <span>{jugador?.nombre ?? 'Jugador'}</span>
        </h1>
        {isAdmin && (
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="badge badge-neon" style={{ fontSize: '0.7rem' }}>
              ⚙️ Administrador
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/admin')}
              style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', color: 'var(--color-neon)' }}
            >
              Panel Admin →
            </button>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="dashboard-stats">
        <div className="quick-stat fade-in fade-in-delay-1">
          <div className="quick-stat-icon">
            <Trophy size={24} />
          </div>
          <div className="quick-stat-info">
            <h3>{stats.torneosActivos}</h3>
            <p>Torneos inscritos</p>
          </div>
        </div>

        <div className="quick-stat fade-in fade-in-delay-2">
          <div className="quick-stat-icon">
            <Gamepad2 size={24} />
          </div>
          <div className="quick-stat-info">
            <h3>{stats.partidosJugados}</h3>
            <p>Partidos jugados</p>
          </div>
        </div>

        <div className="quick-stat fade-in fade-in-delay-3">
          <div className="quick-stat-icon">
            <Target size={24} />
          </div>
          <div className="quick-stat-info">
            <h3>{stats.golesFavor}</h3>
            <p>Goles a favor</p>
          </div>
        </div>

        <div className="quick-stat fade-in fade-in-delay-4">
          <div className="quick-stat-icon">
            <TrendingUp size={24} />
          </div>
          <div className="quick-stat-info">
            <h3 style={{ color: stats.porcentajeVictorias >= 50 ? 'var(--color-neon)' : undefined }}>
              {stats.porcentajeVictorias}%
            </h3>
            <p>% Victorias</p>
          </div>
        </div>
      </div>

      {/* Active Tournaments */}
      <div className="dashboard-section">
        <div className="dashboard-section-header">
          <h2>
            <Trophy size={20} />
            Torneos Activos
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/torneos')}>
            Ver todos <ArrowRight size={14} />
          </button>
        </div>

        {torneosActivos.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-icon">🏆</div>
            <h3>No hay torneos activos</h3>
            <p>
              {isAdmin
                ? 'Crea tu primer torneo desde el panel de administración'
                : 'Cuando un admin cree un torneo, aparecerá aquí'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {torneosActivos.slice(0, 3).map((t) => (
              <div
                key={t.id}
                className="card"
                style={{ cursor: 'pointer', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                onClick={() => navigate(`/torneos/${t.id}`)}
                role="button"
              >
                <div>
                  <h4 style={{ fontSize: '0.9rem' }}>
                    {t.tipo === 'champions' ? '🏆' : t.tipo === 'mundial' ? '🌍' : t.tipo === 'liga' ? '⚽' : '🎮'}{' '}
                    {t.nombre}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    <Users size={12} style={{ verticalAlign: 'middle' }} /> {t.inscripciones_count || 0}/{t.max_jugadores}
                  </span>
                </div>
                <span className={`badge badge-${t.estado === 'inscripciones' ? 'inscripciones' : 'en-curso'}`} style={{ fontSize: '0.7rem' }}>
                  {t.estado === 'inscripciones' ? '🟢 Abiertas' : '⚡ En curso'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Matches */}
      <div className="dashboard-section">
        <div className="dashboard-section-header">
          <h2>
            <Gamepad2 size={20} />
            Próximos Partidos
          </h2>
          {partidos.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/mis-partidos')}>
              Ver todos <ArrowRight size={14} />
            </button>
          )}
        </div>

        {proximosPartidos.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-icon">⚽</div>
            <h3>Sin partidos pendientes</h3>
            <p>Tus próximos partidos aparecerán aquí cuando se sortee un torneo</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {proximosPartidos.map((p) => {
              const isLocal = p.jugador_local_id === user?.id;
              const opponent = isLocal
                ? (p.visitante_equipo || p.visitante_nombre || 'Rival')
                : (p.local_equipo || p.local_nombre || 'Rival');
              const opponentEscudo = isLocal ? p.visitante_escudo : p.local_escudo;

              return (
                <div key={p.id} className="card" style={{ padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {opponentEscudo ? (
                    <img src={opponentEscudo} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                  ) : (
                    <div className="equipo-escudo-placeholder" style={{ width: 28, height: 28, fontSize: '0.7rem' }}>
                      {opponent[0]}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>vs {opponent}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      {p.torneo_nombre} · {p.fase === 'grupos' ? 'Fase de grupos' : p.fase}
                    </p>
                  </div>
                  <span className="badge badge-draw" style={{ fontSize: '0.65rem' }}>Pendiente</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}
