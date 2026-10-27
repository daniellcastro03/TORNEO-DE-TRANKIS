import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationsDropdown from '../Notifications/NotificationsDropdown';
import ThemeToggle from './ThemeToggle';
import {
  LayoutDashboard,
  Trophy,
  Shield,
  Gamepad2,
  User,
  Settings,
  Crown,
  Medal,
} from 'lucide-react';
import './Layout.css';

export default function MainLayout() {
  const { jugador, user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="app-layout">
      {/* Top Bar */}
      <header className="top-bar">
        <NavLink to="/" className="top-bar-brand">
          <span className="brand-icon">⚽</span>
          <span>TORNEITOS</span>
        </NavLink>

        <div className="top-bar-right">
          <ThemeToggle />
          {!user ? (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/login')}>
              Iniciar Sesión
            </button>
          ) : (
            <>
              <NotificationsDropdown />

              <div
                className="top-bar-avatar"
                onClick={() => navigate('/perfil')}
                role="button"
                tabIndex={0}
                aria-label="Ver perfil"
              >
                {jugador?.foto_url ? (
                  <img
                    src={jugador.foto_url}
                    alt={jugador.nombre}
                    className="avatar avatar-sm"
                  />
                ) : (
                  <div className="avatar avatar-sm avatar-placeholder" style={{ fontSize: '0.7rem' }}>
                    {jugador ? getInitials(jugador.nombre) : '?'}
                  </div>
                )}
              </div>

              {/* Botón rápido de cerrar sesión para cumplir con el request */}
              <button
                className="btn btn-ghost btn-sm"
                onClick={async () => {
                  await signOut();
                  navigate('/login');
                }}
                title="Cerrar Sesión"
                style={{ padding: '0.4rem', color: 'var(--color-danger)' }}
              >
                <span className="nav-icon" style={{ fontSize: '1rem' }}>🚪</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Bottom Nav / Sidebar */}
      <nav className="bottom-nav" aria-label="Navegación principal">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          id="nav-dashboard"
        >
          <LayoutDashboard size={22} className="nav-icon" />
          <span>Inicio</span>
        </NavLink>

        <NavLink
          to="/torneos"
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          id="nav-torneos"
        >
          <Trophy size={22} className="nav-icon" />
          <span>Torneos</span>
        </NavLink>

        <NavLink
          to="/jugadores"
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          id="nav-jugadores"
        >
          <Shield size={22} className="nav-icon" />
          <span>Jugadores</span>
        </NavLink>

        <NavLink
          to="/salon-fama"
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          id="nav-salon-fama"
        >
          <Crown size={22} className="nav-icon" style={{ color: '#FFD700' }} />
          <span>Fama</span>
        </NavLink>

        <NavLink
          to="/liga"
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          id="nav-liga"
        >
          <Medal size={22} className="nav-icon" style={{ color: '#3b82f6' }} />
          <span>Liga</span>
        </NavLink>

        {user && (
          <NavLink
            to="/mis-partidos"
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
            id="nav-mis-partidos"
          >
            <Gamepad2 size={22} className="nav-icon" />
            <span>Partidos</span>
          </NavLink>
        )}

        {user && (
          <NavLink
            to="/perfil"
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
            id="nav-perfil"
          >
            <User size={22} className="nav-icon" />
            <span>Perfil</span>
          </NavLink>
        )}

        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
            id="nav-admin"
          >
            <Settings size={22} className="nav-icon" />
            <span>Admin</span>
          </NavLink>
        )}
      </nav>
    </div>
  );
}
