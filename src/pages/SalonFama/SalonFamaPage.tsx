import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSalonFama } from '../../hooks/useSalonFama';
import { Crown, Plus, Trash2, X, Trophy, Star } from 'lucide-react';
import './SalonFama.css';

const TROPHY_EMOJI: Record<string, string> = {
  oro: '🥇',
  plata: '🥈',
  bronce: '🥉',
  champions: '⭐',
  mundial: '🌍',
};

const RANK_COLORS = [
  { bar: 'linear-gradient(90deg, #FFD700, #FFA500)', glow: 'rgba(255,215,0,0.45)', text: '#FFD700' },
  { bar: 'linear-gradient(90deg, #C0C0C0, #A0A0A0)', glow: 'rgba(192,192,192,0.35)', text: '#C0C0C0' },
  { bar: 'linear-gradient(90deg, #CD7F32, #A0522D)', glow: 'rgba(205,127,50,0.35)', text: '#CD7F32' },
  { bar: 'linear-gradient(90deg, #39FF14, #2bcc10)', glow: 'rgba(57,255,20,0.25)', text: '#39FF14' },
  { bar: 'linear-gradient(90deg, #00BFFF, #0080FF)', glow: 'rgba(0,191,255,0.25)', text: '#00BFFF' },
];

function getColor(index: number) {
  return RANK_COLORS[Math.min(index, RANK_COLORS.length - 1)];
}

