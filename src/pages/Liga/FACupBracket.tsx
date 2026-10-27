import { useState } from 'react';
import type { LigaPartido } from '../../types/database';
import type { LigaJugadorConDetalles } from '../../hooks/useLiga';
import { useAuth } from '../../context/AuthContext';
import { ChevronDown, ChevronRight, Trophy } from 'lucide-react';

interface FACupBracketProps {
  partidos: LigaPartido[];
  jugadores: LigaJugadorConDetalles[];
}

const FASE_LABELS: Record<string, string> = {
  ronda_32: '32avos de Final',
  ronda_16: '16avos de Final',
  octavos: 'Octavos de Final',
  cuartos: 'Cuartos de Final',
  semifinal: 'Semifinal',
  final: '⚽ Final',
};

const FASE_ORDER = ['ronda_32', 'ronda_16', 'octavos', 'cuartos', 'semifinal', 'final'];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function FACupBracket({ partidos, jugadores }: FACupBracketProps) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const faCupPartidos = partidos.filter(p => p.competicion === 'fa_cup');

  const getJugador = (id: string) => jugadores.find(j => j.jugador_id === id);

  const fasesPresentes = FASE_ORDER.filter(f => faCupPartidos.some(p => p.fase === f));

  if (faCupPartidos.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '3rem',
          color: 'var(--color-text-muted)',
        }}
      >
        <Trophy size={40} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
        <h3 style={{ marginBottom: '0.25rem' }}>FA Cup sin sortear</h3>
        <p style={{ fontSize: '0.85rem' }}>
          El administrador debe generar el sorteo de la FA Cup desde el panel de gestión.
        </p>
      </div>
    );
  }

  // Find the FA Cup winner if final is done
  const finalPartido = faCupPartidos.find(p => p.fase === 'final' && p.estado === 'finalizado');
  const winner = finalPartido
    ? finalPartido.goles_local! > finalPartido.goles_visitante!
      ? getJugador(finalPartido.jugador_local_id)
      : getJugador(finalPartido.jugador_visitante_id)
    : null;

  return (
    <div className="fade-in">
      {/* Winner Banner */}
      {winner && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,165,0,0.06))',
            border: '1px solid rgba(255,215,0,0.4)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>🏆</div>
          <div style={{ fontSize: '0.7rem', color: '#d4a017', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.35rem' }}>
            Campeón de la FA Cup
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
            {winner.jugador_foto ? (
              <img src={winner.jugador_foto} alt="" style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #d4a017' }} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #b8860b, #ffd700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#000' }}>
                {getInitials(winner.jugador_nombre)}
              </div>
            )}
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: '#ffd700', fontWeight: 800 }}>
              {winner.jugador_nombre}
            </span>
          </div>
        </div>
      )}

      {/* Rounds */}
      {fasesPresentes.map(fase => {
        const rondaPartidos = faCupPartidos.filter(p => p.fase === fase);
        const done = rondaPartidos.filter(p => p.estado === 'finalizado').length;
        const isCollapsed = collapsed[fase];

        return (
          <div key={fase} className="fa-cup-round">
            <div
              className="fa-cup-round-title"
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => setCollapsed(prev => ({ ...prev, [fase]: !prev[fase] }))}
            >
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              {FASE_LABELS[fase] || fase}
              <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                {done}/{rondaPartidos.length}
                {done === rondaPartidos.length && rondaPartidos.length > 0 && ' ✅'}
              </span>
            </div>

            {!isCollapsed && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.45rem' }}>
                {rondaPartidos.map(p => {
                  const local = getJugador(p.jugador_local_id);
                  const visita = getJugador(p.jugador_visitante_id);
                  const isLocalWin = p.estado === 'finalizado' && p.goles_local! > p.goles_visitante!;
                  const isVisitaWin = p.estado === 'finalizado' && p.goles_visitante! > p.goles_local!;
                  const isMe = p.jugador_local_id === user?.id || p.jugador_visitante_id === user?.id;

                  return (
                    <div
                      key={p.id}
                      className="liga-match-card"
                      style={{
                        border: isMe ? '1px solid var(--color-border-neon)' : undefined,
                        background: isMe ? 'rgba(57,255,20,0.02)' : undefined,
                      }}
                    >
                      {/* Local */}
                      <div className="liga-match-team" style={{ opacity: isVisitaWin ? 0.45 : 1 }}>
                        {local?.jugador_foto ? (
                          <img src={local.jugador_foto} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#2bcc10,#39FF14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 800, color: '#000', flexShrink: 0 }}>
                            {getInitials(local?.jugador_nombre || '?')}
                          </div>
                        )}
                        <span className="liga-match-team-name" style={{ fontWeight: isLocalWin ? 700 : 500 }}>
                          {local?.jugador_nombre || '?'}
                        </span>
                      </div>

                      {/* Score / VS */}
                      {p.estado === 'finalizado' ? (
                        <div className="liga-match-score">
                          {p.goles_local} - {p.goles_visitante}
                        </div>
                      ) : (
                        <div className="liga-match-vs">vs</div>
                      )}

                      {/* Visitante */}
                      <div className="liga-match-team away" style={{ opacity: isLocalWin ? 0.45 : 1 }}>
                        <span className="liga-match-team-name" style={{ fontWeight: isVisitaWin ? 700 : 500 }}>
                          {visita?.jugador_nombre || '?'}
                        </span>
                        {visita?.jugador_foto ? (
                          <img src={visita.jugador_foto} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#2bcc10,#39FF14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 800, color: '#000', flexShrink: 0 }}>
                            {getInitials(visita?.jugador_nombre || '?')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
