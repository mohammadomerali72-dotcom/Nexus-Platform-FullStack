// context/NotificationContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import NotificationService from '../services/notificationService';

// Define the shape of our context value
interface NotificationContextValue {
  unreadCount: number;
  refreshUnreadCount: () => void;
  decrementUnreadCount: () => void;
  resetUnreadCount: () => void;
}

// Define props for the provider
interface NotificationProviderProps {
  children: ReactNode;
}

// Create context with a default value
const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const useNotifications = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { user } = useAuth();

  // Fetch unread count
  const fetchUnreadCount = async (): Promise<void> => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await NotificationService.getUnreadCount();
      if (response.success) {
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
      setUnreadCount(0);
    }
  };

  // Refresh unread count (to be called from other components)
  const refreshUnreadCount = (): void => {
    fetchUnreadCount();
  };

  // Decrement unread count by 1 (when marking single notification as read)
  const decrementUnreadCount = (): void => {
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Reset unread count to 0 (when marking all as read)
  const resetUnreadCount = (): void => {
    setUnreadCount(0);
  };

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      
      // Refresh every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
    }
  }, [user]);

  const value: NotificationContextValue = {
    unreadCount,
    refreshUnreadCount,
    decrementUnreadCount,
    resetUnreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};