export default function SalonFamaPage() {
  const { isAdmin } = useAuth();
  const { trofeos, jugadores, torneos, loading, addTrofeo, deleteTrofeo } = useSalonFama();
  const [showModal, setShowModal] = useState(false);
  const [animated, setAnimated] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [form, setForm] = useState({
    jugador_id: '',
    torneo_id: '',
    titulo: '',
    descripcion: '',
    tipo_trofeo: 'oro',
  });
  const [submitting, setSubmitting] = useState(false);
  const barsRef = useRef<HTMLDivElement>(null);

  // Trigger bar animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Agrupar trofeos por jugador y ordenar
  const jugadoresConTrofeos = trofeos.reduce((acc, trofeo) => {
    const key = trofeo.jugador_id;
    if (!acc[key]) {
      acc[key] = { jugador: trofeo.jugador, trofeos: [] };
    }
    acc[key].trofeos.push(trofeo);
    return acc;
  }, {} as Record<string, { jugador: any; trofeos: any[] }>);

  const ranking = Object.values(jugadoresConTrofeos)
    .sort((a, b) => b.trofeos.length - a.trofeos.length);

  const maxTrofeos = ranking[0]?.trofeos.length || 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await addTrofeo({ ...form, torneo_id: form.torneo_id || null });
    setSubmitting(false);
    if (!error) {
      setShowModal(false);
      setForm({ jugador_id: '', torneo_id: '', titulo: '', descripcion: '', tipo_trofeo: 'oro' });
    } else {
      alert(`Error: ${error}`);
    }
  };

  const handleDeleteTrofeo = async (id: string) => {
    if (confirm('¿Eliminar este trofeo?')) await deleteTrofeo(id);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div className="salon-fama-page fade-in">

      {/* ── HERO HEADER ── */}
      <div className="salon-hero">
        <div className="salon-hero-bg" />
        <div className="salon-hero-stars">
          {[...Array(20)].map((_, i) => (
            <span key={i} className="star-particle" style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              fontSize: `${0.4 + Math.random() * 0.6}rem`,
            }}>✦</span>
          ))}
        </div>
        <Crown size={52} className="salon-crown-icon" />
        <h1 className="salon-title">SALÓN DE LA FAMA</h1>
        <p className="salon-subtitle">Las leyendas de Torneitos de Trankis</p>
        {isAdmin && (
          <button className="btn btn-salon-add" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Otorgar Trofeo
          </button>
        )}
      </div>

      {ranking.length === 0 ? (
        <div className="empty-state card" style={{ marginTop: '2rem' }}>
          <div className="empty-state-icon" style={{ fontSize: '3rem' }}>🏆</div>
          <h3>El Salón está vacío</h3>
          <p>Aún no hay campeones coronados.</p>
        </div>
      ) : (
        <>
          {/* ── TOP 3 PODIUM ── */}
          {ranking.length >= 2 && (
            <div className="salon-podium">
              {/* 2nd place */}
              {ranking[1] && (
                <div className="podium-slot podium-silver">
                  <div className="podium-avatar-ring podium-ring-silver">
                    {ranking[1].jugador?.foto_url ? (
                      <img src={ranking[1].jugador.foto_url} alt="" className="podium-avatar" />
                    ) : (
                      <div className="podium-avatar-ph">{ranking[1].jugador?.nombre?.[0] || '?'}</div>
                    )}
                  </div>
                  <div className="podium-label">🥈</div>
                  <div className="podium-name">{ranking[1].jugador?.nombre || '—'}</div>
                  <div className="podium-count">{ranking[1].trofeos.length} trofeos</div>
                  <div className="podium-block podium-block-2" />
                </div>
              )}
              {/* 1st place */}
              {ranking[0] && (
                <div className="podium-slot podium-gold">
                  <div className="podium-crown-emoji">👑</div>
                  <div className="podium-avatar-ring podium-ring-gold">
                    {ranking[0].jugador?.foto_url ? (
                      <img src={ranking[0].jugador.foto_url} alt="" className="podium-avatar podium-avatar-lg" />
                    ) : (
                      <div className="podium-avatar-ph podium-avatar-lg">{ranking[0].jugador?.nombre?.[0] || '?'}</div>
                    )}
                  </div>
                  <div className="podium-label">🥇</div>
                  <div className="podium-name podium-name-gold">{ranking[0].jugador?.nombre || '—'}</div>
                  <div className="podium-count">{ranking[0].trofeos.length} trofeos</div>
                  <div className="podium-block podium-block-1" />
                </div>
              )}
              {/* 3rd place */}
              {ranking[2] && (
                <div className="podium-slot podium-bronze">
                  <div className="podium-avatar-ring podium-ring-bronze">
                    {ranking[2].jugador?.foto_url ? (
                      <img src={ranking[2].jugador.foto_url} alt="" className="podium-avatar" />
                    ) : (
                      <div className="podium-avatar-ph">{ranking[2].jugador?.nombre?.[0] || '?'}</div>
                    )}
                  </div>
                  <div className="podium-label">🥉</div>
                  <div className="podium-name">{ranking[2].jugador?.nombre || '—'}</div>
                  <div className="podium-count">{ranking[2].trofeos.length} trofeos</div>
                  <div className="podium-block podium-block-3" />
                </div>
              )}
            </div>
          )}

          {/* ── RANKING BARS ── */}
          <div className="salon-ranking-section">
            <h2 className="salon-section-title"><Trophy size={20} /> Ranking de Trofeos</h2>
            <div className="salon-bars" ref={barsRef}>
              {ranking.map((item, i) => {
                const color = getColor(i);
                const pct = (item.trofeos.length / maxTrofeos) * 100;
                const isSelected = selectedPlayer === item.jugador?.nombre;

                return (
                  <div
                    className={`salon-bar-row ${isSelected ? 'bar-selected' : ''}`}
                    onClick={() => setSelectedPlayer(isSelected ? null : item.jugador?.nombre)}
                  >
                    {/* Rank + photo on left */}
                    <div className="bar-left">
                      <span className="bar-rank" style={{ color: color.text }}>#{i + 1}</span>
                      <div className="bar-player-photo" style={{ borderColor: color.text, boxShadow: `0 0 10px ${color.glow}` }}>
                        {item.jugador?.foto_url ? (
                          <img src={item.jugador.foto_url} alt={item.jugador?.nombre} />
                        ) : (
                          <div className="bar-photo-placeholder" style={{ background: color.bar, color: '#000' }}>
                            {item.jugador?.nombre?.[0] || '?'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bar track (middle) */}
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: animated ? `${pct}%` : '0%',
                          background: color.bar,
                          boxShadow: animated ? `0 0 14px ${color.glow}` : 'none',
                          transitionDelay: `${i * 0.1}s`,
                        }}
                      >
                        <span className="bar-count">{item.trofeos.length} 🏆</span>
                      </div>
                    </div>

                    {/* Player name on right */}
                    <span className="bar-name" style={{ color: color.text }}>
                      {item.jugador?.nombre || 'Jugador'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── TROFEO DETAIL (click to expand) ── */}
          {selectedPlayer && (() => {
            const item = ranking.find(r => r.jugador?.nombre === selectedPlayer);
            if (!item) return null;
            const i = ranking.indexOf(item);
            const color = getColor(i);
            return (
              <div className="salon-detail-panel fade-in" style={{ borderColor: color.text }}>
                <div className="salon-detail-header">
                  {item.jugador?.foto_url ? (
                    <img src={item.jugador.foto_url} alt="" className="salon-detail-avatar" style={{ borderColor: color.text }} />
                  ) : (
                    <div className="salon-detail-avatar salon-detail-ph" style={{ borderColor: color.text }}>
                      {item.jugador?.nombre?.[0]}
                    </div>
                  )}
                  <div>
                    <h3 style={{ color: color.text }}>{item.jugador?.nombre}</h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                      {item.trofeos.length} trofeo{item.trofeos.length !== 1 ? 's' : ''} conquistados
                    </p>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelectedPlayer(null)}>
                    <X size={16} />
                  </button>
                </div>
                <div className="salon-detail-trofeos">
                  {item.trofeos.map(t => (
                    <div key={t.id} className="salon-trofeo-chip">
                      <span>{TROPHY_EMOJI[t.tipo_trofeo] || '🏆'}</span>
                      <div>
                        <div className="trofeo-chip-title">{t.titulo}</div>
                        {t.torneo?.nombre && <div className="trofeo-chip-torneo">{t.torneo.nombre}</div>}
                        {t.descripcion && <div className="trofeo-chip-desc">{t.descripcion}</div>}
                      </div>
                      {isAdmin && (
                        <button className="btn btn-ghost btn-sm delete-trofeo" onClick={() => handleDeleteTrofeo(t.id)}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* ── MODAL AÑADIR TROFEO ── */}
      {showModal && isAdmin && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏆 Otorgar Trofeo</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Jugador</label>
                <select required value={form.jugador_id} onChange={e => setForm({ ...form, jugador_id: e.target.value })}>
                  <option value="">Selecciona un jugador...</option>
                  {jugadores.map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Torneo (Opcional)</label>
                <select value={form.torneo_id} onChange={e => setForm({ ...form, torneo_id: e.target.value })}>
                  <option value="">Sin torneo específico</option>
                  {torneos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Título del Logro</label>
                <input type="text" required placeholder="Ej: Campeón Mundial 2026" value={form.titulo}
                  onChange={e => setForm({ ...form, titulo: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Tipo de Trofeo</label>
                <select value={form.tipo_trofeo} onChange={e => setForm({ ...form, tipo_trofeo: e.target.value })}>
                  <option value="oro">🥇 Copa de Oro</option>
                  <option value="plata">🥈 Copa de Plata</option>
                  <option value="bronce">🥉 Copa de Bronce</option>
                  <option value="champions">⭐ Champions</option>
                  <option value="mundial">🌍 Copa Mundial</option>
                </select>
              </div>
              <div className="form-group">
                <label>Descripción (Opcional)</label>
                <textarea placeholder="Ej: Ganado invicto con el Real Madrid" value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={2} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className={`btn btn-primary ${submitting ? 'btn-loading' : ''}`} disabled={submitting}>
                  <Star size={16} /> Otorgar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
