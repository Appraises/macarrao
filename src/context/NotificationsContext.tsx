import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import type { AppNotification } from '../../types';
import { getNotifications, markAllNotificationsRead, markNotificationClicked, markNotificationRead } from '../services/api';
import { useAuth } from './AuthContext';

interface NotificationsContextValue {
  items: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markClicked: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await getNotifications({ page: 1, pageSize: 20 });
      setItems(result.items);
      setUnreadCount(result.unreadCount);
    } catch {
      // Keep the last successful state while polling recovers.
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || typeof window === 'undefined') {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 60_000);
    const token = localStorage.getItem('token');
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
      auth: token ? { token } : {},
      transports: ['websocket', 'polling'],
    });
    socket.on('notification:new', (notification: AppNotification) => {
      setItems((current) => current.some((item) => item.id === notification.id)
        ? current
        : [notification, ...current].slice(0, 20));
      setUnreadCount((current) => current + 1);
    });
    return () => {
      window.clearInterval(interval);
      socket.disconnect();
    };
  }, [user, refresh]);

  const markRead = useCallback(async (id: string) => {
    const current = items.find((item) => item.id === id);
    if (!current || current.readAt) return;
    const updated = await markNotificationRead(id);
    setItems((all) => all.map((item) => item.id === id ? updated : item));
    setUnreadCount((count) => Math.max(0, count - 1));
  }, [items]);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    const readAt = new Date().toISOString();
    setItems((all) => all.map((item) => ({ ...item, readAt: item.readAt || readAt })));
    setUnreadCount(0);
  }, []);

  const markClicked = useCallback(async (id: string) => {
    const updated = await markNotificationClicked(id);
    setItems((all) => all.map((item) => item.id === id ? updated : item));
    setUnreadCount((count) => Math.max(0, items.find((item) => item.id === id)?.readAt ? count : count - 1));
  }, [items]);

  const value = useMemo(() => ({ items, unreadCount, loading, refresh, markRead, markClicked, markAllRead }), [items, unreadCount, loading, refresh, markRead, markClicked, markAllRead]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications must be used inside NotificationsProvider');
  return context;
};
