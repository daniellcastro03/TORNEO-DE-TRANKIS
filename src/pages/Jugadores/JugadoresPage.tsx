import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Search, Shield, ChevronDown, X, Trophy, BarChart2, Clock } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface MatchRecord {
  id: string;
  torneo_id: string;
  torneo_nombre: string;
  rival_id: string;
  rival_nombre: string;
  rival_equipo: string;
  rival_equipo_escudo: string | null;
  goles_favor: number;
  goles_contra: number;
  resultado: 'W' | 'D' | 'L';
  fase: string;
  created_at: string;
}

interface TrofeoRecord {
  id: string;
  titulo: string;
  tipo_trofeo: string;
  torneo_nombre: string | null;
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

// ─── Constants ──────────────────────────────────────────────────────────────────
const FASE_LABELS: Record<string, string> = {
  grupos: 'Grupos', octavos: 'Octavos', cuartos: 'Cuartos',
  semifinal: 'Semifinal', tercer_puesto: '3er Puesto', final: 'Final',
};

const TROPHY_EMOJI: Record<string, string> = {
  oro: '🥇', plata: '🥈', bronce: '🥉', champions: '⭐', mundial: '🌍',
};

function getInitials(n: string) {
  return n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Result Badge ────────────────────────────────────────────────────────────────
function RBadge({ r }: { r: 'W' | 'D' | 'L' }) {
  const cfg = {
    W: { bg: '#16a34a22', border: '#16a34a55', text: '#39FF14', label: 'V' },
    D: { bg: '#a1720022', border: '#a1720055', text: '#d4a017', label: 'E' },
    L: { bg: '#dc262622', border: '#dc262655', text: '#FF3B3B', label: 'D' },
  }[r];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 20, height: 20, borderRadius: 5,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      color: cfg.text, fontWeight: 800, fontSize: '0.6rem', flexShrink: 0,
    }}>{cfg.label}</span>
  );
}

// ─── Result Tag (larger, for history rows) ───────────────────────────────────────
function ResultTag({ r }: { r: 'W' | 'D' | 'L' }) {
  const cfg = {
    W: { bg: 'rgba(57,255,20,0.12)', border: 'rgba(57,255,20,0.3)', text: '#39FF14', label: 'Victoria' },
    D: { bg: 'rgba(212,160,23,0.12)', border: 'rgba(212,160,23,0.3)', text: '#d4a017', label: 'Empate' },
    L: { bg: 'rgba(255,59,59,0.12)', border: 'rgba(255,59,59,0.3)', text: '#FF3B3B', label: 'Derrota' },
  }[r];
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 20,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      color: cfg.text, fontWeight: 700, fontSize: '0.65rem', whiteSpace: 'nowrap',
    }}>{cfg.label}</span>
  );
}

