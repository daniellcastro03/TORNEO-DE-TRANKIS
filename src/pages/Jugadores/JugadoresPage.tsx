import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Search, Shield, ChevronDown, ChevronUp, X, Calendar, Swords } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────
interface MatchRecord {
  id: string;
  torneo_id: string;
  torneo_nombre: string;
  rival_id: string;
  rival_nombre: string;
  rival_foto: string | null;
  rival_equipo: string;
  rival_equipo_escudo: string | null;
  goles_favor: number;
  goles_contra: number;
  resultado: 'W' | 'D' | 'L';
  fase: string;
  fecha: string | null;
  created_at: string;
}

interface TrofeoRecord {
  id: string;
  titulo: string;
  tipo_trofeo: string;
  torneo_nombre: string | null;
  descripcion: string | null;
}

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
  forma: ('W' | 'D' | 'L')[];
  matches: MatchRecord[];
  trofeos: TrofeoRecord[];
}

// ─── Constants ───────────────────────────────────────────────────
const FASE_LABELS: Record<string, string> = {
  grupos: 'Fase de Grupos',
  octavos: 'Octavos',
  cuartos: 'Cuartos',
  semifinal: 'Semifinal',
  tercer_puesto: '3er Puesto',
  final: 'Final',
};

const TROPHY_EMOJI: Record<string, string> = {
  oro: '🥇', plata: '🥈', bronce: '🥉', champions: '⭐', mundial: '🌍',
};

// ─── Result Dot (W/D/L colored square) ───────────────────────────
function ResultDot({ r }: { r: 'W' | 'D' | 'L' }) {
  const map = {
    W: { bg: 'var(--color-win)', label: 'G', title: 'Victoria' },
    D: { bg: '#B8860B', label: 'E', title: 'Empate' },
    L: { bg: 'var(--color-loss)', label: 'D', title: 'Derrota' },
  };
  const c = map[r];
  return (
    <span title={c.title} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 22, height: 22, borderRadius: 4,
      background: c.bg, color: '#000', fontWeight: 800,
      fontSize: '0.62rem', letterSpacing: 0, flexShrink: 0,
      boxShadow: r === 'W' ? '0 0 6px rgba(57,255,20,0.5)' : r === 'L' ? '0 0 6px rgba(255,59,59,0.4)' : 'none',
    }}>
      {c.label}
    </span>
  );
}

// ─── Match Row in history ─────────────────────────────────────────
function MatchHistoryRow({ m }: { m: MatchRecord }) {
  const isWin = m.resultado === 'W';
  const isDraw = m.resultado === 'D';
  const borderColor = isWin ? 'rgba(57,255,20,0.22)' : isDraw ? 'rgba(184,134,11,0.22)' : 'rgba(255,59,59,0.18)';
  const bgColor = isWin ? 'rgba(57,255,20,0.04)' : isDraw ? 'rgba(184,134,11,0.04)' : 'rgba(255,59,59,0.04)';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      padding: '0.55rem 0.75rem',
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: 8, marginBottom: '0.3rem', fontSize: '0.78rem',
    }}>
      <ResultDot r={m.resultado} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0 }}>
        {m.rival_equipo_escudo ? (
          <img src={m.rival_equipo_escudo} alt="" style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }} />
        ) : (
          <div style={{
            width: 20, height: 20, borderRadius: 4, background: 'var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.6rem', color: 'var(--color-text-muted)', flexShrink: 0,
          }}>
            {(m.rival_equipo || m.rival_nombre)[0]}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {m.rival_equipo || m.rival_nombre}
          </div>
          <div style={{ fontSize: '0.67rem', color: 'var(--color-text-muted)' }}>{m.rival_nombre}</div>
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
        {m.goles_favor} <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>-</span> {m.goles_contra}
      </div>
      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {m.torneo_nombre}{m.fase && m.fase !== 'grupos' ? ` · ${FASE_LABELS[m.fase] || m.fase}` : ''}
      </div>
    </div>
  );
}

