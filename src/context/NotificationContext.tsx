import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { socketService } from '../utils/socket';
import { useWebSocket } from './WebSocketContext';
import { useAuth } from './AuthContext';
import type { NotificationItem } from '../types/notifications';

interface NotificationContextType {
  notifications: NotificationItem[];
  markAsRead: (id: string | number) => void;
  markAllAsRead: () => void;
  unreadCount: number;
  fetchNotifications: () => Promise<NotificationItem[]>;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  markAsRead: () => {},
  markAllAsRead: () => {},
  unreadCount: 0,
  fetchNotifications: async () => [],
  isLoading: false,
});

export const useNotifications = () => useContext(NotificationContext);

// interface ServerNotification {
  //id?: string | number;
  //title: string;
  //message?: string;
  //type: string;
  //timestamp?: number;
  //duration?: number;
  //read?: boolean;
  //is_system?: boolean;
  //source?: string;
//}

export const NotificationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Use Auth context for token management
  const { getAccessToken } = useAuth();
  
  // Use WebSocket context for persistent connection
  const { isConnected } = useWebSocket();

    // Set up WebSocket notification handler
  useEffect(() => {
    // Register socket notification handler
    if (isConnected) {
      socketService.onNotification(() => {
        // When new notifications arrive via WebSocket, they will be
        // automatically fetched during the next poll cycle
      });
    }
  }, [isConnected]);

  // Fetch notifications from the server
  const fetchNotifications = useCallback(async () => {
    const token = getAccessToken();
    if (!token || !isConnected) return [];
    
    setIsLoading(true);
    try {
      const fetchedNotifications = await socketService.fetchNotifications(token);
      const typedNotifications = fetchedNotifications.map(n => ({
        ...n,
        id: n.id || `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      })) as NotificationItem[];
      
      setNotifications(typedNotifications);
      setUnreadCount(typedNotifications.filter(n => !n.read).length);
      return typedNotifications;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, getAccessToken]);

  // Fetch unread notification count
  const fetchUnreadCount = useCallback(async () => {
    const token = getAccessToken();
    if (!token || !isConnected) return;
    
    try {
      const count = await socketService.getUnreadCount(token);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, [isConnected, getAccessToken]);

  // Mark a notification as read
  const markAsRead = useCallback(async (id: string | number) => {
    const token = getAccessToken();
    if (!token || !isConnected) return;
    
    try {
      const success = await socketService.markAsRead([id], token);
      if (success) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [isConnected, getAccessToken]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    const token = getAccessToken();
    if (!token || !isConnected) return;
    
    try {
      const success = await socketService.markAllAsRead(token);
      if (success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [isConnected, getAccessToken]);

  // Initial fetch of notifications when auth state changes
  useEffect(() => {
    const token = getAccessToken();
    if (token && isConnected) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [isConnected, fetchNotifications, fetchUnreadCount, getAccessToken]);

  // Create context value
  const value = {
    notifications,
    markAsRead,
    markAllAsRead,
    unreadCount,
    fetchNotifications,
    isLoading
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};