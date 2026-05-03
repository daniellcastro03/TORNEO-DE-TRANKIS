import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTorneos } from '../../hooks/useTorneos';
import { useGrupos } from '../../hooks/useGrupos';
import { supabase } from '../../lib/supabase';
import { registrarResultado, resetearResultado } from '../../hooks/useMisPartidos';
import { crearNotificacion } from '../../hooks/useNotificaciones';
import type { Partido } from '../../types/database';
import { ArrowLeft, Save, RotateCcw, Check, Filter } from 'lucide-react';
import '../MisPartidos/MisPartidos.css';
import '../Torneos/Grupos.css';

export default function ResultadosPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { torneos } = useTorneos();

  const torneosEnCurso = torneos.filter((t) => t.estado === 'en_curso');
  const [selectedTorneo, setSelectedTorneo] = useState<string>('');
  const [showOnlyPending, setShowOnlyPending] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Auto-select first torneo
  useEffect(() => {
    if (torneosEnCurso.length > 0 && !selectedTorneo) {
      setSelectedTorneo(torneosEnCurso[0].id);
    }
  }, [torneosEnCurso, selectedTorneo]);

  if (!isAdmin) {
    navigate('/');
    return null;
  }

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="page-container fade-in">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')} style={{ marginBottom: '1rem' }}>
        <ArrowLeft size={16} /> Admin
      </button>

      <div className="page-header">
        <h1>⚽ Registrar Resultados</h1>
        <p>Ingresa los scores de los partidos jugados</p>
      </div>

      {torneosEnCurso.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">🏆</div>
          <h3>Sin torneos en curso</h3>
          <p>Inicia un torneo para poder registrar resultados</p>
        </div>
      ) : (
        <>
          {/* Tournament selector */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={selectedTorneo}
              onChange={(e) => setSelectedTorneo(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            >
              {torneosEnCurso.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tipo === 'champions' ? '🏆' : t.tipo === 'mundial' ? '🌍' : '⚽'} {t.nombre}
                </option>
              ))}
            </select>

            <button
              className={`catalogo-tab ${showOnlyPending ? 'active' : ''}`}
              onClick={() => setShowOnlyPending(!showOnlyPending)}
            >
              <Filter size={14} />
              {showOnlyPending ? 'Solo pendientes' : 'Todos'}
            </button>
          </div>

          {selectedTorneo && (
            <PartidosEditor
              torneo={torneosEnCurso.find((t) => t.id === selectedTorneo)!}
              showOnlyPending={showOnlyPending}
              showToast={showToast}
            />
          )}
        </>
      )}
    </div>
  );
}