// ─── Player Row (in ranking list) ───────────────────────────────────────────────
function PlayerRow({ j, rank, isMe, selected, onClick }: {
  j: JugadorStats; rank: number; isMe: boolean; selected: boolean; onClick: () => void;
}) {
  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  const rankColor = rankColors[rank] ?? 'transparent';
  const rankEmoji = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : null;
  const forma5 = j.forma.slice(-5);

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.7rem 0.9rem',
        background: selected ? 'rgba(57,255,20,0.06)' : 'var(--color-bg-card)',
        border: `1px solid ${selected ? 'var(--color-border-neon)' : isMe ? 'rgba(57,255,20,0.2)' : 'var(--color-border)'}`,
        borderRadius: 10, cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: selected ? '0 0 0 1px rgba(57,255,20,0.15)' : 'none',
      }}
    >
      {/* Rank */}
      <div style={{ width: 28, textAlign: 'center', flexShrink: 0 }}>
        {rankEmoji
          ? <span style={{ fontSize: '1.1rem' }}>{rankEmoji}</span>
          : <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}>#{rank + 1}</span>
        }
      </div>

      {/* Avatar */}
      {j.foto_url
        ? <img src={j.foto_url} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${isMe ? 'var(--color-neon)' : rank < 3 ? rankColor : 'var(--color-border)'}`, flexShrink: 0 }} />
        : <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg, #2bcc10, #39FF14)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#000', border: `2px solid ${isMe ? 'var(--color-neon)' : rank < 3 ? rankColor : 'var(--color-border)'}`, flexShrink: 0 }}>{getInitials(j.nombre)}</div>
      }

      {/* Name + forma */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.88rem', color: selected ? 'var(--color-neon)' : isMe ? 'var(--color-neon)' : 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.nombre}</span>
          {isMe && <span style={{ fontSize: '0.6rem', background: 'rgba(57,255,20,0.12)', color: 'var(--color-neon)', padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>Tú</span>}
          {j.rol === 'admin' && <Shield size={11} color="var(--color-neon)" style={{ flexShrink: 0 }} />}
          {j.trofeos.length > 0 && <span style={{ fontSize: '0.65rem', color: '#FFD700' }} title={`${j.trofeos.length} trofeo(s)`}>🏆{j.trofeos.length}</span>}
        </div>
        <div style={{ display: 'flex', gap: '0.18rem', marginTop: '0.25rem' }}>
          {forma5.length > 0 ? forma5.map((r, i) => <RBadge key={i} r={r} />) : <span style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)' }}>— sin partidos</span>}
        </div>
      </div>

      {/* Key stat */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, color: j.pct >= 60 ? 'var(--color-neon)' : j.pct >= 40 ? 'var(--color-text)' : 'var(--color-text-muted)' }}>{j.victorias}V</div>
        <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>{j.pct}% win</div>
      </div>
    </div>
  );
}

// ─── Profile Panel ────────────────────────────────────────────────────────────────
function ProfilePanel({ j, rank, isMe, onClose }: {
  j: JugadorStats; rank: number; isMe: boolean; onClose: () => void;
}) {
  const [tab, setTab] = useState<'stats' | 'historial'>('historial');
  const [showAll, setShowAll] = useState(false);
  const rankColor = rank === 0 ? '#FFD700' : rank === 1 ? '#C0C0C0' : rank === 2 ? '#CD7F32' : 'var(--color-neon)';
  const allMatches = [...j.matches].reverse();
  const visibleMatches = showAll ? allMatches : allMatches.slice(0, 8);

  return (
    <div style={{
      background: 'var(--color-bg-card)',
      border: `1px solid ${rankColor}40`,
      borderRadius: 14,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      boxShadow: `0 0 30px ${rankColor}18`,
    }}>
      {/* Header */}
      <div style={{
        padding: '1.1rem 1.1rem 0.9rem',
        background: `linear-gradient(135deg, ${rankColor}0D, transparent 60%)`,
        borderBottom: '1px solid var(--color-border)',
        position: 'relative',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '0.8rem', right: '0.8rem',
          background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
          borderRadius: 7, padding: '4px', cursor: 'pointer', color: 'var(--color-text-muted)',
          display: 'flex', lineHeight: 1,
        }}><X size={14} /></button>

        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', paddingRight: '2rem' }}>
          {j.foto_url
            ? <img src={j.foto_url} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: `2.5px solid ${rankColor}`, flexShrink: 0 }} />
            : <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #2bcc10,#39FF14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 800, color: '#000', border: `2.5px solid ${rankColor}`, flexShrink: 0 }}>{getInitials(j.nombre)}</div>
          }
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem', color: rankColor, fontFamily: 'var(--font-display)' }}>{j.nombre}</h2>
              {isMe && <span style={{ fontSize: '0.6rem', background: 'rgba(57,255,20,0.12)', color: 'var(--color-neon)', padding: '1px 6px', borderRadius: 4 }}>Tú</span>}
              {j.rol === 'admin' && <Shield size={12} color="var(--color-neon)" />}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              {j.torneos} torneo{j.torneos !== 1 ? 's' : ''} · {j.partidos} partido{j.partidos !== 1 ? 's' : ''} jugados
            </div>
            {j.trofeos.length > 0 && (
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                {j.trofeos.map(t => (
                  <span key={t.id} style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 5, padding: '1px 6px', fontSize: '0.6rem', color: '#FFD700' }}>
                    {TROPHY_EMOJI[t.tipo_trofeo] || '🏆'} {t.titulo}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* W/D/L mini bar */}
        {j.partidos > 0 && (
          <div style={{ marginTop: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: 4 }}>
              <span style={{ color: '#39FF14' }}>V {j.victorias} ({Math.round(j.victorias/j.partidos*100)}%)</span>
              <span style={{ color: '#d4a017' }}>E {j.empates}</span>
              <span style={{ color: '#FF3B3B' }}>D {j.derrotas}</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, display: 'flex', overflow: 'hidden', background: 'var(--color-border)' }}>
              <div style={{ width: `${j.victorias/j.partidos*100}%`, background: '#39FF14', transition: 'width 0.8s' }} />
              <div style={{ width: `${j.empates/j.partidos*100}%`, background: '#d4a017' }} />
              <div style={{ width: `${j.derrotas/j.partidos*100}%`, background: '#FF3B3B' }} />
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', borderBottom: '1px solid var(--color-border)' }}>
        {[
          { v: j.victorias, l: 'Vict', c: '#39FF14' },
          { v: j.empates, l: 'Emp', c: '#d4a017' },
          { v: j.derrotas, l: 'Der', c: '#FF3B3B' },
          { v: j.golesFavor, l: 'GF', c: 'var(--color-text)' },
          { v: j.golesContra, l: 'GC', c: 'var(--color-text-muted)' },
        ].map(s => (
          <div key={s.l} style={{ textAlign: 'center', padding: '0.55rem 0.2rem', borderRight: '1px solid var(--color-border)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 800, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: '0.58rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
        {([['historial', 'Historial', Clock], ['stats', 'Estadísticas', BarChart2]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key as any)} style={{
            flex: 1, padding: '0.6rem', border: 'none', cursor: 'pointer',
            background: tab === key ? 'var(--color-bg-elevated)' : 'transparent',
            color: tab === key ? 'var(--color-neon)' : 'var(--color-text-muted)',
            borderBottom: tab === key ? '2px solid var(--color-neon)' : '2px solid transparent',
            fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '0.3rem', transition: 'all 0.15s',
          }}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>

        {tab === 'historial' && (
          <>
            {j.matches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                <Trophy size={28} style={{ opacity: 0.2, display: 'block', margin: '0 auto 0.5rem' }} />
                Sin partidos jugados aún
              </div>
            ) : (
              <>
                {visibleMatches.map((m, i) => {
                  const isWin = m.resultado === 'W';
                  const isDraw = m.resultado === 'D';
                  return (
                    <div key={m.id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                      padding: '0.55rem 0.65rem',
                      background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                      borderLeft: `3px solid ${isWin ? '#39FF14' : isDraw ? '#d4a017' : '#FF3B3B'}`,
                      borderRadius: '0 8px 8px 0',
                      marginBottom: '0.25rem',
                    }}>
                      <RBadge r={m.resultado} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {m.rival_equipo_escudo
                            ? <img src={m.rival_equipo_escudo} alt="" style={{ width: 18, height: 18, objectFit: 'contain', flexShrink: 0 }} />
                            : <div style={{ width: 18, height: 18, borderRadius: 3, background: 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>{(m.rival_equipo || m.rival_nombre)[0]}</div>
                          }
                          <span style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.rival_equipo}</span>
                        </div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', marginTop: 1 }}>{m.rival_nombre} · {m.torneo_nombre}{m.fase !== 'grupos' ? ` · ${FASE_LABELS[m.fase] || m.fase}` : ''}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text)' }}>{m.goles_favor} - {m.goles_contra}</div>
                        <ResultTag r={m.resultado} />
                      </div>
                    </div>
                  );
                })}
                {!showAll && j.matches.length > 8 && (
                  <button onClick={() => setShowAll(true)} style={{
                    width: '100%', marginTop: '0.5rem',
                    background: 'transparent', border: '1px dashed var(--color-border)',
                    borderRadius: 8, padding: '0.5rem', cursor: 'pointer',
                    fontSize: '0.72rem', color: 'var(--color-text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}>
                    <ChevronDown size={13} /> Ver {j.matches.length - 8} partidos más
                  </button>
                )}
                {showAll && (
                  <button onClick={() => setShowAll(false)} style={{
                    width: '100%', marginTop: '0.5rem',
                    background: 'transparent', border: '1px solid var(--color-border)',
                    borderRadius: 8, padding: '0.5rem', cursor: 'pointer',
                    fontSize: '0.72rem', color: 'var(--color-text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}>Mostrar menos</button>
                )}
              </>
            )}
          </>
        )}

        {tab === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { label: 'Partidos jugados', val: j.partidos, max: j.partidos },
              { label: 'Victorias', val: j.victorias, max: j.partidos, color: '#39FF14' },
              { label: 'Empates', val: j.empates, max: j.partidos, color: '#d4a017' },
              { label: 'Derrotas', val: j.derrotas, max: j.partidos, color: '#FF3B3B' },
              { label: 'Goles a favor', val: j.golesFavor, max: Math.max(j.golesFavor, j.golesContra, 1) },
              { label: 'Goles en contra', val: j.golesContra, max: Math.max(j.golesFavor, j.golesContra, 1), color: '#FF3B3B' },
              { label: 'Diferencia de goles', val: j.golesFavor - j.golesContra, max: Math.max(Math.abs(j.golesFavor - j.golesContra), 1), color: j.golesFavor >= j.golesContra ? '#39FF14' : '#FF3B3B' },
              { label: 'Trofeos', val: j.trofeos.length, max: Math.max(j.trofeos.length, 1), color: '#FFD700' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 3 }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{s.label}</span>
                  <span style={{ fontWeight: 700, color: s.color || 'var(--color-text)', fontFamily: 'var(--font-display)' }}>{s.val}</span>
                </div>
                {s.max > 0 && s.val > 0 && (
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--color-border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, (s.val / s.max) * 100))}%`, background: s.color || 'var(--color-neon)', borderRadius: 2, transition: 'width 0.6s ease' }} />
                  </div>
                )}
              </div>
            ))}
            <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--color-bg-elevated)', borderRadius: 8, border: '1px solid var(--color-border)', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: j.pct >= 60 ? '#39FF14' : j.pct >= 40 ? 'var(--color-text)' : '#FF3B3B' }}>{j.pct}%</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>% Victorias</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────────
