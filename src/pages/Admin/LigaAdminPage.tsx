import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  useLigas,
  crearLiga,
  agregarJugadorLiga,
  fetchAllJugadores,
} from '../../hooks/useLiga';
import type { Jugador, DivisionLiga } from '../../types/database';
import { ArrowLeft, Plus, Users, UserPlus, Check, Repeat } from 'lucide-react';
import '../Liga/Liga.css';

const MIN_JUGADORES = 2; // min per division (real min is 12, relaxed here for testing)
const MAX_JUGADORES = 16;

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function LigaAdminPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { ligas, loading: ligasLoading, refetch: refetchLigas } = useLigas();

  // Step: 'list' | 'create' | 'assign'
  const [step, setStep] = useState<'list' | 'create' | 'assign'>('list');
  const [creatingLigaId, setCreatingLigaId] = useState<string | null>(null);

  // Form state
  const [nombre, setNombre] = useState('');
  const [idaVuelta, setIdaVuelta] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Player assignment state
  const [allJugadores, setAllJugadores] = useState<Jugador[]>([]);
  const [selections, setSelections] = useState<Record<string, DivisionLiga | null>>({});
  const [assigning, setAssigning] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (step === 'assign') {
      fetchAllJugadores().then(setAllJugadores);
    }
  }, [step]);

  if (!isAdmin) {
    navigate('/');
    return null;
  }

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !nombre.trim()) return;
    setSaving(true);
    const { data, error } = await crearLiga(nombre.trim(), idaVuelta, user.id);
    setSaving(false);
    if (error) {
      showToast(error, 'error');
    } else if (data) {
      showToast('¡Liga creada! Ahora asigna los jugadores.', 'success');
      setCreatingLigaId(data.id);
      setStep('assign');
      refetchLigas();
    }
  };

  const toggleSelection = (jugadorId: string, division: DivisionLiga) => {
    setSelections(prev => ({
      ...prev,
      [jugadorId]: prev[jugadorId] === division ? null : division,
    }));
  };

  const handleAssign = async () => {
    if (!creatingLigaId) return;

    const primera = Object.entries(selections).filter(([, d]) => d === 'primera').map(([id]) => id);
    const segunda = Object.entries(selections).filter(([, d]) => d === 'segunda').map(([id]) => id);

    if (primera.length < MIN_JUGADORES || segunda.length < MIN_JUGADORES) {
      showToast(`Necesitas mínimo ${MIN_JUGADORES} jugadores en cada división`, 'error');
      return;
    }
    if (primera.length > MAX_JUGADORES || segunda.length > MAX_JUGADORES) {
      showToast(`Máximo ${MAX_JUGADORES} jugadores por división`, 'error');
      return;
    }

    setAssigning(true);
    let errores = 0;
    for (const [jugadorId, division] of Object.entries(selections)) {
      if (!division) continue;
      const { error } = await agregarJugadorLiga(creatingLigaId, jugadorId, division);
      if (error) errores++;
    }
    setAssigning(false);

    if (errores > 0) {
      showToast(`Se completó con ${errores} errores`, 'error');
    } else {
      showToast('¡Jugadores asignados correctamente!', 'success');
      navigate(`/liga/${creatingLigaId}`);
    }
  };

  const primeraCount = Object.values(selections).filter(d => d === 'primera').length;
  const segundaCount = Object.values(selections).filter(d => d === 'segunda').length;

  // ── STEP: LIST ──
  if (step === 'list') {
    return (
      <div className="liga-page fade-in">
        {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')} style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Admin
        </button>
        <div className="page-header">
          <h1 style={{ color: 'var(--color-neon)' }}>🏟️ Gestión de Ligas</h1>
          <p>Crea y administra las temporadas de liga</p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => setStep('create')}
            id="btn-nueva-liga"
          >
            <Plus size={18} /> Nueva Liga
          </button>
        </div>

        {ligasLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner spinner-lg" />
          </div>
        ) : ligas.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-icon">🏟️</div>
            <h3>Sin ligas</h3>
            <p>Crea tu primera liga para comenzar</p>
          </div>
        ) : (
          <div className="liga-admin-cards">
            {ligas.map(liga => (
              <div
                key={liga.id}
                className="card card-glow liga-admin-card"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/liga/${liga.id}`)}
              >
                <h3>🏟️ {liga.nombre}</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                  {liga.estado === 'configuracion' ? '⚙️ En configuración'
                    : liga.estado === 'en_curso' ? '⚡ En curso'
                    : '🏁 Finalizada'}
                  {liga.ida_vuelta ? ' · Ida y vuelta' : ' · Solo ida'}
                </div>
                <div style={{ color: 'var(--color-neon)', fontSize: '0.75rem', marginTop: '0.75rem', fontWeight: 600 }}>
                  Gestionar →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── STEP: CREATE ──
  if (step === 'create') {
    return (
      <div className="liga-page fade-in">
        {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
        <button className="btn btn-ghost btn-sm" onClick={() => setStep('list')} style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Ligas
        </button>
        <div className="page-header">
          <h1 style={{ color: 'var(--color-neon)' }}>✨ Nueva Liga</h1>
          <p>Configura la nueva temporada de liga</p>
        </div>

        <form onSubmit={handleCrear} style={{ maxWidth: 480 }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="liga-nombre">Nombre de la Liga</label>
              <input
                id="liga-nombre"
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder='Ej: "Liga Trankis Temporada 1"'
                required
                autoFocus
                maxLength={80}
              />
            </div>

            {/* Ida y vuelta toggle */}
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                background: 'var(--color-bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: idaVuelta ? '1px solid var(--color-border-neon)' : '1px solid var(--color-border)',
                cursor: 'pointer',
                marginBottom: '1.25rem',
              }}
              onClick={() => setIdaVuelta(!idaVuelta)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Repeat size={18} color={idaVuelta ? 'var(--color-neon)' : 'var(--color-text-muted)'} />
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: idaVuelta ? 'var(--color-text)' : 'var(--color-text-secondary)' }}>
                    Ida y vuelta
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                    Cada pareja se enfrenta 2 veces (en casa y fuera)
                  </div>
                </div>
              </div>
              <button
                type="button"
                className={`toggle-switch ${idaVuelta ? 'active' : ''}`}
                onClick={e => { e.stopPropagation(); setIdaVuelta(!idaVuelta); }}
                aria-label="Ida y vuelta"
              />
            </div>

            {/* Info */}
            <div style={{
              padding: '0.75rem',
              background: 'rgba(57,255,20,0.04)',
              border: '1px solid var(--color-border-neon)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.78rem',
              color: 'var(--color-text-muted)',
              marginBottom: '1.25rem',
            }}>
              <div style={{ marginBottom: '0.3rem', color: 'var(--color-neon)', fontWeight: 600 }}>📋 Formato de la liga:</div>
              <div>• Primera División: 12–16 jugadores. Los 2 últimos descienden.</div>
              <div>• Segunda División: 12–16 jugadores. Los 2 primeros ascienden.</div>
              <div>• FA Cup: Sorteo random de todos los jugadores (eliminación directa).</div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setStep('list')} style={{ flex: 1 }}>
                Cancelar
              </button>
              <button
                type="submit"
                className={`btn btn-primary ${saving ? 'btn-loading' : ''}`}
                disabled={saving || !nombre.trim()}
                style={{ flex: 2 }}
              >
                <Plus size={18} /> Crear y asignar jugadores
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // ── STEP: ASSIGN ──
  return (
    <div className="liga-page fade-in">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
      <button className="btn btn-ghost btn-sm" onClick={() => setStep('list')} style={{ marginBottom: '1rem' }}>
        <ArrowLeft size={16} /> Cancelar
      </button>

      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <h1 style={{ color: 'var(--color-neon)' }}>👥 Asignar Jugadores</h1>
        <p>Haz clic en cada jugador para asignarlo a Primera o Segunda División</p>
      </div>

      {/* Division counters */}
      <div className="division-counters">
        <div className={`division-counter primera`}>
          <div className="counter-value">{primeraCount}</div>
          <div className="counter-label">🥇 Primera División</div>
          <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            {primeraCount < 12 ? `Mín 12 — faltan ${12 - primeraCount}` : primeraCount > MAX_JUGADORES ? `⚠️ Máx ${MAX_JUGADORES}` : '✅'}
          </div>
        </div>
        <div className={`division-counter segunda`}>
          <div className="counter-value">{segundaCount}</div>
          <div className="counter-label">🥈 Segunda División</div>
          <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            {segundaCount < 12 ? `Mín 12 — faltan ${12 - segundaCount}` : segundaCount > MAX_JUGADORES ? `⚠️ Máx ${MAX_JUGADORES}` : '✅'}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
        <span>1 clic = Primera</span>
        <span style={{ color: 'var(--color-border)' }}>•</span>
        <span>2 clics = Segunda</span>
        <span style={{ color: 'var(--color-border)' }}>•</span>
        <span>3 clics = Sin asignar</span>
      </div>

      {/* Player grid */}
      <div className="liga-player-grid" style={{ marginBottom: '1.5rem' }}>
        {allJugadores.map(j => {
          const division = selections[j.id] ?? null;
          const cardClass = division ? `selected-${division}` : '';

          return (
            <div
              key={j.id}
              className={`liga-player-card ${cardClass}`}
              onClick={() => {
                // Cycle: null → primera → segunda → null
                const current = selections[j.id] ?? null;
                const next: DivisionLiga | null =
                  current === null ? 'primera' :
                  current === 'primera' ? 'segunda' :
                  null;
                setSelections(prev => ({ ...prev, [j.id]: next }));
              }}
              id={`player-card-${j.id}`}
              role="button"
              tabIndex={0}
            >
              {division && (
                <span className={`division-badge ${division}`}>
                  {division === 'primera' ? '1ª' : '2ª'}
                </span>
              )}
              {j.foto_url ? (
                <img src={j.foto_url} alt={j.nombre} className="card-avatar" />
              ) : (
                <div className="card-avatar-placeholder">
                  {getInitials(j.nombre)}
                </div>
              )}
              <span className="card-name">{j.nombre}</span>
              {division && (
                <Check size={12} style={{ color: division === 'primera' ? 'var(--color-neon)' : '#3b82f6', marginTop: '0.2rem' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', position: 'sticky', bottom: '5rem', background: 'var(--color-bg)', padding: '0.75rem 0', borderTop: '1px solid var(--color-border)' }}>
        <button
          className="btn btn-ghost"
          onClick={() => setSelections({})}
          style={{ flex: 1 }}
        >
          Limpiar
        </button>
        <button
          className={`btn btn-primary ${assigning ? 'btn-loading' : ''}`}
          onClick={handleAssign}
          disabled={assigning || primeraCount < MIN_JUGADORES || segundaCount < MIN_JUGADORES}
          style={{ flex: 2 }}
        >
          <UserPlus size={18} />
          Guardar asignación ({primeraCount + segundaCount} jugadores)
        </button>
      </div>
    </div>
  );
}
