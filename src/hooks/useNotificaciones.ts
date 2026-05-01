import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Notificacion, TipoNotificacion } from '../types/database';

export function useNotificaciones(jugadorId: string | undefined) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotificaciones = useCallback(async () => {
    if (!jugadorId) return;

    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('jugador_id', jugadorId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      const notifs = data as Notificacion[];
      setNotificaciones(notifs);
      setUnreadCount(notifs.filter((n) => !n.leida).length);
    }
    setLoading(false);
  }, [jugadorId]);

  useEffect(() => {
    fetchNotificaciones();

    if (!jugadorId) return;

    // Realtime: new notifications
    const channel = supabase
      .channel(`notifs-${jugadorId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificaciones',
        filter: `jugador_id=eq.${jugadorId}`,
      }, (payload) => {
        const newNotif = payload.new as Notificacion;
        setNotificaciones((prev) => [newNotif, ...prev]);
        setUnreadCount((prev) => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchNotificaciones, jugadorId]);

  const markAsRead = async (notifId: string) => {
    await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', notifId);

    setNotificaciones((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, leida: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!jugadorId) return;

    await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('jugador_id', jugadorId)
      .eq('leida', false);

    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    setUnreadCount(0);
  };

  return { notificaciones, unreadCount, loading, markAsRead, markAllAsRead, refetch: fetchNotificaciones };
}

// ===========================
// Create notification helpers
// ===========================

export async function crearNotificacion(
  jugadorId: string,
  tipo: TipoNotificacion,
  titulo: string,
  cuerpo: string
): Promise<void> {
  await supabase.from('notificaciones').insert({
    jugador_id: jugadorId,
    tipo,
    titulo,
    cuerpo,
    leida: false,
  });
}

// Notify multiple players at once
export async function notificarJugadores(
  jugadorIds: string[],
  tipo: TipoNotificacion,
  titulo: string,
  cuerpo: string
): Promise<void> {
  const rows = jugadorIds.map((id) => ({
    jugador_id: id,
    tipo,
    titulo,
    cuerpo,
    leida: false,
  }));

  await supabase.from('notificaciones').insert(rows);
}
