import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, ListOrdered, Shield, Gamepad2, ClipboardList, Users } from 'lucide-react';

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    async function fetchPending() {
      const { count } = await supabase
        .from('torneo_inscripciones')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'pendiente');
      setPendingCount(count || 0);
    }
    if (isAdmin) fetchPending();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="page-container fade-in">
        <div className="empty-state card">
          <div className="empty-state-icon">🔒</div>
          <h3>Acceso denegado</h3>
          <p>Solo los administradores pueden acceder a esta sección</p>
        </div>
      </div>
    );
  }

  const cards = [
    {
      icon: Plus,
      title: 'Crear Torneo',
      desc: 'Configura un nuevo torneo con tipo, formato y reglas',
      route: '/admin/torneos/crear',
      disabled: false,
      badge: null,
    },
    {
      icon: ClipboardList,
      title: 'Inscripciones',
      desc: 'Acepta o rechaza solicitudes de jugadores para los torneos',
      route: '/admin/inscripciones',
      disabled: false,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    {
      icon: Users,
      title: 'Jugadores',
      desc: 'Ver todos los usuarios y gestionar sus roles (admin / jugador)',
      route: '/admin/jugadores',
      disabled: false,
      badge: null,
    },
    {
      icon: ListOrdered,
      title: 'Gestionar Torneos',
      desc: 'Ver todos los torneos, gestionar grupos, estados y sorteos',
      route: '/torneos',
      disabled: false,
      badge: null,
    },
    {
      icon: Shield,
      title: 'Catálogo de Equipos',
      desc: 'Administra los equipos disponibles por tipo de torneo',
      route: '/admin/catalogo',
      disabled: false,
      badge: null,
    },
    {
      icon: Gamepad2,
      title: 'Registrar Resultados',
      desc: 'Ingresa resultados de partidos jugados',
      route: '/admin/resultados',
      disabled: false,
      badge: null,
    },
  ];

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1>Panel Admin</h1>
        <p>Gestión de torneos, jugadores y resultados</p>
      </div>

      <div className="grid-2">
        {cards.map((card, i) => (
          <div
            key={card.title}
            className={`card card-glow fade-in fade-in-delay-${i + 1}`}
            style={{
              cursor: card.disabled ? 'default' : 'pointer',
              opacity: card.disabled ? 0.5 : 1,
              position: 'relative',
            }}
            onClick={() => !card.disabled && navigate(card.route)}
            role="button"
            tabIndex={card.disabled ? -1 : 0}
          >
            {card.badge && (
              <div style={{
                position: 'absolute',
                top: '0.75rem',
                right: '0.75rem',
                background: 'var(--color-danger)',
                color: '#fff',
                borderRadius: 99,
                minWidth: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0 5px',
              }}>
                {card.badge}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <card.icon size={24} color="var(--color-neon)" />
              <h3>{card.title}</h3>
              {card.disabled && (
                <span className="badge badge-draw" style={{ fontSize: '0.6rem' }}>Próximamente</span>
              )}
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
              {card.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