// ─── Player Card ──────────────────────────────────────────────────
function JugadorCard({ j, rank, isMe, onOpen }: {
  j: JugadorStats; rank: number; isMe: boolean; onOpen: () => void;
}) {
  const isFirst = rank === 0;
  const getInitials = (n: string) => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const forma5 = j.forma.slice(-5);

  return (
    <div
      className="card fade-in"
      onClick={onOpen}
      style={{
        animationDelay: `${rank * 0.03}s`,
        padding: '0.85rem 1rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        cursor: 'pointer',
        borderColor: isMe ? 'var(--color-border-neon)' : isFirst ? 'rgba(255,215,0,0.3)' : undefined,
        background: isFirst ? 'linear-gradient(90deg, rgba(255,215,0,0.04), transparent)' : undefined,
      }}
    >
      {/* Rank */}
      <div style={{
        width: 28, textAlign: 'center',
        fontSize: rank < 3 ? '1.1rem' : '0.8rem',
        fontFamily: 'var(--font-display)',
        color: rank === 0 ? '#FFD700' : rank === 1 ? '#C0C0C0' : rank === 2 ? '#CD7F32' : 'var(--color-text-muted)',
        flexShrink: 0,
      }}>
        {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`}
      </div>

      {/* Avatar */}
      {j.foto_url ? (
        <img src={j.foto_url} alt={j.nombre} className="avatar avatar-sm" style={{ border: isMe ? '2px solid var(--color-neon)' : undefined }} />
      ) : (
        <div className="avatar avatar-sm avatar-placeholder" style={{ fontSize: '0.65rem' }}>
          {getInitials(j.nombre)}
        </div>
      )}

      {/* Name + forma */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: isMe ? 'var(--color-neon)' : 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {j.nombre}
          </span>
          {isMe && <span style={{ fontSize: '0.65rem', color: 'var(--color-neon)' }}>(Tú)</span>}
          {j.rol === 'admin' && (
            <span className="badge badge-neon" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
              <Shield size={9} /> Admin
            </span>
          )}
          {j.trofeos.length > 0 && (
            <span title={`${j.trofeos.length} trofeo${j.trofeos.length !== 1 ? 's' : ''}`} style={{ fontSize: '0.7rem', color: '#FFD700' }}>
              🏆×{j.trofeos.length}
            </span>
          )}
        </div>
        {/* Forma dots */}
        <div style={{ display: 'flex', gap: '0.2rem', marginTop: '0.3rem', alignItems: 'center' }}>
          {forma5.length > 0 ? forma5.map((r, i) => <ResultDot key={i} r={r} />) : (
            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Sin partidos</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '0.9rem', flexShrink: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--color-neon)', fontWeight: 700 }}>{j.victorias}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Wins</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>{j.partidos}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>PJ</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>{j.golesFavor}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>GF</div>
        </div>
        <div style={{ textAlign: 'center', minWidth: 36 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700,
            color: j.pct >= 60 ? 'var(--color-neon)' : j.pct >= 40 ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
          }}>
            {j.pct}%
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Win%</div>
        </div>
      </div>
    </div>
  );
}

// ─── Player Profile Modal ─────────────────────────────────────────
function JugadorModal({ j, rank, isMe, onClose }: {
  j: JugadorStats; rank: number; isMe: boolean; onClose: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const getInitials = (n: string) => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const rankColor = rank === 0 ? '#FFD700' : rank === 1 ? '#C0C0C0' : rank === 2 ? '#CD7F32' : 'var(--color-neon)';
  const allMatches = [...j.matches].reverse();
  const matchesToShow = showAll ? allMatches : allMatches.slice(0, 5);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--color-bg-card)', border: `1px solid ${rankColor}`,
          borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: `0 0 40px ${rank === 0 ? 'rgba(255,215,0,0.2)' : 'var(--color-neon-glow)'}`,
          animation: 'fadeInUp 0.25s ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.25rem 1rem',
          background: `linear-gradient(135deg, ${rank === 0 ? 'rgba(255,215,0,0.08)' : 'rgba(57,255,20,0.05)'}, transparent)`,
          borderBottom: '1px solid var(--color-border)', position: 'relative',
        }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
            borderRadius: 8, cursor: 'pointer', color: 'var(--color-text-muted)', padding: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {j.foto_url ? (
              <img src={j.foto_url} alt={j.nombre} style={{
                width: 64, height: 64, borderRadius: '50%', objectFit: 'cover',
                border: `3px solid ${rankColor}`, boxShadow: `0 0 20px ${rankColor}55`, flexShrink: 0,
              }} />
            ) : (
              <div style={{
                width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--color-neon-dim), var(--color-neon))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem', fontWeight: 700, color: '#000',
                border: `3px solid ${rankColor}`,
              }}>
                {getInitials(j.nombre)}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.15rem', color: rankColor, margin: 0 }}>{j.nombre}</h2>
                {isMe && <span style={{ fontSize: '0.7rem', color: 'var(--color-neon)' }}>(Tú)</span>}
                {j.rol === 'admin' && <span className="badge badge-neon" style={{ fontSize: '0.65rem' }}><Shield size={10} /> Admin</span>}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                {j.torneos} torneo{j.torneos !== 1 ? 's' : ''} · {j.partidos} partido{j.partidos !== 1 ? 's' : ''}
              </div>
              {/* Trophies row */}
              {j.trofeos.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.5rem' }}>
                  {j.trofeos.map(t => (
                    <span key={t.id} title={`${t.titulo}${t.torneo_nombre ? ` · ${t.torneo_nombre}` : ''}`}
                      style={{
                        background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)',
                        borderRadius: 6, padding: '2px 7px', fontSize: '0.65rem', color: '#FFD700',
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                      }}>
                      {TROPHY_EMOJI[t.tipo_trofeo] || '🏆'} {t.titulo}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stat grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem', marginTop: '1rem' }}>
            {[
              { val: j.victorias, lbl: 'Victorias', color: 'var(--color-win)' },
              { val: j.empates, lbl: 'Empates', color: '#B8860B' },
              { val: j.derrotas, lbl: 'Derrotas', color: 'var(--color-loss)' },
              { val: j.golesFavor, lbl: 'GF', color: 'var(--color-text)' },
              { val: j.golesContra, lbl: 'GC', color: 'var(--color-text-muted)' },
            ].map(s => (
              <div key={s.lbl} style={{
                background: 'var(--color-bg-elevated)', borderRadius: 8, padding: '0.5rem 0.2rem',
                border: '1px solid var(--color-border)', textAlign: 'center',
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: '0.58rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.lbl}</div>
              </div>
            ))}
          </div>

          {/* W/D/L bar */}
          {j.partidos > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', marginBottom: 3 }}>
                <span style={{ color: 'var(--color-win)' }}>G {j.victorias} ({Math.round((j.victorias/j.partidos)*100)}%)</span>
                <span style={{ color: '#B8860B' }}>E {j.empates}</span>
                <span style={{ color: 'var(--color-loss)' }}>D {j.derrotas}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${(j.victorias/j.partidos)*100}%`, background: 'var(--color-win)', transition: 'width 0.6s' }} />
                <div style={{ width: `${(j.empates/j.partidos)*100}%`, background: '#B8860B' }} />
                <div style={{ width: `${(j.derrotas/j.partidos)*100}%`, background: 'var(--color-loss)' }} />
              </div>
            </div>
          )}
        </div>

        {/* Match History body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={13} /> Historial de Partidos
            </h3>
            {j.matches.length > 5 && (
              <button onClick={() => setShowAll(!showAll)} style={{
                background: 'transparent', border: '1px solid var(--color-border)',
                borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
                fontSize: '0.7rem', color: 'var(--color-neon)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {showAll ? <><ChevronUp size={12} /> Menos</> : <><ChevronDown size={12} /> Ver todos ({j.matches.length})</>}
              </button>
            )}
          </div>

          {j.matches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
              <Swords size={28} style={{ opacity: 0.3, display: 'block', margin: '0 auto 0.5rem' }} />
              Sin partidos jugados aún
            </div>
          ) : (
            <>
              {matchesToShow.map(m => <MatchHistoryRow key={m.id + '_modal'} m={m} />)}
              {!showAll && j.matches.length > 5 && (
                <button onClick={() => setShowAll(true)} style={{
                  width: '100%', marginTop: '0.4rem',
                  background: 'var(--color-bg-elevated)', border: '1px dashed var(--color-border)',
                  borderRadius: 8, padding: '0.6rem', cursor: 'pointer',
                  fontSize: '0.75rem', color: 'var(--color-text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <ChevronDown size={13} /> Ver {j.matches.length - 5} partidos más
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function JugadoresPage() {
  const { user } = useAuth();
  const [jugadores, setJugadores] = useState<JugadorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'victorias' | 'partidos' | 'goles' | 'pct'>('victorias');
  const [selectedJugador, setSelectedJugador] = useState<JugadorStats | null>(null);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        // 1. All players
        const { data: playersRaw } = await supabase
          .from('jugadores')
          .select('id, nombre, foto_url, rol')
          .order('nombre');
        const players = (playersRaw as Array<{ id: string; nombre: string; foto_url: string | null; rol: string }>) || [];
        if (!players.length) { setJugadores([]); return; }

        // 2. All finished matches (with torneo name via join)
        const { data: matchesRaw } = await supabase
          .from('partidos')
          .select('id, torneo_id, jugador_local_id, jugador_visitante_id, goles_local, goles_visitante, estado, fase, fecha, created_at, torneos:torneo_id (nombre)')
          .eq('estado', 'finalizado')
          .order('created_at', { ascending: true });
        const matches = (matchesRaw as any[]) || [];

        // 3. Inscriptions → team name per player per torneo
        const { data: inscsRaw } = await supabase
          .from('torneo_inscripciones')
          .select('jugador_id, torneo_id, catalogos_equipos:catalogo_equipo_id (nombre, escudo_url)')
          .neq('estado', 'rechazada');
        const inscs = (inscsRaw as any[]) || [];

        // 4. Trophies from salon_fama
        const { data: trofeosRaw } = await supabase
          .from('salon_fama')
          .select('id, jugador_id, titulo, tipo_trofeo, descripcion, torneos:torneo_id (nombre)');
        const trofeos = (trofeosRaw as any[]) || [];

        // Build inscription map: jugador_id → torneo_id → { nombre, escudo }
        const inscMap = new Map<string, Map<string, { nombre: string; escudo: string | null }>>();
        for (const i of inscs) {
          if (!inscMap.has(i.jugador_id)) inscMap.set(i.jugador_id, new Map());
          inscMap.get(i.jugador_id)!.set(i.torneo_id, {
            nombre: i.catalogos_equipos?.nombre || 'Equipo',
            escudo: i.catalogos_equipos?.escudo_url || null,
          });
        }

        // Player name/photo map
        const playerMap = new Map<string, { nombre: string; foto: string | null }>();
        for (const p of players) playerMap.set(p.id, { nombre: p.nombre, foto: p.foto_url });

        // Trophies map
        const trofeosMap = new Map<string, TrofeoRecord[]>();
        for (const t of trofeos) {
          if (!trofeosMap.has(t.jugador_id)) trofeosMap.set(t.jugador_id, []);
          trofeosMap.get(t.jugador_id)!.push({
            id: t.id, titulo: t.titulo, tipo_trofeo: t.tipo_trofeo,
            torneo_nombre: t.torneos?.nombre || null, descripcion: t.descripcion,
          });
        }

        // Build match history per player
        const histMap = new Map<string, MatchRecord[]>();
        for (const p of players) histMap.set(p.id, []);

        for (const m of matches) {
          if (m.goles_local === null || m.goles_visitante === null) continue;
          const gl = m.goles_local as number;
          const gv = m.goles_visitante as number;
          const torneoNombre = (m.torneos as any)?.nombre || 'Torneo';

          const addMatch = (playerId: string, rivalId: string, myG: number, theirG: number) => {
            if (!histMap.has(playerId)) return;
            const rival = playerMap.get(rivalId);
            const rivalEquipo = inscMap.get(rivalId)?.get(m.torneo_id);
            const resultado: 'W' | 'D' | 'L' = myG > theirG ? 'W' : myG === theirG ? 'D' : 'L';
            histMap.get(playerId)!.push({
              id: m.id, torneo_id: m.torneo_id, torneo_nombre: torneoNombre,
              rival_id: rivalId, rival_nombre: rival?.nombre || 'Jugador', rival_foto: rival?.foto || null,
              rival_equipo: rivalEquipo?.nombre || rival?.nombre || 'Jugador',
              rival_equipo_escudo: rivalEquipo?.escudo || null,
              goles_favor: myG, goles_contra: theirG, resultado, fase: m.fase,
              fecha: m.fecha || null, created_at: m.created_at,
            });
          };

          if (histMap.has(m.jugador_local_id)) addMatch(m.jugador_local_id, m.jugador_visitante_id, gl, gv);
          if (histMap.has(m.jugador_visitante_id)) addMatch(m.jugador_visitante_id, m.jugador_local_id, gv, gl);
        }

        // Torneo count per player
        const torneoCount = new Map<string, number>();
        for (const [jid, tmap] of inscMap.entries()) torneoCount.set(jid, tmap.size);

        const stats: JugadorStats[] = players.map(p => {
          const mhist = histMap.get(p.id) || [];
          const v = mhist.filter(m => m.resultado === 'W').length;
          const e = mhist.filter(m => m.resultado === 'D').length;
          const d = mhist.filter(m => m.resultado === 'L').length;
          const gf = mhist.reduce((s, m) => s + m.goles_favor, 0);
          const gc = mhist.reduce((s, m) => s + m.goles_contra, 0);
          return {
            ...p,
            torneos: torneoCount.get(p.id) || 0,
            partidos: mhist.length,
            victorias: v, empates: e, derrotas: d,
            golesFavor: gf, golesContra: gc,
            pct: mhist.length > 0 ? Math.round((v / mhist.length) * 100) : 0,
            forma: mhist.map(m => m.resultado),
            matches: mhist,
            trofeos: trofeosMap.get(p.id) || [],
          };
        });

        setJugadores(stats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const filtered = jugadores
    .filter(j => j.nombre.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'victorias') return b.victorias - a.victorias || b.pct - a.pct;
      if (sortBy === 'partidos') return b.partidos - a.partidos;
      if (sortBy === 'goles') return b.golesFavor - a.golesFavor;
      return b.pct - a.pct;
    });

  const selectedRank = selectedJugador ? filtered.findIndex(j => j.id === selectedJugador.id) : -1;

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1>👥 Jugadores</h1>
        <p>Ranking, estadísticas e historial completo</p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <input type="text" placeholder="Buscar jugador..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ width: '100%', paddingLeft: '2.2rem' }} />
          <Search size={16} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {(['victorias', 'partidos', 'goles', 'pct'] as const).map(s => (
            <button key={s} className={`catalogo-tab ${sortBy === s ? 'active' : ''}`}
              onClick={() => setSortBy(s)} style={{ fontSize: '0.75rem' }}>
              {s === 'victorias' ? '🏆 Victorias' : s === 'partidos' ? '⚽ Partidos' : s === 'goles' ? '🎯 Goles' : '📈 %Win'}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', fontSize: '0.72rem', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
        <span>Forma (últimos 5):</span>
        <ResultDot r="W" /> <span>Victoria</span>
        <ResultDot r="D" /> <span>Empate</span>
        <ResultDot r="L" /> <span>Derrota</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.67rem' }}>
          💡 Haz clic para ver historial completo
        </span>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {filtered.map((j, i) => (
            <JugadorCard key={j.id} j={j} rank={i} isMe={j.id === user?.id} onOpen={() => setSelectedJugador(j)} />
          ))}
        </div>
      )}

      {/* Player profile modal */}
      {selectedJugador && (
        <JugadorModal
          j={selectedJugador}
          rank={selectedRank}
          isMe={selectedJugador.id === user?.id}
          onClose={() => setSelectedJugador(null)}
        />
      )}
    </div>
  );
}