import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationsAPI } from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationsAPI.getAll({ limit: 50 });
      if (res.data.success) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
    
    // Poll every 30 seconds for background notifications
    let interval;
    if (isAuthenticated) {
      interval = setInterval(fetchNotifications, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchNotifications, isAuthenticated]);

  const markAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await notificationsAPI.delete(id);
      setNotifications(prev => {
        const notif = prev.find(n => n._id === id);
        if (notif && !notif.isRead) {
          setUnreadCount(count => Math.max(0, count - 1));
        }
        return prev.filter(n => n._id !== id);
      });
    } catch (error) {
      console.error('Failed to delete notification', error);
    }
  };

  // Allow manual trigger (e.g. after user performs an action)
  const triggerUpdate = () => {
    fetchNotifications();
  };

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    triggerUpdate,
    fetchNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};
