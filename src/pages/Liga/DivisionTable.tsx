import type { ClasificacionLigaRow } from '../../hooks/useLiga';
import { useAuth } from '../../context/AuthContext';

interface DivisionTableProps {
  clasificacion: ClasificacionLigaRow[];
  division: 'primera' | 'segunda';
  totalJugadores: number;
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function DivisionTable({ clasificacion, division, totalJugadores }: DivisionTableProps) {
  const { user } = useAuth();

  // Premier League style: top 2 descend from primera, top 2 ascend from segunda
  const getRowClass = (pos: number) => {
    if (division === 'primera') {
      if (pos >= totalJugadores - 1) return 'premier-row-relegation';
      return 'premier-row-safe';
    } else {
      // segunda
      if (pos <= 2) return 'premier-row-promotion';
      return 'premier-row-safe';
    }
  };

  if (clasificacion.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
        <p>No hay jugadores en esta división</p>
      </div>
    );
  }

  return (
    <div className="premier-table-wrapper fade-in">
      <table className="premier-table">
        <thead>
          <tr>
            <th title="Posición">#</th>
            <th style={{ textAlign: 'left' }}>Jugador</th>
            <th title="Partidos Jugados">PJ</th>
            <th title="Partidos Ganados">PG</th>
            <th title="Partidos Empatados">PE</th>
            <th title="Partidos Perdidos">PP</th>
            <th title="Goles a Favor">GF</th>
            <th title="Goles en Contra">GC</th>
            <th title="Diferencia de Goles">DG</th>
            <th title="Puntos">PTS</th>
            <th title="Forma reciente">Forma</th>
          </tr>
        </thead>
        <tbody>
          {clasificacion.map((row) => {
            const rowClass = getRowClass(row.posicion);
            const isMe = row.jugador_id === user?.id;
            const forma5 = row.forma.slice(-5);

            return (
              <tr
                key={row.jugador_id}
                className={`${rowClass} ${isMe ? 'premier-row-me' : ''}`}
                style={isMe ? { background: 'rgba(57,255,20,0.04)' } : {}}
              >
                <td>
                  <span className="premier-pos">{row.posicion}</span>
                </td>
                <td>
                  <div className="premier-player">
                    {row.jugador_foto ? (
                      <img
                        src={row.jugador_foto}
                        alt={row.jugador_nombre}
                        className="premier-avatar"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const sib = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                          if (sib) sib.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="premier-avatar-placeholder"
                      style={{ display: row.jugador_foto ? 'none' : 'flex' }}
                    >
                      {getInitials(row.jugador_nombre)}
                    </div>
                    <span className="premier-player-name" title={row.jugador_nombre}>
                      {row.jugador_nombre}
                      {isMe && (
                        <span style={{ fontSize: '0.6rem', color: 'var(--color-neon)', marginLeft: '0.3rem' }}>(Tú)</span>
                      )}
                    </span>
                  </div>
                </td>
                <td>{row.pj}</td>
                <td>{row.pg}</td>
                <td>{row.pe}</td>
                <td>{row.pp}</td>
                <td>{row.gf}</td>
                <td>{row.gc}</td>
                <td className={row.dg > 0 ? 'premier-dg-pos' : row.dg < 0 ? 'premier-dg-neg' : ''}>
                  {row.dg > 0 ? `+${row.dg}` : row.dg}
                </td>
                <td className="premier-pts">{row.pts}</td>
                <td>
                  <div className="premier-forma">
                    {forma5.length > 0
                      ? forma5.map((r, i) => (
                          <span key={i} className={`forma-badge ${r}`} title={r === 'W' ? 'Victoria' : r === 'D' ? 'Empate' : 'Derrota'}>
                            {r === 'W' ? 'V' : r === 'D' ? 'E' : 'D'}
                          </span>
                        ))
                      : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem' }}>—</span>
                    }
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Zone legend */}
      <div className="zone-legend">
        {division === 'primera' ? (
          <>
            <span className="zone-legend-item">
              <span className="zone-legend-dot" style={{ background: 'var(--color-danger)' }} />
              Descenso (2 últimos)
            </span>
          </>
        ) : (
          <>
            <span className="zone-legend-item">
              <span className="zone-legend-dot" style={{ background: 'var(--color-neon)' }} />
              Ascenso a Primera (2 primeros)
            </span>
          </>
        )}
      </div>
    </div>
  );
}
