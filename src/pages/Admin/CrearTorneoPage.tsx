import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { crearTorneo } from '../../hooks/useTorneos';
import type { TipoTorneo } from '../../types/database';
import { ArrowLeft, Trophy, Sparkles, Repeat, Swords, CheckSquare } from 'lucide-react';
import '../Torneos/Torneos.css';

const TIPOS: { value: TipoTorneo; emoji: string; name: string; desc: string }[] = [
  { value: 'champions', emoji: '🏆', name: 'Champions', desc: 'Equipos UCL' },
  { value: 'mundial', emoji: '🌍', name: 'Mundial', desc: 'Selecciones FIFA' },
  { value: 'liga', emoji: '⚽', name: 'Liga', desc: 'Liga específica' },
  { value: 'libre', emoji: '🎮', name: 'Libre', desc: 'Catálogo general' },
];

const LIGAS = [
  { value: 'la_liga', label: 'La Liga (España)' },
  { value: 'premier_league', label: 'Premier League (Inglaterra)' },
  { value: 'serie_a', label: 'Serie A (Italia)' },
  { value: 'bundesliga', label: 'Bundesliga (Alemania)' },
  { value: 'ligue_1', label: 'Ligue 1 (Francia)' },
];

function ToggleRow({
  icon: Icon,
  label,
  sublabel,
  value,
  onChange,
}: {
  icon: any;
  label: string;
  sublabel: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="toggle-row" style={{ cursor: 'pointer' }} onClick={() => onChange(!value)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <Icon size={18} color={value ? 'var(--color-neon)' : 'var(--color-text-muted)'} />
        <div className="toggle-label">
          <span style={{ color: value ? 'var(--color-text)' : 'var(--color-text-secondary)' }}>
            {label}
          </span>
          <span>{sublabel}</span>
        </div>
      </div>
      <button
        type="button"
        className={`toggle-switch ${value ? 'active' : ''}`}
        onClick={(e) => { e.stopPropagation(); onChange(!value); }}
        aria-label={label}
      />
    </div>
  );
}

export default function CrearTorneoPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoTorneo>('champions');
  const [liga, setLiga] = useState('la_liga');
  const [maxJugadores, setMaxJugadores] = useState(16);
  const [permiteCambio, setPermiteCambio] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [ptsVictoria, setPtsVictoria] = useState(3);
  const [ptsEmpate, setPtsEmpate] = useState(1);
  const [clasificadosPorGrupo, setClasificadosPorGrupo] = useState(2);
  const [hayTerceroPuesto, setHayTerceroPuesto] = useState(false);
  const [idaVuelta, setIdaVuelta] = useState(false);
  const [partidoUnicoElim, setPartidoUnicoElim] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin) {
    navigate('/torneos');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !nombre.trim()) return;

    setError(null);
    setSaving(true);

    const { data, error: createErr } = await crearTorneo(
      {
        nombre: nombre.trim(),
        tipo,
        max_jugadores: maxJugadores,
        permite_cambio_equipo: permiteCambio,
        fecha_inicio: fechaInicio || null,
        criterios_json: {
          puntos_victoria: ptsVictoria,
          puntos_empate: ptsEmpate,
          puntos_derrota: 0,
          clasificados_por_grupo: clasificadosPorGrupo,
          hay_tercero_cuarto: hayTerceroPuesto,
          ida_vuelta: idaVuelta,
          partido_unico_eliminatorias: partidoUnicoElim,
        },
        liga: tipo === 'liga' ? liga : undefined,
      },
      user.id
    );

    setSaving(false);

    if (createErr) {
      setError(createErr);
    } else if (data) {
      navigate(`/torneos/${data.id}`);
    }
  };

  return (
    <div className="crear-torneo-page fade-in">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')} style={{ marginBottom: '1rem' }}>
        <ArrowLeft size={16} /> Panel Admin
      </button>

      <div className="page-header">
        <h1>
          <Sparkles size={24} style={{ verticalAlign: 'middle', marginRight: '0.5rem', color: 'var(--color-neon)' }} />
          Crear Torneo
        </h1>
        <p>Configura un nuevo torneo de eFootball</p>
      </div>

      <form className="crear-torneo-form" onSubmit={handleSubmit}>
        {error && (
          <div className="auth-error fade-in">{error}</div>
        )}

        {/* Nombre */}
        <div className="form-group">
          <label htmlFor="torneo-nombre">Nombre del torneo</label>
          <input
            id="torneo-nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder='Ej: "Champions Trankis 2026"'
            required
            autoFocus
            maxLength={100}
          />
        </div>

        {/* Tipo */}
        <div className="form-group">
          <label>Tipo de torneo</label>
          <div className="tipo-selector">
            {TIPOS.map((t) => (
              <div
                key={t.value}
                className={`tipo-option ${tipo === t.value ? 'selected' : ''}`}
                onClick={() => setTipo(t.value)}
                role="button"
                tabIndex={0}
              >
                <span className="tipo-emoji">{t.emoji}</span>
                <span className="tipo-name">{t.name}</span>
                <span className="tipo-desc">{t.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Liga selector (only for liga type) */}
        {tipo === 'liga' && (
          <div className="form-group">
            <label htmlFor="torneo-liga">Liga</label>
            <select id="torneo-liga" value={liga} onChange={(e) => setLiga(e.target.value)}>
              {LIGAS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Max jugadores + Fecha */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="torneo-max">Máx. jugadores</label>
            <input
              id="torneo-max"
              type="number"
              value={maxJugadores}
              onChange={(e) => setMaxJugadores(parseInt(e.target.value) || 4)}
              min={4}
              max={64}
            />
            <span className="form-hint">Mín. 4, máx. 64</span>
          </div>
          <div className="form-group">
            <label htmlFor="torneo-fecha">Fecha de inicio (opcional)</label>
            <input
              id="torneo-fecha"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
        </div>

        {/* ========================== */}
        {/* FASE DE GRUPOS — Opciones  */}
        {/* ========================== */}
        <div className="criterios-section">
          <h4>⚽ Fase de Grupos</h4>

          <ToggleRow
            icon={Repeat}
            label="Ida y vuelta"
            sublabel="Cada pareja se enfrenta 2 veces: en casa y fuera"
            value={idaVuelta}
            onChange={setIdaVuelta}
          />

          <div className="form-row" style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label htmlFor="pts-victoria">Pts por victoria</label>
              <input
                id="pts-victoria"
                type="number"
                value={ptsVictoria}
                onChange={(e) => setPtsVictoria(parseInt(e.target.value) || 3)}
                min={1}
                max={10}
              />
            </div>
            <div className="form-group">
              <label htmlFor="pts-empate">Pts por empate</label>
              <input
                id="pts-empate"
                type="number"
                value={ptsEmpate}
                onChange={(e) => setPtsEmpate(parseInt(e.target.value) || 1)}
                min={0}
                max={5}
              />
            </div>
          </div>

          <div className="form-row" style={{ marginTop: '0.75rem' }}>
            <div className="form-group">
              <label htmlFor="clasificados">Clasificados por grupo</label>
              <input
                id="clasificados"
                type="number"
                value={clasificadosPorGrupo}
                onChange={(e) => setClasificadosPorGrupo(parseInt(e.target.value) || 2)}
                min={1}
                max={4}
              />
            </div>
            <div className="form-group">
              <label>Desempate</label>
              <input type="text" value="Puntos → Dif. goles → GF → Directo" disabled style={{ opacity: 0.5 }} />
            </div>
          </div>
        </div>

        {/* ========================== */}
        {/* FASE ELIMINATORIA          */}
        {/* ========================== */}
        <div className="criterios-section" style={{ marginTop: '1rem' }}>
          <h4>🏆 Fase Eliminatoria</h4>

          <ToggleRow
            icon={Swords}
            label="Partido único"
            sublabel="Eliminatorias se definen en un solo partido (lo más común)"
            value={partidoUnicoElim}
            onChange={setPartidoUnicoElim}
          />

          {!partidoUnicoElim && (
            <div
              className="fade-in"
              style={{
                marginTop: '0.5rem',
                padding: '0.6rem 0.8rem',
                background: 'rgba(57,255,20,0.05)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                color: 'var(--color-text-muted)',
                border: '1px solid var(--color-border-neon)',
              }}
            >
              ⚠️ Con eliminatorias de ida y vuelta, el admin deberá gestionar los 2 partidos manualmente desde la sección de Resultados.
            </div>
          )}

          <ToggleRow
            icon={CheckSquare}
            label="Partido por 3er y 4to lugar"
            sublabel="Se disputa un partido extra entre los perdedores de semis"
            value={hayTerceroPuesto}
            onChange={setHayTerceroPuesto}
          />
        </div>

        {/* ========================== */}
        {/* OTRAS OPCIONES             */}
        {/* ========================== */}
        <div className="criterios-section" style={{ marginTop: '1rem' }}>
          <h4>🔧 Opciones generales</h4>
          <ToggleRow
            icon={Repeat}
            label="Permitir cambio de equipo"
            sublabel="Los jugadores pueden cambiar su equipo después de inscribirse"
            value={permiteCambio}
            onChange={setPermiteCambio}
          />
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/admin')} style={{ flex: 1 }}>
            Cancelar
          </button>
          <button
            type="submit"
            className={`btn btn-primary btn-lg ${saving ? 'btn-loading' : ''}`}
            disabled={saving || !nombre.trim()}
            style={{ flex: 2 }}
          >
            <Trophy size={18} /> Crear Torneo
          </button>
        </div>
      </form>
    </div>
  );
}
