import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotificaciones } from '../../hooks/useNotificaciones';
import type { TipoNotificacion } from '../../types/database';
import { Bell, CheckCheck, X, Trophy, Globe, Target, Clock, Mail, Shield } from 'lucide-react';
import './Notifications.css';

const NOTIF_ICONS: Record<TipoNotificacion, { icon: any; color: string }> = {
  cruce: { icon: Target, color: '#FF6B35' },
  grupo: { icon: Globe, color: '#39FF14' },
  resultado: { icon: Trophy, color: '#FFB800' },
  recordatorio: { icon: Clock, color: '#888' },
  inscripciones: { icon: Mail, color: '#39FF14' },
  equipo_confirmado: { icon: Shield, color: '#39FF14' },
};

export default function NotificationsDropdown() {
  const { user } = useAuth();
  const { notificaciones, unreadCount, markAsRead, markAllAsRead } = useNotificaciones(user?.id);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  };

  return (
    <div className="notif-container" ref={dropdownRef}>
      <button
        className="top-bar-notifications"
        onClick={() => setOpen(!open)}
        aria-label="Notificaciones"
        id="btn-notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-dot">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown fade-in">
          <div className="notif-header">
            <h3>Notificaciones</h3>
            <div className="notif-header-actions">
              {unreadCount > 0 && (
                <button
                  className="notif-mark-all"
                  onClick={() => markAllAsRead()}
                  title="Marcar todas como leídas"
                >
                  <CheckCheck size={16} />
                </button>
              )}
              <button className="notif-close" onClick={() => setOpen(false)}>
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="notif-list">
            {notificaciones.length === 0 ? (
              <div className="notif-empty">
                <Bell size={32} strokeWidth={1} />
                <p>Sin notificaciones</p>
              </div>
            ) : (
              notificaciones.map((notif) => {
                const config = NOTIF_ICONS[notif.tipo] || NOTIF_ICONS.recordatorio;
                const Icon = config.icon;

                return (
                  <div
                    key={notif.id}
                    className={`notif-item ${!notif.leida ? 'notif-unread' : ''}`}
                    onClick={() => !notif.leida && markAsRead(notif.id)}
                  >
                    <div className="notif-icon" style={{ color: config.color }}>
                      <Icon size={18} />
                    </div>
                    <div className="notif-content">
                      <p className="notif-title">{notif.titulo}</p>
                      <p className="notif-body">{notif.cuerpo}</p>
                      <span className="notif-time">{timeAgo(notif.created_at)}</span>
                    </div>
                    {!notif.leida && (
                      <div className="notif-unread-dot" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