// ========================
function PartidosEditor({
  torneo,
  showOnlyPending,
  showToast,
}: {
  torneo: any;
  showOnlyPending: boolean;
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const torneoId = torneo.id;
  const { grupos, partidos, loading, refetch } = useGrupos(torneoId);
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [golesLocal, setGolesLocal] = useState(0);
  const [golesVisitante, setGolesVisitante] = useState(0);
  const [saving, setSaving] = useState(false);
  const [openingDate, setOpeningDate] = useState<string | null>(null);
  
  const fechasHabilitadas = torneo.criterios_json?.fechas_habilitadas || ['1'];

  // Independent player map from inscriptions (resolves knockout players)
  const [playerMap, setPlayerMap] = useState<Record<string, { nombre: string; escudo: string | null }>>({});

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('torneo_inscripciones')
        .select(`
          jugador_id,
          jugadores:jugador_id (nombre),
          catalogos_equipos:catalogo_equipo_id (nombre, escudo_url)
        `)
        .eq('torneo_id', torneoId);
      if (data) {
        const map: Record<string, { nombre: string; escudo: string | null }> = {};
        for (const i of data as any[]) {
          map[i.jugador_id] = {
            nombre: i.catalogos_equipos?.nombre || i.jugadores?.nombre || 'Jugador',
            escudo: i.catalogos_equipos?.escudo_url || null,
          };
        }
        setPlayerMap(map);
      }
    }
    if (torneoId) load();
  }, [torneoId, partidos]);

  const filteredPartidos = showOnlyPending
    ? partidos.filter((p) => p.estado === 'pendiente')
    : partidos;

  // Group matches by grupo
  const matchesByGroup = grupos.map((g) => ({
    grupo: g,
    partidos: filteredPartidos.filter((p) => p.grupo_id === g.id),
  }));

  const startEdit = (p: Partido) => {
    setEditingMatch(p.id);
    setGolesLocal(p.goles_local ?? 0);
    setGolesVisitante(p.goles_visitante ?? 0);
  };

  const handleSave = async (p: Partido) => {
    setSaving(true);
    const { error } = await registrarResultado(p.id, golesLocal, golesVisitante);
    setSaving(false);

    if (error) {
      showToast(error, 'error');
    } else {
      showToast(`Resultado: ${golesLocal} - ${golesVisitante}`, 'success');

      // Notify both players
      try {
        const localInfo = getPlayerInfo(p.jugador_local_id);
        const visitInfo = getPlayerInfo(p.jugador_visitante_id);

        crearNotificacion(
          p.jugador_local_id,
          'resultado',
          '📊 Resultado registrado',
          `${localInfo} ${golesLocal} - ${golesVisitante} ${visitInfo}`
        );
        crearNotificacion(
          p.jugador_visitante_id,
          'resultado',
          '📊 Resultado registrado',
          `${localInfo} ${golesLocal} - ${golesVisitante} ${visitInfo}`
        );
      } catch {}

      setEditingMatch(null);
      refetch();
    }
  };

  const handleReset = async (p: Partido) => {
    if (!confirm('¿Resetear este resultado?')) return;
    const { error } = await resetearResultado(p.id);
    if (error) {
      showToast(error, 'error');
    } else {
      showToast('Resultado reseteado', 'success');
      refetch();
    }
  };

  const handleHabilitar = async (fecha: string) => {
    if (!confirm(`¿Estás seguro de abrir y habilitar todos los partidos de la Jornada ${fecha}?`)) return;
    setOpeningDate(fecha);
    const { habilitarFecha } = await import('../../hooks/useTorneos');
    const { error } = await habilitarFecha(torneoId, fecha);
    setOpeningDate(null);
    if (error) {
      showToast(error, 'error');
    } else {
      showToast(`¡Jornada ${fecha} habilitada!`, 'success');
      refetch();
    }
  };

  const getPlayerInfo = (jugadorId: string): string => {
    for (const g of grupos) {
      const j = g.jugadores.find((jg) => jg.jugador_id === jugadorId);
      if (j) return j.equipo_nombre || j.jugador_nombre || 'Jugador';
    }
    return playerMap[jugadorId]?.nombre || 'Jugador';
  };

  const getPlayerEscudo = (jugadorId: string): string | null => {
    for (const g of grupos) {
      const j = g.jugadores.find((jg) => jg.jugador_id === jugadorId);
      if (j) return j.equipo_escudo || null;
    }
    return playerMap[jugadorId]?.escudo || null;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (grupos.length === 0) {
    return (
      <div className="empty-state card" style={{ padding: '2rem' }}>
        <div className="empty-state-icon">🎲</div>
        <h3>Sin grupos</h3>
        <p>Sortea los grupos en el detalle del torneo</p>
      </div>
    );
  }

  const totalPending = partidos.filter((p) => p.estado === 'pendiente').length;
  const totalFinished = partidos.filter((p) => p.estado === 'finalizado').length;

  return (
    <div>
      {/* Progress */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
            <span style={{ color: 'var(--color-neon)' }}>{totalFinished} jugados</span>
            <span style={{ color: 'var(--color-text-muted)' }}>{totalPending} pendientes</span>
          </div>
          <div className="torneo-progress-bar" style={{ height: 6 }}>
            <div
              className="torneo-progress-fill"
              style={{ width: `${partidos.length > 0 ? (totalFinished / partidos.length) * 100 : 0}%` }}
            />
          </div>
        </div>
        {totalFinished === partidos.length && partidos.length > 0 && (
          <span className="badge badge-neon" style={{ fontSize: '0.7rem' }}>
            <Check size={12} /> ¡Completo!
          </span>
        )}
      </div>

      {/* Groups */}
      {matchesByGroup.map(({ grupo, partidos: gPartidos }) => {
        if (gPartidos.length === 0) return null;
        return (
          <div key={grupo.id} style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--color-neon)', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
              {grupo.nombre}
            </h3>
            {gPartidos.map((p) => renderMatchCard(p))}
          </div>
        );
      })}

      {/* Knockout phases */}
      {['octavos', 'cuartos', 'semifinal', 'tercer_puesto', 'final'].map((fase) => {
        const faseMatches = filteredPartidos.filter((p) => p.fase === fase && !p.grupo_id);
        if (faseMatches.length === 0) return null;
        const label = fase === 'octavos' ? '🏟️ Octavos de Final' : fase === 'cuartos' ? '🏟️ Cuartos de Final' : fase === 'semifinal' ? '🏟️ Semifinal' : fase === 'tercer_puesto' ? '🥉 3er Puesto' : '🏆 Final';
        return (
          <div key={fase} style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--color-neon)', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
              {label}
            </h3>
            {faseMatches.map((p) => renderMatchCard(p))}
          </div>
        );
      })}
    </div>
  );

  function renderMatchCard(p: Partido) {
    const localName = getPlayerInfo(p.jugador_local_id);
    const visitName = getPlayerInfo(p.jugador_visitante_id);
    const localEscudo = getPlayerEscudo(p.jugador_local_id);
    const visitEscudo = getPlayerEscudo(p.jugador_visitante_id);
    const isEditing = editingMatch === p.id;
    const isHabilitado = p.fase !== 'grupos' || !p.fecha || fechasHabilitadas.includes(p.fecha);

    return (
      <div key={p.id} className="match-card" style={{ marginBottom: '0.5rem', opacity: isHabilitado ? 1 : 0.6 }}>
        {p.fase === 'grupos' && p.fecha && (
          <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--color-neon)', marginBottom: '4px' }}>
            Jornada {p.fecha} {isHabilitado ? '' : '(Bloqueada)'}
          </div>
        )}
        <div className="match-card-body">
          <div className="match-team">
            {localEscudo ? (
              <img src={localEscudo} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
            ) : (
              <div className="equipo-escudo-placeholder" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                {localName[0]}
              </div>
            )}
            <span className="match-team-name" style={{ fontSize: '0.75rem' }}>{localName}</span>
          </div>

          <div className="match-score-center">
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="number" className="result-score-input" value={golesLocal} onChange={(e) => setGolesLocal(Math.max(0, parseInt(e.target.value) || 0))} min={0} max={99} />
                <span className="result-divider">-</span>
                <input type="number" className="result-score-input" value={golesVisitante} onChange={(e) => setGolesVisitante(Math.max(0, parseInt(e.target.value) || 0))} min={0} max={99} />
              </div>
            ) : p.estado === 'finalizado' ? (
              <div className="match-score">
                <span className="score-num">{p.goles_local}</span>
                <span className="score-divider">-</span>
                <span className="score-num">{p.goles_visitante}</span>
              </div>
            ) : (
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>vs</span>
            )}
          </div>

          <div className="match-team">
            {visitEscudo ? (
              <img src={visitEscudo} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
            ) : (
              <div className="equipo-escudo-placeholder" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                {visitName[0]}
              </div>
            )}
            <span className="match-team-name" style={{ fontSize: '0.75rem' }}>{visitName}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem' }}>
          {isEditing ? (
            <>
              <button className={`btn btn-primary btn-sm ${saving ? 'btn-loading' : ''}`} onClick={() => handleSave(p)} disabled={saving}>
                <Save size={14} /> Guardar
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingMatch(null)} disabled={saving}>
                Cancelar
              </button>
            </>
          ) : !isHabilitado && p.fecha ? (
            <button 
              className={`btn btn-primary btn-sm ${openingDate === p.fecha ? 'btn-loading' : ''}`} 
              onClick={() => handleHabilitar(p.fecha!)}
              disabled={openingDate === p.fecha}
            >
              Abrir Jornada {p.fecha}
            </button>
          ) : (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => startEdit(p)}>
                {p.estado === 'finalizado' ? 'Editar' : 'Ingresar resultado'}
              </button>
              {p.estado === 'finalizado' && (
                <button className="btn btn-ghost btn-sm" onClick={() => handleReset(p)} style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>
                  <RotateCcw size={12} /> Reset
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
}

