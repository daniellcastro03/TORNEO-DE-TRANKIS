import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Search, Shield } from 'lucide-react';

interface JugadorStats {
  id: string;
  nombre: string;
  foto_url: string | null;
  rol: string;
  torneos: number;
  partidos: number;
  victorias: number;
  empates: number;
  derrotas: number;
  golesFavor: number;
  golesContra: number;
  pct: number;
}

export default function JugadoresPage() {
  const { user } = useAuth();
  const [jugadores, setJugadores] = useState<JugadorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'victorias' | 'partidos' | 'goles' | 'pct'>('victorias');

  useEffect(() => {
    async function fetchJugadores() {
      setLoading(true);
      try {
        // Fetch all players
        const { data: playersRaw } = await supabase
          .from('jugadores')
          .select('id, nombre, foto_url, rol')
          .order('nombre');

        const players = playersRaw as Array<{ id: string; nombre: string; foto_url: string | null; rol: string }> | null;
        if (!players) return;

        // Fetch all finished matches
        const { data: allMatchesRaw } = await supabase
          .from('partidos')
          .select('jugador_local_id, jugador_visitante_id, goles_local, goles_visitante, estado, torneo_id')
          .eq('estado', 'finalizado');

        // Fetch all inscriptions (count per player)
        const { data: inscripcionesRaw } = await supabase
          .from('torneo_inscripciones')
          .select('jugador_id, torneo_id');

        const matches = (allMatchesRaw as Array<{ jugador_local_id: string; jugador_visitante_id: string; goles_local: number | null; goles_visitante: number | null; estado: string; torneo_id: string }>) || [];
        const inscs = (inscripcionesRaw as Array<{ jugador_id: string; torneo_id: string }>) || [];

        const matchStats = new Map();
        players.forEach(p => matchStats.set(p.id, { v: 0, e: 0, d: 0, gf: 0, gc: 0, matches: 0 }));

        for (const m of matches) {
          if (m.goles_local === null || m.goles_visitante === null) continue;
          
          const gl = m.goles_local;
          const gv = m.goles_visitante;
          
          if (matchStats.has(m.jugador_local_id)) {
            const s = matchStats.get(m.jugador_local_id);
            s.matches++;
            s.gf += gl;
            s.gc += gv;
            if (gl > gv) s.v++;
            else if (gl === gv) s.e++;
            else s.d++;
          }
          
          if (matchStats.has(m.jugador_visitante_id)) {
            const s = matchStats.get(m.jugador_visitante_id);
            s.matches++;
            s.gf += gv;
            s.gc += gl;
            if (gv > gl) s.v++;
            else if (gv === gl) s.e++;
            else s.d++;
          }
        }

        const inscritos = new Map();
        for (const i of inscs) {
          if (!inscritos.has(i.jugador_id)) inscritos.set(i.jugador_id, new Set());
          inscritos.get(i.jugador_id).add(i.torneo_id);
        }

        const stats: JugadorStats[] = players.map((p) => {
          const s = matchStats.get(p.id) || { v: 0, e: 0, d: 0, gf: 0, gc: 0, matches: 0 };
          const torneosSet = inscritos.get(p.id);

          return {
            ...p,
            torneos: torneosSet ? torneosSet.size : 0,
            partidos: s.matches,
            victorias: s.v,
            empates: s.e,
            derrotas: s.d,
            golesFavor: s.gf,
            golesContra: s.gc,
            pct: s.matches > 0 ? Math.round((s.v / s.matches) * 100) : 0,
          };
        });

        setJugadores(stats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchJugadores();
  }, []);

  const filtered = jugadores
    .filter((j) => j.nombre.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'victorias') return b.victorias - a.victorias || b.pct - a.pct;
      if (sortBy === 'partidos') return b.partidos - a.partidos;
      if (sortBy === 'goles') return b.golesFavor - a.golesFavor;
      return b.pct - a.pct;
    });

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1>👥 Jugadores</h1>
        <p>Ranking y estadísticas de todos los jugadores</p>
      </div>

      {/* Search + Sort controls */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <input
            type="text"
            placeholder="Buscar jugador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.2rem' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {(['victorias', 'partidos', 'goles', 'pct'] as const).map((s) => (
            <button
              key={s}
              className={`catalogo-tab ${sortBy === s ? 'active' : ''}`}
              onClick={() => setSortBy(s)}
              style={{ fontSize: '0.75rem' }}
            >
              {s === 'victorias' ? '🏆 Victorias' : s === 'partidos' ? '⚽ Partidos' : s === 'goles' ? '🎯 Goles' : '📈 %Win'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">👥</div>
          <h3>Sin jugadores</h3>
          <p>{search ? 'No se encontró ningún jugador con ese nombre' : 'No hay jugadores registrados aún'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map((j, i) => {
            const isMe = j.id === user?.id;
            const isFirst = i === 0 && !search && sortBy === 'victorias';

            return (
              <div
                key={j.id}
                className="card fade-in"
                style={{
                  animationDelay: `${i * 0.03}s`,
                  padding: '0.9rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  borderColor: isMe ? 'var(--color-border-neon)' : isFirst ? 'rgba(255,215,0,0.3)' : undefined,
                  background: isFirst ? 'linear-gradient(90deg, rgba(255,215,0,0.03), transparent)' : undefined,
                }}
              >
                {/* Rank */}
                <div style={{
                  width: 28,
                  textAlign: 'center',
                  fontSize: i < 3 ? '1.1rem' : '0.8rem',
                  fontFamily: 'var(--font-display)',
                  color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--color-text-muted)',
                  flexShrink: 0,
                }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </div>

                {/* Avatar */}
                {j.foto_url ? (
                  <img src={j.foto_url} alt={j.nombre} className="avatar avatar-sm" />
                ) : (
                  <div className="avatar avatar-sm avatar-placeholder" style={{ fontSize: '0.65rem' }}>
                    {getInitials(j.nombre)}
                  </div>
                )}

                {/* Name + role */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      color: isMe ? 'var(--color-neon)' : 'var(--color-text)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {j.nombre}
                    </span>
                    {isMe && <span style={{ fontSize: '0.65rem', color: 'var(--color-neon)' }}>(Tú)</span>}
                    {j.rol === 'admin' && (
                      <span className="badge badge-neon" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
                        <Shield size={9} /> Admin
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                    {j.torneos} torneo{j.torneos !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '1rem', flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--color-neon)', fontWeight: 700 }}>
                      {j.victorias}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Wins</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>
                      {j.partidos}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>PJ</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>
                      {j.golesFavor}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>GF</div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 36 }}>
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.9rem',
                      color: j.pct >= 50 ? 'var(--color-neon)' : j.pct > 0 ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
                      fontWeight: 700,
                    }}>
                      {j.pct}%
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Win%</div>
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
