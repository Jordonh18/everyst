import React, { createContext, useState, useContext, useCallback, useEffect, useRef } from 'react';
import { socketService } from '../utils/socket';
import { useWebSocket } from './WebSocketContext';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import type { NotificationItem } from '../types/notifications';

interface NotificationContextType {
  notifications: NotificationItem[];
  markAsRead: (id: string | number) => void;
  markAllAsRead: () => void;
  unreadCount: number;
  fetchNotifications: () => Promise<NotificationItem[]>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  retry: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  markAsRead: () => {},
  markAllAsRead: () => {},
  unreadCount: 0,
  fetchNotifications: async () => [],
  isLoading: false,
  error: null,
  clearError: () => {},
  retry: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);
  
  // Use Auth context for token management
  const { getAccessToken } = useAuth();
  
  // Use WebSocket context for persistent connection
  const { isConnected } = useWebSocket();

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Set up WebSocket notification handler
  useEffect(() => {
    if (isConnected) {
      socketService.onNotification((notification) => {
        // Ensure the notification has a proper ID
        const notificationWithId = {
          ...notification,
          id: notification.id || `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        } as NotificationItem;
        
        // Add new notification to the list
        setNotifications(prev => [notificationWithId, ...prev]);
        
        // Update unread count if it's unread
        if (!notification.read) {
          setUnreadCount(prev => prev + 1);
        }
        
        // Show toast notification with improved reliability
        try {
          toast[notification.type || 'info'](notification.title, {
            description: notification.message,
            duration: notification.duration || 5000,
          });
        } catch (toastError) {
          console.warn('Failed to show toast notification:', toastError);
          // Fallback to basic toast
          toast(notification.title);
        }
      });
    }
  }, [isConnected, getAccessToken]);

  // Fetch notifications from the server with retry logic
  const fetchNotifications = useCallback(async (retryCount = 0): Promise<NotificationItem[]> => {
    const token = getAccessToken();
    if (!token || !isConnected) {
      return [];
    }
    
    // Prevent too frequent API calls
    const now = Date.now();
    if (now - lastFetchRef.current < 1000) {
      return notifications;
    }
    lastFetchRef.current = now;
    
    setIsLoading(true);
    setError(null);
    
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch notifications';
      setError(errorMessage);
      
      // Retry with exponential backoff
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        retryTimeoutRef.current = setTimeout(() => {
          fetchNotifications(retryCount + 1);
        }, delay);
      }
      
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, getAccessToken, notifications]);

  // Fetch unread notification count with retry logic
  const fetchUnreadCount = useCallback(async (retryCount = 0) => {
    const token = getAccessToken();
    if (!token || !isConnected) return;
    
    try {
      const count = await socketService.getUnreadCount(token);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      
      // Retry with exponential backoff
      if (retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          fetchUnreadCount(retryCount + 1);
        }, delay);
      }
    }
  }, [isConnected, getAccessToken]);

  // Mark a notification as read with optimistic updates
  const markAsRead = useCallback(async (id: string | number) => {
    const token = getAccessToken();
    if (!token || !isConnected) return;
    
    // Optimistic update
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    
    try {
      const success = await socketService.markAsRead([id], token);
      if (!success) {
        throw new Error('Failed to mark as read');
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      
      // Revert optimistic update
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: false } : n)
      );
      setUnreadCount(prev => prev + 1);
      
      toast.error('Failed to mark notification as read');
    }
  }, [isConnected, getAccessToken]);

  // Mark all notifications as read with optimistic updates
  const markAllAsRead = useCallback(async () => {
    const token = getAccessToken();
    if (!token || !isConnected) return;
    
    // Store previous state for rollback
    const prevNotifications = notifications;
    const prevUnreadCount = unreadCount;
    
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    
    try {
      const success = await socketService.markAllAsRead(token);
      if (!success) {
        throw new Error('Failed to mark all as read');
      }
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      
      // Revert optimistic update
      setNotifications(prevNotifications);
      setUnreadCount(prevUnreadCount);
      
      toast.error('Failed to mark all notifications as read');
    }
  }, [isConnected, getAccessToken, notifications, unreadCount]);

  // Retry function for manual retry
  const retry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  // Initial fetch of notifications when auth state changes
  useEffect(() => {
    const token = getAccessToken();
    if (token && isConnected) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [isConnected, getAccessToken, fetchNotifications, fetchUnreadCount]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Periodic refresh every 5 minutes to ensure data consistency
  useEffect(() => {
    if (!isConnected) return;
    
    const interval = setInterval(() => {
      const token = getAccessToken();
      if (token) {
        fetchNotifications();
        fetchUnreadCount();
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [isConnected, getAccessToken, fetchNotifications, fetchUnreadCount]);

  // Create context value
  const value = {
    notifications,
    markAsRead,
    markAllAsRead,
    unreadCount,
    fetchNotifications,
    isLoading,
    error,
    clearError,
    retry
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};