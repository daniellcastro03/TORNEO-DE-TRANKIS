import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGrupos } from '../../hooks/useGrupos';
import { supabase } from '../../lib/supabase';
import {
  calcularDistribucion,
  obtenerClasificados,
  generarCrucesMundial,
  generarFaseEliminatoria,
  avanzarFase,
} from '../../hooks/useBracket';
import type { Torneo, Partido, FasePartido, CriteriosClasificacion } from '../../types/database';
import { Zap, ChevronRight, Trophy, FileText } from 'lucide-react';
import './Bracket.css';

const FASE_LABELS: Record<string, string> = {
  octavos: 'Octavos de Final',
  cuartos: 'Cuartos de Final',
  semifinal: 'Semifinal',
  tercer_puesto: '3er Puesto',
  final: 'Final',
};

const FASE_ORDER: FasePartido[] = ['octavos', 'cuartos', 'semifinal', 'tercer_puesto', 'final'];
const BRACKET_PHASES: FasePartido[] = ['octavos', 'cuartos', 'semifinal', 'final'];

interface PlayerInfo {
  nombre: string;        // Nombre del equipo
  jugadorNombre: string; // Nombre real del jugador
  escudo: string | null;
  foto_url: string | null;
}

interface BracketSectionProps {
  torneo: Torneo;
  inscripcionesCount: number;
}

// ── Inner components ────────────────────────────────────────────

