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
  liga: '⚽ Fase de Grupos',
  ronda_32: '32avos de Final',
  ronda_16: '16avos de Final',
  octavos: 'Octavos de Final',
  cuartos: 'Cuartos de Final',
  semifinal: 'Semifinal',
  final: '⚽ Final',
};

const FASE_ORDER = ['liga', 'ronda_32', 'ronda_16', 'octavos', 'cuartos', 'semifinal', 'final'];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

interface GrupoRow {
  jugador_id: string;
  grupo: number;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
}

function calcularGruposFACup(rondaPartidos: LigaPartido[]) {
  const gruposMap = new Map<number, GrupoRow[]>();

  for (const p of rondaPartidos) {
    const g = p.jornada ?? 1;
    if (!gruposMap.has(g)) gruposMap.set(g, []);
  }

  for (const [g] of gruposMap) {
    const gPartidos = rondaPartidos.filter(p => (p.jornada ?? 1) === g);
    const playerSet = new Set<string>();
    for (const p of gPartidos) {
      playerSet.add(p.jugador_local_id);
      playerSet.add(p.jugador_visitante_id);
    }
    gruposMap.set(
      g,
      [...playerSet].map(pid => ({
        jugador_id: pid,
        grupo: g,
        pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0,
      }))
    );
  }

  for (const p of rondaPartidos) {
    if (p.estado !== 'finalizado' || p.goles_local === null || p.goles_visitante === null) continue;
    const g = p.jornada ?? 1;
    const rows = gruposMap.get(g)!;
    const local = rows.find(r => r.jugador_id === p.jugador_local_id);
    const visit = rows.find(r => r.jugador_id === p.jugador_visitante_id);
    const gl = p.goles_local;
    const gv = p.goles_visitante;

    if (local) {
      local.pj += 1;
      local.gf += gl;
      local.gc += gv;
      local.dg = local.gf - local.gc;
      if (gl > gv) { local.pg += 1; local.pts += 3; }
      else if (gl === gv) { local.pe += 1; local.pts += 1; }
      else { local.pp += 1; }
    }
    if (visit) {
      visit.pj += 1;
      visit.gf += gv;
      visit.gc += gl;
      visit.dg = visit.gf - visit.gc;
      if (gv > gl) { visit.pg += 1; visit.pts += 3; }
      else if (gl === gv) { visit.pe += 1; visit.pts += 1; }
      else { visit.pp += 1; }
    }
  }

  const sortedGrupos = [...gruposMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([grupoNum, rows]) => {
      rows.sort((a, b) => (b.pts - a.pts) || (b.dg - a.dg) || (b.gf - a.gf));
      return { grupoNum, rows };
    });

  const runnersUp: GrupoRow[] = [];
  for (const { rows } of sortedGrupos) {
    if (rows[1]) runnersUp.push(rows[1]);
  }
  runnersUp.sort((a, b) => (b.pts - a.pts) || (b.dg - a.dg) || (b.gf - a.gf));
  const best4Ids = new Set(runnersUp.slice(0, 4).map(r => r.jugador_id));

  return { sortedGrupos, runnersUp, best4Ids };
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

        // Group stage: render standings tables, best 4 runners-up, and matches
        if (fase === 'liga') {
          const { sortedGrupos, runnersUp, best4Ids } = calcularGruposFACup(rondaPartidos);

          return (
            <div key={fase} className="fa-cup-round">
              <div
                className="fa-cup-round-title"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setCollapsed(prev => ({ ...prev, [fase]: !prev[fase] }))}
              >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                {FASE_LABELS[fase]}
                <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                  {done}/{rondaPartidos.length}
                  {done === rondaPartidos.length && rondaPartidos.length > 0 && ' ✅'}
                </span>
              </div>

              {!isCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Legend */}
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#39FF14', display: 'inline-block' }} />
                      1.º de grupo (Clasificado directo)
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#f59e0b', display: 'inline-block' }} />
                      Top 4 mejores segundos (Clasifican a Octavos)
                    </span>
                  </div>

                  {/* Group Standings Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '0.85rem' }}>
                    {sortedGrupos.map(({ grupoNum, rows }) => {
                      const grupoPartidos = rondaPartidos.filter(p => (p.jornada ?? 1) === grupoNum);
                      const grupoDone = grupoPartidos.filter(p => p.estado === 'finalizado').length;

                      return (
                        <div key={grupoNum} className="premier-table-wrapper" style={{ padding: 0 }}>
                          <div style={{
                            padding: '0.55rem 0.85rem',
                            background: 'var(--color-bg-elevated)',
                            borderBottom: '1px solid var(--color-border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          }}>
                            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--color-neon)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Grupo {grupoNum}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                              {grupoDone}/{grupoPartidos.length} {grupoDone === grupoPartidos.length && grupoPartidos.length > 0 ? '✅' : ''}
                            </span>
                          </div>

                          <table className="premier-table" style={{ fontSize: '0.75rem' }}>
                            <thead>
                              <tr>
                                <th style={{ width: 26 }}>#</th>
                                <th style={{ textAlign: 'left' }}>Jugador</th>
                                <th>PJ</th>
                                <th>DG</th>
                                <th>PTS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row, idx) => {
                                const jug = getJugador(row.jugador_id);
                                const isFirst = idx === 0;
                                const isBestSecond = idx === 1 && best4Ids.has(row.jugador_id);
                                const isMe = row.jugador_id === user?.id;
                                const borderColor = isFirst ? '#39FF14' : isBestSecond ? '#f59e0b' : 'transparent';
                                const rowBg = isFirst
                                  ? 'rgba(57,255,20,0.06)'
                                  : isBestSecond
                                    ? 'rgba(245,158,11,0.07)'
                                    : isMe
                                      ? 'rgba(255,255,255,0.03)'
                                      : undefined;

                                return (
                                  <tr key={row.jugador_id} style={{ background: rowBg, borderLeft: `3px solid ${borderColor}` }}>
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: isFirst ? '#39FF14' : isBestSecond ? '#f59e0b' : 'var(--color-text-muted)' }}>
                                      {idx + 1}
                                    </td>
                                    <td>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                        {jug?.jugador_foto ? (
                                          <img src={jug.jugador_foto} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                        ) : (
                                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#2bcc10,#39FF14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.45rem', fontWeight: 800, color: '#000', flexShrink: 0 }}>
                                            {getInitials(jug?.jugador_nombre || '?')}
                                          </div>
                                        )}
                                        <span style={{ fontWeight: isFirst || isBestSecond || isMe ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 135 }}>
                                          {jug?.jugador_nombre || '?'}
                                        </span>
                                        {isFirst && (
                                          <span title="Clasificado directo" style={{ fontSize: '0.62rem', background: 'rgba(57,255,20,0.15)', color: '#39FF14', padding: '0 5px', borderRadius: 10, fontWeight: 700 }}>
                                            CLAS
                                          </span>
                                        )}
                                        {isBestSecond && (
                                          <span title="Entre los 4 mejores segundos" style={{ fontSize: '0.62rem', background: 'rgba(245,158,11,0.18)', color: '#f59e0b', padding: '0 5px', borderRadius: 10, fontWeight: 700 }}>
                                            ⭐ 2.º
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{row.pj}</td>
                                    <td style={{ textAlign: 'center', color: row.dg > 0 ? '#39FF14' : row.dg < 0 ? '#FF3B3B' : 'var(--color-text-muted)' }}>
                                      {row.dg > 0 ? `+${row.dg}` : row.dg}
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 800, fontFamily: 'var(--font-display)', color: isFirst ? '#39FF14' : isBestSecond ? '#f59e0b' : 'var(--color-text)' }}>
                                      {row.pts}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>

                  {/* Best 4 Runners-up Table */}
                  {runnersUp.length > 0 && (
                    <div className="premier-table-wrapper" style={{ border: '1px solid rgba(245,158,11,0.35)' }}>
                      <div style={{
                        padding: '0.65rem 0.9rem',
                        background: 'rgba(245,158,11,0.08)',
                        borderBottom: '1px solid rgba(245,158,11,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem',
                      }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f59e0b' }}>
                          ⭐ Mejores Segundos del Momento (Top 4 clasifican)
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                          Criterio: PTS → DG → GF
                        </span>
                      </div>
                      <table className="premier-table" style={{ fontSize: '0.76rem' }}>
                        <thead>
                          <tr>
                            <th style={{ width: 32 }}>#</th>
                            <th style={{ textAlign: 'left' }}>Jugador</th>
                            <th>Grupo</th>
                            <th>PJ</th>
                            <th>GF</th>
                            <th>DG</th>
                            <th>PTS</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {runnersUp.map((r, idx) => {
                            const jug = getJugador(r.jugador_id);
                            const clasifica = idx < 4;
                            const isMe = r.jugador_id === user?.id;
                            return (
                              <tr
                                key={r.jugador_id}
                                style={{
                                  background: clasifica ? 'rgba(245,158,11,0.06)' : undefined,
                                  borderLeft: `3px solid ${clasifica ? '#f59e0b' : 'transparent'}`,
                                  borderBottom: idx === 3 && runnersUp.length > 4 ? '2px dashed rgba(245,158,11,0.4)' : undefined,
                                }}
                              >
                                <td style={{ textAlign: 'center', fontWeight: 800, color: clasifica ? '#f59e0b' : 'var(--color-text-muted)' }}>
                                  {idx + 1}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                    {jug?.jugador_foto ? (
                                      <img src={jug.jugador_foto} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                    ) : (
                                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#2bcc10,#39FF14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.45rem', fontWeight: 800, color: '#000', flexShrink: 0 }}>
                                        {getInitials(jug?.jugador_nombre || '?')}
                                      </div>
                                    )}
                                    <span style={{ fontWeight: clasifica || isMe ? 700 : 500 }}>
                                      {jug?.jugador_nombre || '?'}
                                    </span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>G{r.grupo}</td>
                                <td style={{ textAlign: 'center' }}>{r.pj}</td>
                                <td style={{ textAlign: 'center' }}>{r.gf}</td>
                                <td style={{ textAlign: 'center', color: r.dg > 0 ? '#39FF14' : r.dg < 0 ? '#FF3B3B' : 'var(--color-text-muted)' }}>
                                  {r.dg > 0 ? `+${r.dg}` : r.dg}
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 800, fontFamily: 'var(--font-display)', color: clasifica ? '#f59e0b' : 'var(--color-text)' }}>
                                  {r.pts}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {clasifica ? (
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '2px 7px', borderRadius: 12 }}>
                                      ✅ Clasifica
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Fuera</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Group Matches */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {sortedGrupos.map(({ grupoNum }) => {
                      const grupoPartidos = rondaPartidos.filter(p => (p.jornada ?? 1) === grupoNum);
                      const grupoDone = grupoPartidos.filter(p => p.estado === 'finalizado').length;
                      return (
                        <div key={grupoNum}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                            Partidos Grupo {grupoNum} · {grupoDone}/{grupoPartidos.length} {grupoDone === grupoPartidos.length && grupoPartidos.length > 0 ? '✅' : ''}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.45rem' }}>
                            {grupoPartidos.map(p => {
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
                                  {p.estado === 'finalizado' ? (
                                    <div className="liga-match-score">
                                      {p.goles_local} - {p.goles_visitante}
                                    </div>
                                  ) : (
                                    <div className="liga-match-vs">vs</div>
                                  )}
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        }

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
