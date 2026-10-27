import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLigas } from '../../hooks/useLiga';
import { Trophy, Users, Play, Settings, Plus } from 'lucide-react';
import './Liga.css';

export default function LigaPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { ligas, loading } = useLigas();

  const estadoConfig = {
    configuracion: { label: '⚙️ Configuración', color: 'var(--color-text-muted)', bg: 'rgba(136,136,136,0.1)' },
    en_curso: { label: '⚡ En curso', color: 'var(--color-neon)', bg: 'rgba(57,255,20,0.08)' },
    finalizada: { label: '🏁 Finalizada', color: 'var(--color-text-muted)', bg: 'rgba(136,136,136,0.06)' },
  };

  return (
    <div className="liga-page fade-in">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ color: 'var(--color-neon)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🏟️ Modo Liga
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Primera División · Segunda División · FA Cup
            </p>
          </div>
          {isAdmin && (
            <button
              className="btn btn-primary"
              onClick={() => navigate('/admin/liga')}
              id="btn-crear-liga"
            >
              <Plus size={18} /> Crear Liga
            </button>
          )}
        </div>
      </div>

      {/* Premier League-style hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(57,255,20,0.06) 0%, rgba(59,130,246,0.06) 50%, rgba(139,92,246,0.04) 100%)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(3,1fr)',
        gap: '1rem',
        textAlign: 'center',
      }}>
        {[
          { emoji: '🥇', label: 'Primera División', sub: '12–16 jugadores', color: 'var(--color-neon)' },
          { emoji: '🥈', label: 'Segunda División', sub: '12–16 jugadores', color: '#3b82f6' },
          { emoji: '🏆', label: 'FA Cup', sub: 'Todos vs Todos (random)', color: '#d4a017' },
        ].map(c => (
          <div key={c.label}>
            <div style={{ fontSize: '1.8rem', marginBottom: '0.25rem' }}>{c.emoji}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', color: c.color, fontWeight: 700, marginBottom: '0.2rem' }}>
              {c.label}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : ligas.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">🏟️</div>
          <h3>Sin ligas creadas</h3>
          <p style={{ marginBottom: '1rem' }}>
            {isAdmin
              ? 'Crea la primera liga para comenzar la temporada.'
              : 'El administrador creará la primera liga pronto.'}
          </p>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => navigate('/admin/liga')}>
              <Plus size={18} /> Crear Primera Liga
            </button>
          )}
        </div>
      ) : (
        <div className="liga-admin-cards">
          {ligas.map((liga, i) => {
            const cfg = estadoConfig[liga.estado];
            return (
              <div
                key={liga.id}
                className={`card card-glow liga-admin-card fade-in fade-in-delay-${Math.min(i + 1, 4)}`}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/liga/${liga.id}`)}
                role="button"
                tabIndex={0}
                id={`liga-card-${liga.id}`}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1rem', color: 'var(--color-text)' }}>
                    🏟️ {liga.nombre}
                  </h3>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px',
                    borderRadius: 99, background: cfg.bg, color: cfg.color,
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {cfg.label}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  {liga.ida_vuelta && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      🔄 Ida y vuelta
                    </span>
                  )}
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                    📅 {new Date(liga.created_at).toLocaleDateString('es')}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                  <div style={{ flex: 1, padding: '0.5rem', background: 'rgba(57,255,20,0.05)', borderRadius: 8, border: '1px solid rgba(57,255,20,0.15)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--color-neon)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>1ª Div</div>
                  </div>
                  <div style={{ flex: 1, padding: '0.5rem', background: 'rgba(59,130,246,0.05)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.15)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6rem', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>2ª Div</div>
                  </div>
                  <div style={{ flex: 1, padding: '0.5rem', background: 'rgba(212,160,23,0.05)', borderRadius: 8, border: '1px solid rgba(212,160,23,0.15)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6rem', color: '#d4a017', textTransform: 'uppercase', letterSpacing: '0.05em' }}>FA Cup</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.75rem', color: 'var(--color-neon)', fontSize: '0.72rem', fontWeight: 600 }}>
                  {liga.estado === 'configuracion' && <><Settings size={12} /> Configurar →</>}
                  {liga.estado === 'en_curso' && <><Play size={12} /> Ver Liga →</>}
                  {liga.estado === 'finalizada' && <><Trophy size={12} /> Ver Resultados →</>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
