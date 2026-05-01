import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationsDropdown from '../Notifications/NotificationsDropdown';
import {
  LayoutDashboard,
  Trophy,
  Shield,
  Gamepad2,
  User,
  Settings,
} from 'lucide-react';
import './Layout.css';

export default function MainLayout() {
  const { jugador, isAdmin } = useAuth();
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
          to="/mis-partidos"
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          id="nav-mis-partidos"
        >
          <Gamepad2 size={22} className="nav-icon" />
          <span>Partidos</span>
        </NavLink>

        <NavLink
          to="/perfil"
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          id="nav-perfil"
        >
          <User size={22} className="nav-icon" />
          <span>Perfil</span>
        </NavLink>

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
