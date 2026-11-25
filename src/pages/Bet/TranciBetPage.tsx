import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  useBetJornadas,
  useBetJornadaDetalle,
  useMisBoletos,
  useAllBoletos,
  useBoletosPorLiga,
  crearBetJornada,
  agregarPartidoBet,
  upsertCuota,
  eliminarCuota,
  eliminarPartidoBet,
  colocarBoleto,
  toggleJornadaActiva,
  autoCargarPartidosYCuotas,
  type BetCuota,
  type BetMercado,
  type BetPartidoDetalle,
} from '../../hooks/useBet';
import { supabase } from '../../lib/supabase';
import type { LigaPartido } from '../../types/database';
import { Plus, Trash2, Edit2, ChevronDown, ChevronRight, Trophy, Ticket, Eye, X, Check, AlertCircle, TrendingUp } from 'lucide-react';

// ── Helpers ─────────────────────────────────────────────────

function getInitials(n: string) {
  return n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const MERCADO_LABELS: Record<BetMercado, string> = {
  '1x2': '1X2',
  goles_local: 'Goles Local',
  goles_visitante: 'Goles Visitante',
  total_goles: 'Total de Goles',
};

const OPCIONES_TOTAL_GOLES = ['+1.5', '+2.5', '+3.5', '+4.5'];

function estadoBadge(estado: string) {
  if (estado === 'ganado' || estado === 'ganada') return { bg: 'rgba(57,255,20,0.12)', border: 'rgba(57,255,20,0.3)', color: '#39FF14', label: '✅ GANADO' };
  if (estado === 'perdido' || estado === 'perdida') return { bg: 'rgba(255,59,59,0.12)', border: 'rgba(255,59,59,0.3)', color: '#FF3B3B', label: '❌ PERDIDO' };
  return { bg: 'rgba(212,160,23,0.08)', border: 'rgba(212,160,23,0.3)', color: '#d4a017', label: '⏳ PENDIENTE' };
}

// ── Main Page ────────────────────────────────────────────────

export default function TranciBetPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'apostar' | 'mis-apuestas' | 'admin'>('apostar');
  const [ligaId, setLigaId] = useState<string>('');
  const [ligas, setLigas] = useState<{ id: string; nombre: string }[]>([]);
  const [jornadaSelId, setJornadaSelId] = useState<string>('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load ligas
  useEffect(() => {
    supabase.from('ligas').select('id, nombre').order('created_at', { ascending: false })
      .then(({ data }) => {
        const ls = (data || []) as { id: string; nombre: string }[];
        setLigas(ls);
        if (ls.length > 0) setLigaId(ls[0].id);
      });
  }, []);

  const { jornadas, refetch: refetchJornadas } = useBetJornadas(ligaId);

  useEffect(() => {
    if (jornadas.length > 0 && !jornadaSelId) {
      const activa = jornadas.find(j => j.activa);
      setJornadaSelId(activa?.id || jornadas[0].id);
    }
  }, [jornadas, jornadaSelId]);

  if (!user) {
    return (
      <div className="page-container fade-in" style={{ textAlign: 'center', paddingTop: '3rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎰</div>
        <h2 style={{ color: 'var(--color-neon)' }}>TRANKIS BET</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Inicia sesión para acceder a las apuestas</p>
        <button className="btn btn-primary" onClick={() => navigate('/login')}>Iniciar Sesión</button>
        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '1.5rem' }}>
          🎲 Apuestas de ocio · Sin dinero real · Solo para diversión
        </p>
      </div>
    );
  }

  return (
    <div className="page-container fade-in">
      {toast && (
        <div style={{
          position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999,
          background: toast.type === 'success' ? 'rgba(57,255,20,0.15)' : 'rgba(255,59,59,0.15)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(57,255,20,0.4)' : 'rgba(255,59,59,0.4)'}`,
          color: toast.type === 'success' ? '#39FF14' : '#FF3B3B',
          padding: '0.75rem 1.1rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600,
          maxWidth: 320,
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.3rem' }}>
          <span style={{ fontSize: '1.6rem' }}>🎰</span>
          <h1 style={{ color: 'var(--color-neon)', textShadow: '0 0 20px rgba(57,255,20,0.3)', margin: 0, fontFamily: 'var(--font-display)' }}>
            TRANKIS BET
          </h1>
          <span style={{ fontSize: '0.65rem', background: 'rgba(57,255,20,0.1)', border: '1px solid rgba(57,255,20,0.3)', color: 'var(--color-neon)', padding: '2px 7px', borderRadius: 20, fontWeight: 700 }}>
            OCIO
          </span>
        </div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
          🎲 Apuestas simuladas · Sin dinero real · 100 Lempiras virtuales por boleto combinado
        </p>
      </div>

      {/* Liga selector */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Liga:</label>
        <select
          value={ligaId}
          onChange={e => { setLigaId(e.target.value); setJornadaSelId(''); }}
          style={{ padding: '0.3rem 0.6rem', borderRadius: 7, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: '0.82rem' }}
        >
          {ligas.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
        </select>
        <label style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Jornada:</label>
        <select
          value={jornadaSelId}
          onChange={e => setJornadaSelId(e.target.value)}
          style={{ padding: '0.3rem 0.6rem', borderRadius: 7, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: '0.82rem' }}
        >
          {jornadas.map(j => <option key={j.id} value={j.id}>{j.nombre}{!j.activa ? ' (cerrada)' : ''}</option>)}
          {jornadas.length === 0 && <option value="">Sin jornadas disponibles</option>}
        </select>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0' }}>
        {([
          ['apostar', '🎯 Apostar', Ticket],
          ['mis-apuestas', '🎫 Mis Boletos', Eye],
          ...(isAdmin ? [['admin', '⚙️ Admin BET', Edit2]] : []),
        ] as [string, string, any][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            style={{
              padding: '0.5rem 0.9rem', border: 'none', cursor: 'pointer',
              background: 'transparent',
              color: tab === key ? 'var(--color-neon)' : 'var(--color-text-muted)',
              borderBottom: tab === key ? '2px solid var(--color-neon)' : '2px solid transparent',
              fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap',
            }}
          >
            {label as string}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'apostar' && jornadaSelId && (
        <ApostarTab
          jornadaId={jornadaSelId}
          jugadorId={user.id}
          jornadas={jornadas}
          jornadaActiva={jornadas.find(j => j.id === jornadaSelId)?.activa ?? false}
          showToast={showToast}
        />
      )}

      {tab === 'mis-apuestas' && (
        <MisApuestasTab jugadorId={user.id} jornadaId={jornadaSelId} jornadas={jornadas} />
      )}

      {tab === 'admin' && isAdmin && (
        <AdminBetTab
          ligaId={ligaId}
          jornadaId={jornadaSelId}
          jornadas={jornadas}
          showToast={showToast}
          refetchJornadas={refetchJornadas}
          userId={user.id}
        />
      )}
    </div>
  );
}

// ── Tab: Apostar ─────────────────────────────────────────────

function ApostarTab({ jornadaId, jugadorId, jornadaActiva, showToast }: {
  jornadaId: string; jugadorId: string;
  jornadas: any[]; jornadaActiva: boolean;
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const { partidos, loading, refetch } = useBetJornadaDetalle(jornadaId);
  const { boletos: misBoletos, loading: boletosLoading } = useMisBoletos(jugadorId);
  const yaAposto = misBoletos.some(b => b.jornada_id === jornadaId);
  const [selecciones, setSelecciones] = useState<Record<string, BetCuota>>({});
  const [submitting, setSubmitting] = useState(false);

  // Reset selecciones when jornada changes
  useEffect(() => { setSelecciones({}); }, [jornadaId]);

  const toggleCuota = (cuota: BetCuota) => {
    setSelecciones(prev => {
      const key = cuota.bet_partido_id + '_' + cuota.mercado;
      const existing = Object.values(prev).find(c => c.bet_partido_id === cuota.bet_partido_id && c.mercado === cuota.mercado);
      if (existing?.id === cuota.id) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: cuota };
    });
  };

  const isSelected = (cuota: BetCuota) => {
    const key = cuota.bet_partido_id + '_' + cuota.mercado;
    return selecciones[key]?.id === cuota.id;
  };

  const totalCuota = Object.values(selecciones).reduce((acc, c) => acc * c.cuota, 1);
  const gananciaEstimada = (100 * totalCuota).toFixed(2);
  const totalSels = Object.keys(selecciones).length;
  const uniquePartidosCount = new Set(Object.values(selecciones).map(c => c.bet_partido_id)).size;

  const handleApostar = async () => {
    if (uniquePartidosCount < 7) {
      showToast(`Debes seleccionar mínimo 7 partidos distintos (llevas ${uniquePartidosCount})`, 'error');
      return;
    }
    setSubmitting(true);
    const { error } = await colocarBoleto(
      jornadaId, jugadorId,
      Object.values(selecciones).map(c => ({ bet_cuota_id: c.id })),
      parseFloat(totalCuota.toFixed(2))
    );
    setSubmitting(false);
    if (error) showToast(error, 'error');
    else {
      showToast('✅ ¡Boleto colocado! Buena suerte 🎲', 'success');
      setSelecciones({});
      refetch();
    }
  };

  if (loading || boletosLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>;

  if (!jornadaActiva) return (
    <div className="card empty-state" style={{ padding: '2rem', textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔒</div>
      <h3>Jornada cerrada</h3>
      <p style={{ color: 'var(--color-text-muted)' }}>Esta jornada ya no acepta nuevas apuestas</p>
    </div>
  );

  if (yaAposto) return (
    <div className="card empty-state" style={{ padding: '2rem', textAlign: 'center', border: '1px solid rgba(212,160,23,0.4)' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎫</div>
      <h3 style={{ color: '#d4a017' }}>¡Ya tienes un boleto!</h3>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        Solo se permite <strong>1 boleto por jornada</strong>. Consulta tu boleto en la pestaña <em>Mis Boletos</em>.
      </p>
    </div>
  );

  if (partidos.length === 0) return (
    <div className="card empty-state" style={{
      padding: '2rem', textAlign: 'center',
      border: '1px solid rgba(255,59,59,0.35)',
      background: 'rgba(255,59,59,0.04)',
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⛔</div>
      <h3 style={{ color: '#FF3B3B' }}>Apuestas no disponibles</h3>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        Esta jornada <strong>no tiene partidos cargados</strong>.<br />
        No es posible apostar hasta que el admin registre los partidos y cuotas.
      </p>
    </div>
  );

  return (
    <div>
      {/* Boleto en construcción (sticky bottom) */}
      {totalSels > 0 && (
        <div style={{
          position: 'sticky', top: '0.5rem', zIndex: 50, marginBottom: '1rem',
          background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-neon)',
          borderRadius: 12, padding: '0.85rem 1rem',
          boxShadow: '0 4px 20px rgba(57,255,20,0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Ticket size={16} color="var(--color-neon)" />
                <span style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.88rem' }}>
                  Tu Combinada
                </span>
                <span style={{
                  background: uniquePartidosCount >= 7 ? 'rgba(57,255,20,0.15)' : 'rgba(212,160,23,0.15)',
                  color: uniquePartidosCount >= 7 ? '#39FF14' : '#d4a017',
                  padding: '1px 7px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700,
                }}>
                  {uniquePartidosCount} partido{uniquePartidosCount !== 1 ? 's' : ''} ({totalSels} picks) {uniquePartidosCount < 7 ? `· mín 7` : '✓'}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                Cuota total: <strong style={{ color: 'var(--color-neon)', fontFamily: 'var(--font-display)' }}>{totalCuota.toFixed(2)}</strong>
                {' '}· Ganancia estimada: <strong style={{ color: '#d4a017' }}>L. {gananciaEstimada}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelecciones({})}>
                <X size={13} /> Limpiar
              </button>
              <button
                className={`btn btn-primary btn-sm ${submitting ? 'btn-loading' : ''}`}
                onClick={handleApostar}
                disabled={submitting || uniquePartidosCount < 7}
              >
                <Ticket size={14} /> Apostar L.100
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partidos y cuotas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {partidos.map(p => (
          <PartidoCuotasCard key={p.id} partido={p} isSelected={isSelected} toggleCuota={toggleCuota} />
        ))}
      </div>

      {/* Footer info */}
      <div style={{
        marginTop: '1.5rem', padding: '0.75rem 1rem',
        background: 'rgba(57,255,20,0.03)', border: '1px solid rgba(57,255,20,0.1)',
        borderRadius: 10, fontSize: '0.7rem', color: 'var(--color-text-muted)',
      }}>
        <strong style={{ color: 'var(--color-neon)' }}>📋 Reglas TRANKIS BET:</strong>
        <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <span>• Mínimo 7 partidos en tu combinada</span>
          <span>• Monto fijo: L.100 virtuales por boleto</span>
          <span>• Solo puedes seleccionar 1 cuota por mercado y partido</span>
          <span>• El boleto se resuelve automáticamente cuando se ingresan los resultados</span>
        </div>
      </div>
    </div>
  );
}

// ── Partido Cuotas Card ─────────────────────────────────────

function PartidoCuotasCard({ partido, isSelected, toggleCuota }: {
  partido: BetPartidoDetalle;
  isSelected: (c: BetCuota) => boolean;
  toggleCuota: (c: BetCuota) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const cuotasByMercado = new Map<string, BetCuota[]>();
  for (const c of partido.cuotas) {
    if (!cuotasByMercado.has(c.mercado)) cuotasByMercado.set(c.mercado, []);
    cuotasByMercado.get(c.mercado)!.push(c);
  }
  const isFinished = partido.estado === 'finalizado';

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', border: isFinished ? '1px solid var(--color-border)' : '1px solid rgba(57,255,20,0.15)' }}>
      {/* Match header */}
      <div
        style={{
          padding: '0.75rem 1rem', cursor: 'pointer',
          background: 'var(--color-bg-elevated)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* Local */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flex: 1, minWidth: 0 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#2bcc10,#39FF14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 800, color: '#000', flexShrink: 0 }}>
                {getInitials(partido.jugador_local_nombre)}
              </div>
              <span style={{ fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{partido.jugador_local_nombre}</span>
            </div>
            {/* Score or VS */}
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 800, color: isFinished ? 'var(--color-neon)' : 'var(--color-text-muted)', flexShrink: 0, padding: '0 0.4rem' }}>
              {isFinished ? `${partido.goles_local} - ${partido.goles_visitante}` : 'vs'}
            </div>
            {/* Visitante */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
              <span style={{ fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{partido.jugador_visitante_nombre}</span>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#60a5fa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                {getInitials(partido.jugador_visitante_nombre)}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            {partido.competicion === 'primera' ? '🥇 1ª División' : partido.competicion === 'segunda' ? '🥈 2ª División' : '🏆 FA Cup'}
            {partido.jornada_liga ? ` · J${partido.jornada_liga}` : ''}
            {isFinished && <span style={{ color: '#39FF14', marginLeft: '0.4rem' }}>✅ Finalizado</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.5rem' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>{partido.cuotas.length} cuotas</span>
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </div>
      </div>

      {/* Cuotas */}
      {expanded && (
        <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {[...cuotasByMercado.entries()].map(([mercado, cuotas]) => (
            <div key={mercado}>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                {MERCADO_LABELS[mercado as BetMercado] || mercado}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {cuotas.map(c => {
                  const sel = isSelected(c);
                  const label = mercado === '1x2'
                    ? (c.opcion === '1' ? partido.jugador_local_nombre : c.opcion === '2' ? partido.jugador_visitante_nombre : 'Empate')
                    : c.opcion;

                  return (
                    <button
                      key={c.id}
                      onClick={() => !isFinished && toggleCuota(c)}
                      disabled={isFinished}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        padding: '0.4rem 0.75rem', borderRadius: 8, border: 'none', cursor: isFinished ? 'default' : 'pointer',
                        background: sel ? 'rgba(57,255,20,0.15)' : 'var(--color-bg-elevated)',
                        outline: sel ? '1px solid var(--color-neon)' : '1px solid var(--color-border)',
                        transition: 'all 0.15s',
                        minWidth: 60,
                      }}
                    >
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {label}
                      </span>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', color: sel ? 'var(--color-neon)' : 'var(--color-text)', marginTop: '0.1rem' }}>
                        {Number(c.cuota).toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Mis Apuestas ───────────────────────────────────────

function MisApuestasTab({ jugadorId, jornadaId, jornadas }: { jugadorId: string; jornadaId: string; jornadas: any[] }) {
  const { boletos, loading } = useMisBoletos(jugadorId);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [scope, setScope] = useState<'torneo' | 'jornada'>('torneo');

  const ligaJornadaIds = new Set(jornadas.map(j => j.id));
  const torneoBoletos = boletos.filter(b => ligaJornadaIds.has(b.jornada_id));
  const jornadaBoletos = scope === 'jornada' && jornadaId
    ? torneoBoletos.filter(b => b.jornada_id === jornadaId)
    : torneoBoletos;
  const stats = {
    total: jornadaBoletos.length,
    ganados: jornadaBoletos.filter(b => b.estado === 'ganado').length,
    perdidos: jornadaBoletos.filter(b => b.estado === 'perdido').length,
    pendientes: jornadaBoletos.filter(b => b.estado === 'pendiente').length,
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>;

  return (
    <div>
      {/* Scope toggle */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.85rem' }}>
        {([['torneo', '🏆 Todo el torneo'], ['jornada', '📅 Esta jornada']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setScope(k)} style={{
            padding: '0.35rem 0.75rem', border: 'none', cursor: 'pointer',
            background: scope === k ? 'var(--color-bg-elevated)' : 'transparent',
            color: scope === k ? 'var(--color-neon)' : 'var(--color-text-muted)',
            borderRadius: 7, fontSize: '0.72rem', fontWeight: 600,
            outline: scope === k ? '1px solid var(--color-border-neon)' : '1px solid var(--color-border)',
          }}>{l}</button>
        ))}
      </div>

      {jornadaBoletos.length === 0 ? (
        <div className="card empty-state" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎫</div>
          <h3>Sin boletos</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>Aún no has colocado apuestas en {scope === 'jornada' ? 'esta jornada' : 'este torneo'}</p>
        </div>
      ) : (
        <>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
        {[
          { v: stats.total, l: 'Boletos', c: 'var(--color-text)' },
          { v: stats.ganados, l: 'Ganados', c: '#39FF14' },
          { v: stats.perdidos, l: 'Perdidos', c: '#FF3B3B' },
          { v: stats.pendientes, l: 'Pendientes', c: '#d4a017' },
        ].map(s => (
          <div key={s.l} className="card" style={{ padding: '0.65rem', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Boletos list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {jornadaBoletos.map(b => {
          const badge = estadoBadge(b.estado);
          const isExpanded = expanded === b.id;
          const sels = (b as any).bet_selecciones || [];

          return (
            <div key={b.id} className="card" style={{ padding: 0, overflow: 'hidden', border: `1px solid ${badge.border}` }}>
              {/* Header */}
              <div
                style={{ padding: '0.75rem 1rem', cursor: 'pointer', background: badge.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                onClick={() => setExpanded(isExpanded ? null : b.id)}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: badge.color }}>{badge.label}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{sels.length} picks</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                    Cuota: <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>{Number(b.cuota_total).toFixed(2)}</strong>
                    {' '}· Ganancia: <strong style={{ color: b.estado === 'ganado' ? '#39FF14' : 'var(--color-text-muted)' }}>L. {Number(b.ganancia_potencial).toFixed(2)}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)' }}>
                    {new Date(b.created_at).toLocaleDateString('es-HN')}
                  </span>
                  {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </div>
              </div>

              {/* Selecciones */}
              {isExpanded && sels.length > 0 && (
                <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {sels.map((s: any) => {
                    const c = s.bet_cuotas;
                    const sBadge = estadoBadge(s.estado);
                    return (
                      <div key={s.id} style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.4rem 0.6rem', borderRadius: 7,
                        background: sBadge.bg, border: `1px solid ${sBadge.border}`,
                      }}>
                        <span style={{ color: sBadge.color, fontSize: '0.75rem', flexShrink: 0 }}>
                          {s.estado === 'ganada' ? '✅' : s.estado === 'perdida' ? '❌' : '⏳'}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text)' }}>
                            {MERCADO_LABELS[c?.mercado as BetMercado] || c?.mercado}: <span style={{ color: 'var(--color-neon)' }}>{c?.opcion}</span>
                          </div>
                        </div>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)', flexShrink: 0 }}>
                          {Number(c?.cuota || 0).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
        </>
      )}
    </div>
  );
}

// ── Tab: Admin BET ───────────────────────────────────────────

function AdminBetTab({ ligaId, jornadaId, jornadas, showToast, refetchJornadas, userId }: {
  ligaId: string; jornadaId: string;
  jornadas: any[]; showToast: (m: string, t: 'success' | 'error') => void;
  refetchJornadas: () => void; userId: string;
}) {
  const { partidos, loading, refetch: refetchPartidos } = useBetJornadaDetalle(jornadaId);
  const { boletos, loading: boletosLoading, refetch: refetchBoletos } = useAllBoletos(jornadaId);
  const { boletos: ligaBoletos, refetch: refetchLigaBoletos } = useBoletosPorLiga(ligaId);
  const [adminTab, setAdminTab] = useState<'cuotas' | 'boletos'>('cuotas');
  const [expandedBoletoId, setExpandedBoletoId] = useState<string | null>(null);

  // Create jornada
  const [showCreateJornada, setShowCreateJornada] = useState(false);
  const [newJorNombre, setNewJorNombre] = useState('');
  const [newJorDesc, setNewJorDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Add partido
  const [ligaPartidos, setLigaPartidos] = useState<LigaPartido[]>([]);
  const [showAddPartido, setShowAddPartido] = useState(false);
  const [selLigaPartido, setSelLigaPartido] = useState('');
  const [addingPartido, setAddingPartido] = useState(false);

  // Cuota editor
  const [editingPartidoId, setEditingPartidoId] = useState<string | null>(null);
  const [mercadoActivo, setMercadoActivo] = useState<BetMercado>('1x2');
  const [nuevaOpcion, setNuevaOpcion] = useState('');
  const [nuevaCuota, setNuevaCuota] = useState('1.80');
  const [savingCuota, setSavingCuota] = useState(false);

  // Top ranking (único por torneo / liga)
  const topRanking = [...ligaBoletos]
    .filter(b => b.estado === 'ganado')
    .reduce<Record<string, { nombre: string; foto: string | null; ganados: number; ganancia: number }>>((acc, b) => {
      const jid = (b as any).jugador_id;
      if (!acc[jid]) acc[jid] = { nombre: (b as any).jugador_nombre, foto: (b as any).jugador_foto, ganados: 0, ganancia: 0 };
      acc[jid].ganados++;
      acc[jid].ganancia += Number(b.ganancia_potencial);
      return acc;
    }, {});
  const topList = Object.entries(topRanking).sort((a, b) => b[1].ganados - a[1].ganados || b[1].ganancia - a[1].ganancia).slice(0, 10);

  // Load liga partidos for adding
  useEffect(() => {
    if (!ligaId) return;
    supabase.from('liga_partidos')
      .select('*, jugador_local:jugador_local_id(nombre), jugador_visitante:jugador_visitante_id(nombre)')
      .eq('liga_id', ligaId)
      .order('jornada', { ascending: true })
      .then(({ data }) => setLigaPartidos((data || []) as any[]));
  }, [ligaId]);

  const handleCrearJornada = async () => {
    if (!newJorNombre.trim()) return;
    setCreating(true);
    const { data: newJornada, error } = await crearBetJornada(ligaId, newJorNombre.trim(), newJorDesc.trim(), userId);
    if (error) {
      setCreating(false);
      showToast(error, 'error');
      return;
    }
    // Auto-load partidos: parse jornada number from name e.g. "Jornada 3" → 3
    if (newJornada) {
      const match = newJorNombre.match(/\d+/);
      if (match) {
        const jorNum = parseInt(match[0], 10);
        const { partidosCargados, error: autoErr } = await autoCargarPartidosYCuotas(newJornada.id, ligaId, jorNum);
        if (autoErr) {
          showToast(`Jornada creada pero error al cargar partidos: ${autoErr}`, 'error');
        } else if (partidosCargados === 0) {
          showToast(`Jornada creada. No se encontraron partidos de liga para la jornada ${jorNum}. Verifica el número.`, 'success');
        } else {
          showToast(`✅ Jornada creada con ${partidosCargados} partidos cargados. ¡Edita las cuotas!`, 'success');
        }
      } else {
        showToast('Jornada creada (sin número detectado en el nombre, añade partidos manualmente)', 'success');
      }
    }
    setCreating(false);
    setNewJorNombre(''); setNewJorDesc('');
    setShowCreateJornada(false);
    refetchJornadas();
  };

  const handleAgregarPartido = async () => {
    if (!selLigaPartido) return;
    setAddingPartido(true);
    const { error } = await agregarPartidoBet(jornadaId, selLigaPartido);
    setAddingPartido(false);
    if (error) showToast(error, 'error');
    else { showToast('Partido añadido', 'success'); setSelLigaPartido(''); setShowAddPartido(false); refetchPartidos(); }
  };

  const handleGuardarCuota = async () => {
    if (!editingPartidoId || !nuevaOpcion.trim() || !nuevaCuota) return;
    setSavingCuota(true);
    const { error } = await upsertCuota(editingPartidoId, mercadoActivo, nuevaOpcion.trim(), parseFloat(nuevaCuota));
    setSavingCuota(false);
    if (error) showToast(error, 'error');
    else { showToast('Cuota guardada', 'success'); setNuevaOpcion(''); refetchPartidos(); }
  };

  const handleEliminarPartido = async (betPartidoId: string) => {
    if (!confirm('¿Eliminar este partido de la jornada de apuestas?')) return;
    const { error } = await eliminarPartidoBet(betPartidoId);
    if (error) showToast(error, 'error');
    else { showToast('Partido eliminado', 'success'); refetchPartidos(); }
  };

  const jornadaActual = jornadas.find(j => j.id === jornadaId);
  const availablePartidos = ligaPartidos.filter(lp => !partidos.some(p => p.liga_partido_id === lp.id));

  return (
    <div>
      {/* Admin sub-tabs */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1rem' }}>
        {([['cuotas', '📋 Cuotas'], ['boletos', '🎫 Boletos']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setAdminTab(k)} style={{
            padding: '0.4rem 0.9rem', border: 'none', cursor: 'pointer',
            background: adminTab === k ? 'var(--color-bg-elevated)' : 'transparent',
            color: adminTab === k ? 'var(--color-neon)' : 'var(--color-text-muted)',
            borderRadius: 7, fontSize: '0.78rem', fontWeight: 600,
            outline: adminTab === k ? '1px solid var(--color-border-neon)' : 'none',
          }}>{l}</button>
        ))}
      </div>

      {adminTab === 'cuotas' && (
        <div>
          {/* Controls */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateJornada(!showCreateJornada)}>
              <Plus size={14} /> Nueva Jornada
            </button>
            {jornadaId && (
              <>
                <button className="btn btn-secondary btn-sm" onClick={async () => {
                  const jorn = jornadas.find(j => j.id === jornadaId);
                  const match = jorn?.nombre?.match(/\d+/);
                  if (!match) { showToast('No se detectó número de jornada en el nombre', 'error'); return; }
                  const jorNum = parseInt(match[0], 10);
                  const { partidosCargados, error: autoErr } = await autoCargarPartidosYCuotas(jornadaId, ligaId, jorNum);
                  if (autoErr) showToast(autoErr, 'error');
                  else if (partidosCargados === 0) showToast(`Sin partidos nuevos para Jornada ${jorNum}`, 'success');
                  else { showToast(`🔄 ${partidosCargados} partidos cargados/actualizados`, 'success'); refetchPartidos(); }
                }}>
                  🔄 Recargar Partidos
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAddPartido(!showAddPartido)}>
                  <Plus size={14} /> Añadir Partido
                </button>
                {jornadaActual && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={async () => {
                      const { error } = await toggleJornadaActiva(jornadaId, !jornadaActual.activa);
                      if (error) showToast(error, 'error');
                      else { showToast(jornadaActual.activa ? 'Jornada cerrada' : 'Jornada abierta', 'success'); refetchJornadas(); }
                    }}
                  >
                    {jornadaActual.activa ? '🔒 Cerrar Jornada' : '🔓 Abrir Jornada'}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Create jornada form */}
          {showCreateJornada && (
            <div className="card" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid var(--color-border-neon)' }}>
              <h4 style={{ marginBottom: '0.75rem', color: 'var(--color-neon)' }}>📅 Nueva Jornada de Apuestas</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <input placeholder='Nombre (ej: "Jornada 5-6")' value={newJorNombre} onChange={e => setNewJorNombre(e.target.value)} style={{ padding: '0.5rem 0.75rem', borderRadius: 7 }} />
                <input placeholder='Descripción (opcional)' value={newJorDesc} onChange={e => setNewJorDesc(e.target.value)} style={{ padding: '0.5rem 0.75rem', borderRadius: 7 }} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateJornada(false)}>Cancelar</button>
                  <button className={`btn btn-primary btn-sm ${creating ? 'btn-loading' : ''}`} onClick={handleCrearJornada} disabled={creating || !newJorNombre.trim()}>
                    <Check size={14} /> Crear
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add partido form */}
          {showAddPartido && (
            <div className="card" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid rgba(59,130,246,0.3)' }}>
              <h4 style={{ marginBottom: '0.75rem', color: '#3b82f6' }}>⚽ Añadir Partido a esta Jornada</h4>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select
                  value={selLigaPartido}
                  onChange={e => setSelLigaPartido(e.target.value)}
                  style={{ flex: 1, minWidth: 200, padding: '0.4rem 0.6rem', borderRadius: 7, background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: '0.78rem' }}
                >
                  <option value="">Seleccionar partido...</option>
                  {availablePartidos.map((lp: any) => (
                    <option key={lp.id} value={lp.id}>
                      {lp.jugador_local?.nombre || '?'} vs {lp.jugador_visitante?.nombre || '?'}
                      {lp.jornada ? ` (J${lp.jornada})` : ''} · {lp.competicion}
                    </option>
                  ))}
                </select>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAddPartido(false)}>Cancelar</button>
                <button className={`btn btn-primary btn-sm ${addingPartido ? 'btn-loading' : ''}`} onClick={handleAgregarPartido} disabled={!selLigaPartido || addingPartido}>
                  <Plus size={14} /> Añadir
                </button>
              </div>
            </div>
          )}

          {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spinner" /></div>}

          {/* Partidos list with cuota editor */}
          {partidos.map(p => (
            <div key={p.id} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '0.75rem' }}>
              {/* Header */}
              <div style={{ padding: '0.75rem 1rem', background: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    {p.jugador_local_nombre} vs {p.jugador_visitante_nombre}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                    {p.competicion === 'primera' ? '1ª División' : '2ª División'}
                    {p.jornada_liga ? ` · J${p.jornada_liga}` : ''}
                    {' '}· {p.cuotas.length} cuotas cargadas
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setEditingPartidoId(editingPartidoId === p.id ? null : p.id)}
                    style={{ color: 'var(--color-neon)', fontSize: '0.7rem' }}
                  >
                    <Edit2 size={12} /> Editar cuotas
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleEliminarPartido(p.id)} style={{ color: 'var(--color-danger)' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Cuotas list */}
              {p.cuotas.length > 0 && (
                <div style={{ padding: '0.65rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {p.cuotas.map(c => (
                    <div key={c.id} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
                      borderRadius: 6, padding: '0.25rem 0.5rem', fontSize: '0.7rem',
                    }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>{MERCADO_LABELS[c.mercado as BetMercado] || c.mercado}:</span>
                      <span style={{ fontWeight: 600 }}>{c.opcion}</span>
                      <span style={{ color: 'var(--color-neon)', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{Number(c.cuota).toFixed(2)}</span>
                      <button
                        onClick={async () => {
                          const { error } = await eliminarCuota(c.id);
                          if (error) showToast(error, 'error');
                          else { showToast('Cuota eliminada', 'success'); refetchPartidos(); }
                        }}
                        title="Eliminar cuota"
                        style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center' }}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Editor */}
              {editingPartidoId === p.id && (
                <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--color-border)', background: 'rgba(57,255,20,0.03)' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
                    {(Object.keys(MERCADO_LABELS) as BetMercado[]).map(m => (
                      <button key={m} onClick={() => { setMercadoActivo(m); setNuevaOpcion(''); }} style={{
                        padding: '0.25rem 0.6rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                        background: mercadoActivo === m ? 'rgba(57,255,20,0.15)' : 'var(--color-bg-elevated)',
                        color: mercadoActivo === m ? 'var(--color-neon)' : 'var(--color-text-muted)',
                        fontSize: '0.68rem', fontWeight: 600,
                        outline: mercadoActivo === m ? '1px solid var(--color-border-neon)' : '1px solid var(--color-border)',
                      }}>
                        {MERCADO_LABELS[m]}
                      </button>
                    ))}
                  </div>

                  {/* Quick options for some mercados */}
                  {mercadoActivo === '1x2' && (
                    <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      {[{ op: '1', label: `1 (${p.jugador_local_nombre})` }, { op: 'X', label: 'X (Empate)' }, { op: '2', label: `2 (${p.jugador_visitante_nombre})` }].map(o => (
                        <button key={o.op} onClick={() => setNuevaOpcion(o.op)} style={{ padding: '0.25rem 0.6rem', borderRadius: 6, border: 'none', cursor: 'pointer', background: nuevaOpcion === o.op ? 'rgba(57,255,20,0.15)' : 'var(--color-bg-elevated)', color: nuevaOpcion === o.op ? 'var(--color-neon)' : 'var(--color-text-muted)', fontSize: '0.68rem', outline: '1px solid var(--color-border)' }}>{o.label}</button>
                      ))}
                    </div>
                  )}
                  {mercadoActivo === 'total_goles' && (
                    <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      {OPCIONES_TOTAL_GOLES.map(o => (
                        <button key={o} onClick={() => setNuevaOpcion(o)} style={{ padding: '0.25rem 0.5rem', borderRadius: 6, border: 'none', cursor: 'pointer', background: nuevaOpcion === o ? 'rgba(57,255,20,0.15)' : 'var(--color-bg-elevated)', color: nuevaOpcion === o ? 'var(--color-neon)' : 'var(--color-text-muted)', fontSize: '0.68rem', outline: '1px solid var(--color-border)' }}>{o}</button>
                      ))}
                    </div>
                  )}
                  {(mercadoActivo === 'goles_local' || mercadoActivo === 'goles_visitante') && (
                    <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      {OPCIONES_TOTAL_GOLES.map(o => (
                        <button key={o} onClick={() => setNuevaOpcion(o)} style={{ padding: '0.25rem 0.5rem', borderRadius: 6, border: 'none', cursor: 'pointer', background: nuevaOpcion === o ? 'rgba(57,255,20,0.15)' : 'var(--color-bg-elevated)', color: nuevaOpcion === o ? 'var(--color-neon)' : 'var(--color-text-muted)', fontSize: '0.68rem', outline: '1px solid var(--color-border)' }}>{o}</button>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      placeholder="Opción"
                      value={nuevaOpcion}
                      onChange={e => setNuevaOpcion(e.target.value)}
                      style={{ width: 100, padding: '0.35rem 0.6rem', borderRadius: 7, fontSize: '0.78rem' }}
                    />
                    <input
                      type="number" placeholder="Cuota" value={nuevaCuota} min="1.01" step="0.05"
                      onChange={e => setNuevaCuota(e.target.value)}
                      style={{ width: 80, padding: '0.35rem 0.6rem', borderRadius: 7, fontSize: '0.78rem' }}
                    />
                    <button className={`btn btn-primary btn-sm ${savingCuota ? 'btn-loading' : ''}`} onClick={handleGuardarCuota} disabled={savingCuota || !nuevaOpcion.trim() || !nuevaCuota}>
                      <Check size={13} /> Guardar cuota
                    </button>
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                    <AlertCircle size={11} style={{ display: 'inline', marginRight: 4 }} />
                    Si la opción ya existe, se actualiza la cuota
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Boletos Admin View */}
      {adminTab === 'boletos' && (
        <div>
          {/* Top ranking */}
          {topList.length > 0 && (
            <div className="card" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid rgba(255,215,0,0.25)', background: 'rgba(255,215,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <TrendingUp size={16} color="#FFD700" />
                <h4 style={{ margin: 0, color: '#FFD700', fontSize: '0.9rem' }}>🏆 Top Apostadores (combinadas ganadoras)</h4>
              </div>
              {topList.map(([_, p], i) => (
                <div key={_} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0', borderBottom: i < topList.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <span style={{ width: 22, fontSize: '0.75rem', fontWeight: 800, color: i < 3 ? '#FFD700' : 'var(--color-text-muted)' }}>#{i + 1}</span>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#2bcc10,#39FF14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 800, color: '#000', flexShrink: 0 }}>
                    {getInitials(p.nombre)}
                  </div>
                  <span style={{ flex: 1, fontSize: '0.78rem', fontWeight: 600 }}>{p.nombre}</span>
                  <span style={{ fontSize: '0.72rem', color: '#39FF14', fontWeight: 700 }}>{p.ganados} ganadas</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>L. {p.ganancia.toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}

          {boletosLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spinner" /></div>}

          {/* All boletos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {boletos.map(b => {
              const badge = estadoBadge(b.estado);
              const sels = (b as any).bet_selecciones || [];
              const isExp = expandedBoletoId === b.id;
              return (
                <div key={b.id} className="card" style={{ padding: 0, overflow: 'hidden', border: `1px solid ${badge.border}` }}>
                  <div
                    onClick={() => setExpandedBoletoId(isExp ? null : b.id)}
                    style={{ padding: '0.75rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#2bcc10,#39FF14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 800, color: '#000', flexShrink: 0 }}>
                      {getInitials((b as any).jugador_nombre || '?')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{(b as any).jugador_nombre}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                        {sels.length} picks · Cuota: {Number(b.cuota_total).toFixed(2)} · L. {Number(b.ganancia_potencial).toFixed(2)}
                      </div>
                    </div>
                    <span style={{ color: badge.color, fontSize: '0.72rem', fontWeight: 700 }}>{badge.label}</span>
                    {isExp ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>

                  {isExp && sels.length > 0 && (
                    <div style={{ padding: '0.6rem 1rem 0.75rem', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {sels.map((s: any) => {
                        const c = s.bet_cuotas;
                        const sBadge = estadoBadge(s.estado);
                        return (
                          <div key={s.id} style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.35rem 0.55rem', borderRadius: 6,
                            background: sBadge.bg, border: `1px solid ${sBadge.border}`, fontSize: '0.7rem',
                          }}>
                            <span style={{ color: sBadge.color }}>{s.estado === 'ganada' ? '✅' : s.estado === 'perdida' ? '❌' : '⏳'}</span>
                            <span style={{ flex: 1 }}>
                              {MERCADO_LABELS[c?.mercado as BetMercado] || c?.mercado}: <strong style={{ color: 'var(--color-neon)' }}>{c?.opcion}</strong>
                            </span>
                            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>{Number(c?.cuota || 0).toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