export default function JugadoresPage() {
  const { user } = useAuth();
  const [jugadores, setJugadores] = useState<JugadorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'victorias' | 'partidos' | 'goles' | 'pct'>('victorias');
  const [selected, setSelected] = useState<JugadorStats | null>(null);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const { data: playersRaw } = await supabase.from('jugadores').select('id, nombre, foto_url, rol').order('nombre');
        const players = (playersRaw as any[]) || [];
        if (!players.length) { setJugadores([]); return; }

        const { data: matchesRaw } = await supabase
          .from('partidos')
          .select('id, torneo_id, jugador_local_id, jugador_visitante_id, goles_local, goles_visitante, estado, fase, fecha, created_at, torneos:torneo_id (nombre)')
          .eq('estado', 'finalizado')
          .order('created_at', { ascending: true });
        const matches = (matchesRaw as any[]) || [];

        const { data: inscsRaw } = await supabase.from('torneo_inscripciones').select('jugador_id, torneo_id, catalogos_equipos:catalogo_equipo_id (nombre, escudo_url)').neq('estado', 'rechazada');
        const inscs = (inscsRaw as any[]) || [];

        const { data: trofeosRaw } = await supabase.from('salon_fama').select('id, jugador_id, titulo, tipo_trofeo, torneos:torneo_id (nombre)');
        const trofeos = (trofeosRaw as any[]) || [];

        const inscMap = new Map<string, Map<string, { nombre: string; escudo: string | null }>>();
        for (const i of inscs) {
          if (!inscMap.has(i.jugador_id)) inscMap.set(i.jugador_id, new Map());
          inscMap.get(i.jugador_id)!.set(i.torneo_id, { nombre: i.catalogos_equipos?.nombre || 'Equipo', escudo: i.catalogos_equipos?.escudo_url || null });
        }

        const playerMap = new Map<string, { nombre: string; foto: string | null }>();
        for (const p of players) playerMap.set(p.id, { nombre: p.nombre, foto: p.foto_url });

        const trofeosMap = new Map<string, TrofeoRecord[]>();
        for (const t of trofeos) {
          if (!trofeosMap.has(t.jugador_id)) trofeosMap.set(t.jugador_id, []);
          trofeosMap.get(t.jugador_id)!.push({ id: t.id, titulo: t.titulo, tipo_trofeo: t.tipo_trofeo, torneo_nombre: t.torneos?.nombre || null });
        }

        const histMap = new Map<string, MatchRecord[]>();
        for (const p of players) histMap.set(p.id, []);

        for (const m of matches) {
          if (m.goles_local === null || m.goles_visitante === null) continue;
          const gl = m.goles_local as number, gv = m.goles_visitante as number;
          const tn = (m.torneos as any)?.nombre || 'Torneo';
          const add = (pid: string, rid: string, mg: number, tg: number) => {
            if (!histMap.has(pid)) return;
            const rival = playerMap.get(rid);
            const re = inscMap.get(rid)?.get(m.torneo_id);
            const res: 'W' | 'D' | 'L' = mg > tg ? 'W' : mg === tg ? 'D' : 'L';
            histMap.get(pid)!.push({ id: m.id, torneo_id: m.torneo_id, torneo_nombre: tn, rival_id: rid, rival_nombre: rival?.nombre || 'Jugador', rival_equipo: re?.nombre || rival?.nombre || 'Jugador', rival_equipo_escudo: re?.escudo || null, goles_favor: mg, goles_contra: tg, resultado: res, fase: m.fase, created_at: m.created_at });
          };
          if (histMap.has(m.jugador_local_id)) add(m.jugador_local_id, m.jugador_visitante_id, gl, gv);
          if (histMap.has(m.jugador_visitante_id)) add(m.jugador_visitante_id, m.jugador_local_id, gv, gl);
        }

        const torneoCount = new Map<string, number>();
        for (const [jid, tm] of inscMap.entries()) torneoCount.set(jid, tm.size);

        const stats: JugadorStats[] = players.map(p => {
          const mh = histMap.get(p.id) || [];
          const v = mh.filter(m => m.resultado === 'W').length;
          const e = mh.filter(m => m.resultado === 'D').length;
          const d = mh.filter(m => m.resultado === 'L').length;
          return { ...p, torneos: torneoCount.get(p.id) || 0, partidos: mh.length, victorias: v, empates: e, derrotas: d, golesFavor: mh.reduce((s, m) => s + m.goles_favor, 0), golesContra: mh.reduce((s, m) => s + m.goles_contra, 0), pct: mh.length > 0 ? Math.round(v / mh.length * 100) : 0, forma: mh.map(m => m.resultado), matches: mh, trofeos: trofeosMap.get(p.id) || [] };
        });

        setJugadores(stats);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
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

  const selectedRank = selected ? filtered.findIndex(j => j.id === selected.id) : -1;

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: 'var(--color-neon)', textShadow: '0 0 20px rgba(57,255,20,0.3)', marginBottom: '0.25rem' }}>👥 Jugadores</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Ranking global · Haz clic en cualquier jugador para ver su historial completo</p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
          <input type="text" placeholder="Buscar jugador..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', paddingLeft: '2.2rem', fontSize: '0.88rem' }} />
          <Search size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {([['victorias', '🏆 Victorias'], ['partidos', '⚽ Partidos'], ['goles', '🎯 Goles'], ['pct', '📈 Win%']] as const).map(([s, l]) => (
            <button key={s} className={`catalogo-tab ${sortBy === s ? 'active' : ''}`} onClick={() => setSortBy(s)} style={{ fontSize: '0.72rem' }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Leyenda forma */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
        <span>Forma reciente:</span>
        <RBadge r="W" /><span>Victoria</span>
        <RBadge r="D" /><span>Empate</span>
        <RBadge r="L" /><span>Derrota</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner spinner-lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">👥</div>
          <h3>Sin jugadores</h3>
          <p>{search ? 'Ningún jugador coincide con tu búsqueda' : 'No hay jugadores registrados'}</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: selected ? '1fr 1fr' : '1fr',
          gap: '1rem',
          alignItems: 'start',
        }}>
          {/* ── Lista de jugadores ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {/* Column headers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.9rem', marginBottom: '0.1rem' }}>
              <div style={{ width: 28, flexShrink: 0 }} />
              <div style={{ width: 34, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: '0.62rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jugador / Forma</div>
              <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stats</div>
            </div>

            {filtered.map((j, i) => (
              <PlayerRow
                key={j.id}
                j={j}
                rank={i}
                isMe={j.id === user?.id}
                selected={selected?.id === j.id}
                onClick={() => setSelected(prev => prev?.id === j.id ? null : j)}
              />
            ))}
          </div>

          {/* ── Perfil / Historial ── */}
          {selected && (
            <div style={{ position: 'sticky', top: '1rem', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              <ProfilePanel
                j={selected}
                rank={selectedRank}
                isMe={selected.id === user?.id}
                onClose={() => setSelected(null)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
