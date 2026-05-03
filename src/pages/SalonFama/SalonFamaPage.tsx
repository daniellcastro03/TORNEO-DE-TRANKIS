import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSalonFama } from '../../hooks/useSalonFama';
import { Crown, Star, Plus, Trash2, X, Trophy } from 'lucide-react';
import './SalonFama.css';

export default function SalonFamaPage() {
  const { isAdmin } = useAuth();
  const { trofeos, jugadores, torneos, loading, addTrofeo, deleteTrofeo } = useSalonFama();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    jugador_id: '',
    torneo_id: '',
    titulo: '',
    descripcion: '',
    tipo_trofeo: 'oro'
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const dataToSubmit = {
      ...form,
      torneo_id: form.torneo_id || null
    };

    const { error } = await addTrofeo(dataToSubmit);
    setSubmitting(false);
    
    if (!error) {
      setShowModal(false);
      setForm({ jugador_id: '', torneo_id: '', titulo: '', descripcion: '', tipo_trofeo: 'oro' });
    } else {
      alert(`Error: ${error}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar este trofeo del Salón de la Fama?')) {
      await deleteTrofeo(id);
    }
  };

  const getTrophyIcon = (tipo: string) => {
    switch (tipo) {
      case 'oro': return <Crown size={32} className="trophy-oro" />;
      case 'plata': return <Trophy size={32} className="trophy-plata" />;
      case 'bronce': return <Trophy size={32} className="trophy-bronce" />;
      case 'champions': return <Star size={32} className="trophy-champions" />;
      case 'mundial': return <span style={{fontSize: '2rem'}}>🌍</span>;
      default: return <Trophy size={32} className="trophy-oro" />;
    }
  };

  // Agrupar trofeos por jugador
  const jugadoresConTrofeos = trofeos.reduce((acc, trofeo) => {
    if (!acc[trofeo.jugador_id]) {
      acc[trofeo.jugador_id] = {
        jugador: trofeo.jugador,
        trofeos: []
      };
    }
    acc[trofeo.jugador_id].trofeos.push(trofeo);
    return acc;
  }, {} as Record<string, { jugador: any, trofeos: any[] }>);

  const listaJugadores = Object.values(jugadoresConTrofeos)
    .sort((a, b) => b.trofeos.length - a.trofeos.length); // Ordenar por cantidad de trofeos

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div className="salon-fama-page fade-in">
      <div className="salon-header">
        <div className="salon-title-wrapper">
          <Crown size={36} className="salon-main-icon pulse-glow" />
          <h1>Salón de la Fama</h1>
        </div>
        <p>Las leyendas de Torneitos de Trankis</p>
        
        {isAdmin && (
          <button className="btn btn-neon btn-sm mt-md" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Añadir Trofeo
          </button>
        )}
      </div>

      {listaJugadores.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon bounce">🏆</div>
          <h3>El Salón está vacío</h3>
          <p>Aún no hay campeones coronados en la eternidad.</p>
        </div>
      ) : (
        <div className="salon-grid">
          {listaJugadores.map((item, i) => (
            <div key={i} className="salon-card fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="salon-card-header">
                {item.jugador?.foto_url ? (
                  <img src={item.jugador.foto_url} alt="" className="salon-avatar" />
                ) : (
                  <div className="salon-avatar-placeholder">
                    {item.jugador?.nombre?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <h3 className="salon-name">{item.jugador?.nombre || 'Jugador'}</h3>
                <span className="trophy-count-badge">{item.trofeos.length} 🏆</span>
              </div>
              
              <div className="trophies-container">
                {item.trofeos.map(t => (
                  <div key={t.id} className="trophy-item float-anim">
                    {isAdmin && (
                      <button className="delete-trophy-btn" onClick={() => handleDelete(t.id)}>
                        <Trash2 size={12} />
                      </button>
                    )}
                    <div className="trophy-icon-wrapper">
                      {getTrophyIcon(t.tipo_trofeo)}
                    </div>
                    <div className="trophy-details">
                      <h4>{t.titulo}</h4>
                      {t.torneo?.nombre && <span className="trophy-torneo">{t.torneo.nombre}</span>}
                      {t.descripcion && <p>{t.descripcion}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Añadir Trofeo */}
      {showModal && isAdmin && (
        <div className="modal-overlay fade-in">
          <div className="modal-content scale-in">
            <div className="modal-header">
              <h3>Añadir al Salón de la Fama</h3>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Jugador</label>
                <select 
                  required 
                  value={form.jugador_id} 
                  onChange={e => setForm({...form, jugador_id: e.target.value})}
                >
                  <option value="">Selecciona un jugador...</option>
                  {jugadores.map(j => (
                    <option key={j.id} value={j.id}>{j.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Torneo (Opcional)</label>
                <select 
                  value={form.torneo_id} 
                  onChange={e => setForm({...form, torneo_id: e.target.value})}
                >
                  <option value="">Ninguno / Especial</option>
                  {torneos.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Título del Logro</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ej: Campeón Mundial 2026"
                  value={form.titulo}
                  onChange={e => setForm({...form, titulo: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Tipo de Trofeo</label>
                <select 
                  value={form.tipo_trofeo}
                  onChange={e => setForm({...form, tipo_trofeo: e.target.value})}
                >
                  <option value="oro">🥇 Copa de Oro</option>
                  <option value="plata">🥈 Copa de Plata</option>
                  <option value="bronce">🥉 Copa de Bronce</option>
                  <option value="champions">⭐ Champions (Estrella)</option>
                  <option value="mundial">🌍 Copa Mundial</option>
                </select>
              </div>

              <div className="form-group">
                <label>Descripción / Dedicatoria (Opcional)</label>
                <textarea 
                  placeholder="Ej: Ganado invicto con el Real Madrid"
                  value={form.descripcion}
                  onChange={e => setForm({...form, descripcion: e.target.value})}
                  rows={2}
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                {submitting ? 'Guardando...' : 'Otorgar Trofeo'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