function WcTeamRow({
  info,
  score,
  isWinner,
  isLoser,
  noBorder,
}: {
  info: PlayerInfo;
  score: number | null;
  isWinner: boolean;
  isLoser: boolean;
  noBorder?: boolean;
}) {
  return (
    <div
      className={`wc-team-row ${isWinner ? 'winner' : isLoser ? 'loser' : ''}`}
      style={noBorder ? { borderBottom: 'none' } : {}}
    >
      <div className="wc-team-content">
        <span className="wc-player-name" title={info.jugadorNombre}>
          {info.jugadorNombre}
        </span>
        <div className="wc-team-logo-wrap">
          {info.escudo ? (
            <img
              src={info.escudo}
              alt={info.nombre}
              className="wc-team-logo"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = 'none';
                const sib = el.nextElementSibling as HTMLElement | null;
                if (sib) sib.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className="wc-team-logo-placeholder"
            style={{ display: info.escudo ? 'none' : 'flex' }}
          >
            {info.nombre.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
      <span className={`wc-score ${isWinner ? 'winner' : ''}`}>
        {score !== null ? score : '—'}
      </span>
    </div>
  );
}

function WcMatchCard({
  match: m,
  getPlayerInfo,
  isFinal,
}: {
  match: Partido;
  getPlayerInfo: (id: string) => PlayerInfo;
  isFinal?: boolean;
}) {
  const localInfo = getPlayerInfo(m.jugador_local_id);
  const visitInfo = getPlayerInfo(m.jugador_visitante_id);
  const finished = m.estado === 'finalizado' && m.goles_local !== null && m.goles_visitante !== null;
  const localWins = finished && m.goles_local! > m.goles_visitante!;
  const visitWins = finished && m.goles_visitante! > m.goles_local!;

  return (
    <div className={`wc-match-card ${isFinal ? 'wc-final-card' : ''}`}>
      <WcTeamRow
        info={localInfo}
        score={finished ? m.goles_local! : null}
        isWinner={localWins}
        isLoser={finished && !localWins}
      />
      <div className="wc-match-divider" />
      <WcTeamRow
        info={visitInfo}
        score={finished ? m.goles_visitante! : null}
        isWinner={visitWins}
        isLoser={finished && !visitWins}
        noBorder
      />
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────

export default function BracketSection({ torneo, inscripcionesCount }: BracketSectionProps) {
  const { isAdmin } = useAuth();
  const { grupos, partidos, loading, refetch } = useGrupos(torneo.id);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [playerMap, setPlayerMap] = useState<Record<string, PlayerInfo>>({});

  useEffect(() => {
    async function loadPlayerMap() {
      const { data } = await supabase
        .from('torneo_inscripciones')
        .select(`
          jugador_id,
          jugadores:jugador_id (nombre, foto_url),
          catalogos_equipos:catalogo_equipo_id (nombre, escudo_url)
        `)
        .eq('torneo_id', torneo.id);

      if (data) {
        const map: Record<string, PlayerInfo> = {};
        for (const insc of data as any[]) {
          map[insc.jugador_id] = {
            nombre: insc.catalogos_equipos?.nombre || insc.jugadores?.nombre || '?',
            jugadorNombre: insc.jugadores?.nombre || '?',
            escudo: insc.catalogos_equipos?.escudo_url || null,
            foto_url: insc.jugadores?.foto_url || null,
          };
        }
        setPlayerMap(map);
      }
    }
    if (torneo.id) loadPlayerMap();
  }, [torneo.id, partidos]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getPlayerInfo = (jugadorId: string): PlayerInfo => {
    if (playerMap[jugadorId]) return playerMap[jugadorId];
    for (const g of grupos) {
      const j = g.jugadores.find((jg) => jg.jugador_id === jugadorId);
      if (j) return {
        nombre: j.equipo_nombre || j.jugador_nombre || '?',
        jugadorNombre: j.jugador_nombre || '?',
        escudo: j.equipo_escudo || null,
        foto_url: j.jugador_foto || null,
      };
    }
    return { nombre: 'Jugador', jugadorNombre: 'Jugador', escudo: null, foto_url: null };
  };

  const criterios = torneo.criterios_json as CriteriosClasificacion;
  const config = calcularDistribucion(inscripcionesCount);

  const grupoPartidos = partidos.filter((p) => p.fase === 'grupos');
  const gruposCompletos =
    grupoPartidos.length > 0 && grupoPartidos.every((p) => p.estado === 'finalizado');

  const matchesByPhase: Record<string, Partido[]> = {};
  for (const f of FASE_ORDER) {
    matchesByPhase[f] = partidos.filter((p) => p.fase === f);
  }
  const hasKnockout = FASE_ORDER.some((f) => matchesByPhase[f].length > 0);

  const finalMatch = matchesByPhase['final']?.[0];
  const championId =
    finalMatch?.estado === 'finalizado' &&
    finalMatch.goles_local !== null &&
    finalMatch.goles_visitante !== null
      ? finalMatch.goles_local > finalMatch.goles_visitante
        ? finalMatch.jugador_local_id
        : finalMatch.jugador_visitante_id
      : null;

  const handleGenerarEliminatoria = async () => {
    if (!confirm('¿Generar la fase eliminatoria con cruces estilo Mundial (A1 vs B2, etc.)?')) return;
    setActionLoading(true);
    const clasificados = obtenerClasificados(
      grupos, partidos, config, criterios.puntos_victoria, criterios.puntos_empate
    );
    const cruces = generarCrucesMundial(
      clasificados.primeros, clasificados.segundos, clasificados.mejoresTerceros, config
    );
    if (cruces.length === 0) {
      showToast('No hay suficientes clasificados para generar la eliminatoria', 'error');
      setActionLoading(false);
      return;
    }
    const { error } = await generarFaseEliminatoria(torneo.id, cruces, config.faseInicial);
    setActionLoading(false);
    if (error) showToast(error, 'error');
    else { showToast(`¡${FASE_LABELS[config.faseInicial]} generada!`, 'success'); refetch(); }
  };

  const handleAvanzar = async (fase: FasePartido) => {
    const pendientes = matchesByPhase[fase].filter((p) => p.estado === 'pendiente');
    if (pendientes.length > 0) {
      showToast(`Aún hay ${pendientes.length} partido(s) pendientes`, 'error');
      return;
    }
    setActionLoading(true);
    const { error } = await avanzarFase(torneo.id, partidos, fase);
    setActionLoading(false);
    if (error) showToast(error, 'error');
    else { showToast('¡Fase avanzada! Bracket actualizado.', 'success'); refetch(); }
  };

  // ── PDF Export (solo el bracket) ────────────────────────────────
  const handleExportBracketPDF = () => {
    const activeFases = BRACKET_PHASES.filter((f) => matchesByPhase[f]?.length > 0);
    const tercerPuesto = matchesByPhase['tercer_puesto']?.[0];

    const teamRowHTML = (
      info: PlayerInfo,
      goles: number | null,
      finished: boolean,
      wins: boolean,
      loses: boolean,
    ) => {
      const logoHtml = info.escudo
        ? `<img src="${info.escudo}" alt="" class="pl" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="pp" style="display:none">${info.nombre.charAt(0)}</div>`
        : `<div class="pp">${info.nombre.charAt(0)}</div>`;
      return `<div class="tr ${wins ? 'win' : loses ? 'los' : ''}">
        <div class="tc">
          <span class="pn">${info.jugadorNombre}</span>
          <div class="lw">${logoHtml}</div>
        </div>
        <span class="sc">${finished ? goles : '—'}</span>
      </div>`;
    };

    let roundsHTML = '';
    for (const fase of activeFases) {
      const matches = matchesByPhase[fase];
      let matchesHTML = '';
      for (const m of matches) {
        const li = getPlayerInfo(m.jugador_local_id);
        const vi = getPlayerInfo(m.jugador_visitante_id);
        const fin = m.estado === 'finalizado';
        const lw = fin && (m.goles_local ?? 0) > (m.goles_visitante ?? 0);
        const vw = fin && (m.goles_visitante ?? 0) > (m.goles_local ?? 0);
        matchesHTML += `<div class="ms">
          <div class="mc ${fase === 'final' ? 'mf' : ''}">
            ${teamRowHTML(li, m.goles_local, fin, lw, fin && !lw)}
            <div class="md"></div>
            ${teamRowHTML(vi, m.goles_visitante, fin, vw, fin && !vw)}
          </div>
        </div>`;
      }
      roundsHTML += `<div class="rc">
        <div class="rh"><span class="rt">${FASE_LABELS[fase]}</span></div>
        <div class="rm">${matchesHTML}</div>
      </div>`;
    }

    let tercerHTML = '';
    if (tercerPuesto) {
      const li = getPlayerInfo(tercerPuesto.jugador_local_id);
      const vi = getPlayerInfo(tercerPuesto.jugador_visitante_id);
      const fin = tercerPuesto.estado === 'finalizado';
      const lw = fin && (tercerPuesto.goles_local ?? 0) > (tercerPuesto.goles_visitante ?? 0);
      const vw = fin && (tercerPuesto.goles_visitante ?? 0) > (tercerPuesto.goles_local ?? 0);
      tercerHTML = `<div class="tp">
        <div class="tpt">🥉 3er y 4to Puesto</div>
        <div class="mc">
          ${teamRowHTML(li, tercerPuesto.goles_local, fin, lw, fin && !lw)}
          <div class="md"></div>
          ${teamRowHTML(vi, tercerPuesto.goles_visitante, fin, vw, fin && !vw)}
        </div>
      </div>`;
    }

    let champHTML = '';
    if (championId) {
      const ch = getPlayerInfo(championId);
      champHTML = `<div class="ch">
        <div class="ct">🏆</div>
        ${ch.escudo ? `<img src="${ch.escudo}" alt="" class="cl">` : `<div class="cp">${ch.nombre.charAt(0)}</div>`}
        <div class="cn">${ch.jugadorNombre}</div>
        <div class="ce">${ch.nombre}</div>
        <div class="cl2">CAMPEÓN DEL TORNEO</div>
      </div>`;
    }

    // Number of matches in the first (largest) round — drives layout height
    const firstRoundCount = activeFases.length > 0 ? matchesByPhase[activeFases[0]].length : 1;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Bracket — ${torneo.nombre}</title>
<style>
/* ── Page setup: landscape, single page ── */
@page {
  size: A4 landscape;
  margin: 8mm;
}
* { margin: 0; padding: 0; box-sizing: border-box; }

/* Full-page layout so bracket fills the sheet */
html, body {
  width: 100%;
  height: 100%;
  font-family: Arial, sans-serif;
  background: #3a000d;
  color: #fff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* Outer wrapper: column with header + bracket */
.page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 6mm 6mm 4mm;
}

/* Header */
.hdr {
  text-align: center;
  margin-bottom: 5mm;
  padding-bottom: 3mm;
  border-bottom: 2px solid rgba(255,215,0,0.35);
  flex-shrink: 0;
}
.ht {
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #ffd700;
}
.hs {
  font-size: 8px;
  color: rgba(255,255,255,0.45);
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-top: 2px;
}

/* Bracket: horizontal row of round-columns, NO wrapping */
.bw {
  flex: 1;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 4px;
  align-items: stretch;
  overflow: hidden;
}

/* One column per round */
.rc {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* Round title pill */
.rh { text-align: center; margin-bottom: 4px; flex-shrink: 0; }
.rt {
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #ffd700;
  border: 1px solid rgba(255,215,0,0.3);
  border-radius: 20px;
  padding: 2px 8px;
  background: rgba(255,215,0,0.07);
  display: inline-block;
}

/* Match slots distributed evenly */
.rm {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 2px;
}

.ms { display: flex; align-items: center; }

/* Match card */
.mc {
  width: 100%;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 7px;
  overflow: hidden;
}
.mf {
  border-color: rgba(255,215,0,0.55) !important;
  box-shadow: 0 0 8px rgba(255,215,0,0.2);
}

/* Team row */
.tr {
  display: flex;
  align-items: center;
  padding: 4px 6px;
  gap: 5px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.tr:last-child { border-bottom: none; }
.tr.win { background: rgba(255,215,0,0.1); }
.tr.los { opacity: 0.4; }

.tc { flex: 1; display: flex; align-items: center; gap: 5px; min-width: 0; }
.pn {
  font-size: 8px;
  font-weight: 600;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: rgba(255,255,255,0.9);
}
.tr.win .pn { color: #ffd700; font-weight: 700; }

/* Team logo */
.lw { flex-shrink: 0; }
.pl { width: 26px; height: 26px; object-fit: contain; border-radius: 3px; display: block; }
.pp {
  width: 26px; height: 26px;
  border-radius: 5px;
  background: rgba(255,215,0,0.15);
  border: 1px solid rgba(255,215,0,0.35);
  color: #ffd700;
  font-weight: 900;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Score */
.sc {
  font-size: 13px;
  font-weight: 900;
  min-width: 18px;
  text-align: center;
  color: rgba(255,255,255,0.45);
  margin-left: 2px;
  flex-shrink: 0;
}
.tr.win .sc { color: #ffd700; }
.md { height: 1px; background: rgba(255,255,255,0.08); }

/* 3rd place & champion — small footer row */
.footer-row {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
  margin-top: 4mm;
  padding-top: 3mm;
  border-top: 1px dashed rgba(255,255,255,0.15);
  flex-shrink: 0;
}

.tp { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.tpt {
  font-size: 7px; font-weight: 700; color: #cd7f32;
  text-transform: uppercase; letter-spacing: 1.5px;
  margin-bottom: 3px;
}
.tp .mc { width: 160px; }

.ch {
  text-align: center;
  padding: 8px 12px;
  background: rgba(255,215,0,0.08);
  border: 2px solid rgba(255,215,0,0.4);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.ct { font-size: 28px; }
.ch img, .cl { width: 36px; height: 36px; object-fit: contain; }
.cp {
  width: 36px; height: 36px; border-radius: 8px;
  background: rgba(255,215,0,0.2); color: #ffd700;
  font-size: 16px; font-weight: 900;
  display: flex; align-items: center; justify-content: center;
}
.cn { font-size: 11px; font-weight: 900; color: #ffd700; }
.ce { font-size: 8px; color: rgba(255,215,0,0.6); }
.cl2 { font-size: 7px; letter-spacing: 2px; color: rgba(255,215,0,0.45); text-transform: uppercase; }
</style>
</head>
<body>
<div class="page">
  <div class="hdr">
    <div class="ht">⚽ ${torneo.nombre}</div>
    <div class="hs">Fase Eliminatoria — Llaves del Torneo</div>
  </div>

  <div class="bw">${roundsHTML}</div>

  ${(tercerHTML || champHTML) ? `
  <div class="footer-row">
    ${tercerHTML}
    ${champHTML}
  </div>` : ''}
</div>
<script>setTimeout(function(){window.print();},1200);</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=1400,height=900');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <div className="spinner" />
    </div>
  );

  const grupoFinalizados = grupoPartidos.filter((p) => p.estado === 'finalizado').length;

  if (!hasKnockout && !gruposCompletos) {
    return (
      <div className="empty-state card" style={{ padding: '2rem' }}>
        <div className="empty-state-icon">⏳</div>
        <h3>Fase de grupos en curso</h3>
        <p>La eliminatoria se generará cuando todos los partidos de grupos estén finalizados</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
          {grupoFinalizados} / {grupoPartidos.length} partidos jugados
        </p>
      </div>
    );
  }

  const bracketPhases = BRACKET_PHASES.filter((f) => matchesByPhase[f]?.length > 0);
  const tercerPuestoMatch = matchesByPhase['tercer_puesto']?.[0] || null;

  // Calculate bracket height for proper alignment
  const firstRoundCount = bracketPhases.length > 0 ? matchesByPhase[bracketPhases[0]].length : 1;
  const MATCH_UNIT = 107; // height per match slot (card ~95px + 12px padding)
  const bracketHeight = Math.max(firstRoundCount * MATCH_UNIT, 280);

  return (
    <div className="fade-in">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      {/* Champion celebration */}
      {championId && (
        <div className="champion-card fade-in">
          <div className="champion-trophy">🏆</div>
          <div className="champion-details">
            {getPlayerInfo(championId).foto_url && (
              <img src={getPlayerInfo(championId).foto_url!} alt="" className="champion-avatar" />
            )}
            {getPlayerInfo(championId).escudo && (
              <img src={getPlayerInfo(championId).escudo!} alt="" className="champion-escudo" />
            )}
            <div className="champion-name">{getPlayerInfo(championId).jugadorNombre}</div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
              🎉 ¡CAMPEÓN DEL TORNEO!
            </p>
          </div>
        </div>
      )}

      {/* Admin: generate knockout */}
      {isAdmin && gruposCompletos && !hasKnockout && (
        <div className="bracket-advance-panel fade-in">
          <div>
            <h3><Zap size={18} /> Fase de grupos completada</h3>
            <p className="bracket-advance-info">
              Clasifican: top {config.clasificadosPorGrupo} por grupo
              {config.mejoresTerceros > 0 && ` + ${config.mejoresTerceros} mejores terceros`}
              {' → '}{FASE_LABELS[config.faseInicial]}
            </p>
          </div>
          <button
            className={`btn btn-primary ${actionLoading ? 'btn-loading' : ''}`}
            onClick={handleGenerarEliminatoria}
            disabled={actionLoading}
          >
            <Trophy size={16} /> Generar Eliminatoria
          </button>
        </div>
      )}

      {/* Bracket */}
      {hasKnockout && (
        <>
          {/* Toolbar */}
          <div className="bracket-toolbar no-print">
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              🏆 {torneo.nombre} — Llaves
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleExportBracketPDF}
              title="Descargar PDF del bracket"
            >
              <FileText size={15} /> Descargar PDF
            </button>
          </div>

          {/* World Cup style bracket */}
          <div className="wc-bracket-scroll" id="bracket-exportable">
            <div className="wc-rounds-row" style={{ minHeight: `${bracketHeight}px` }}>
              {bracketPhases.map((fase) => {
                const matches = matchesByPhase[fase];
                const allFinished = matches.every((m) => m.estado === 'finalizado');
                const faseIdx = FASE_ORDER.indexOf(fase);
                const nextFase = fase === 'semifinal' ? 'final' : FASE_ORDER[faseIdx + 1];
                const nextExists = nextFase && matchesByPhase[nextFase]?.length > 0;

                return (
                  <div key={fase} className="wc-round-col">
                    <div className="wc-round-header">
                      <span className="wc-round-title">{FASE_LABELS[fase]}</span>
                    </div>
                    <div className="wc-round-matches">
                      {matches.map((m) => (
                        <div key={m.id} className="wc-match-slot">
                          <WcMatchCard
                            match={m}
                            getPlayerInfo={getPlayerInfo}
                            isFinal={fase === 'final'}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Advance phase button */}
                    {isAdmin && allFinished && !nextExists && fase !== 'final' && fase !== 'tercer_puesto' && (
                      <button
                        className={`btn btn-primary btn-sm no-print ${actionLoading ? 'btn-loading' : ''}`}
                        onClick={() => handleAvanzar(fase)}
                        disabled={actionLoading}
                        style={{ marginTop: '0.75rem', width: '100%' }}
                      >
                        <ChevronRight size={14} /> Avanzar a {FASE_LABELS[nextFase] || 'sig. fase'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tercer puesto */}
            {tercerPuestoMatch && (() => {
              const li = getPlayerInfo(tercerPuestoMatch.jugador_local_id);
              const vi = getPlayerInfo(tercerPuestoMatch.jugador_visitante_id);
              const fin = tercerPuestoMatch.estado === 'finalizado';
              const lw = fin && (tercerPuestoMatch.goles_local ?? 0) > (tercerPuestoMatch.goles_visitante ?? 0);
              const vw = fin && (tercerPuestoMatch.goles_visitante ?? 0) > (tercerPuestoMatch.goles_local ?? 0);
              return (
                <div className="wc-tercer-puesto">
                  <div className="wc-tercer-label">🥉 3er y 4to Puesto</div>
                  <div className="wc-match-card">
                    <WcTeamRow
                      info={li}
                      score={fin ? tercerPuestoMatch.goles_local! : null}
                      isWinner={lw}
                      isLoser={fin && !lw}
                    />
                    <div className="wc-match-divider" />
                    <WcTeamRow
                      info={vi}
                      score={fin ? tercerPuestoMatch.goles_visitante! : null}
                      isWinner={vw}
                      isLoser={fin && !vw}
                      noBorder
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}
