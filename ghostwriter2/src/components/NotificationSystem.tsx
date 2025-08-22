import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      id,
      duration: 5000,
      dismissible: true,
      ...notification,
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove notification after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      clearAllNotifications
    }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="notification-container" style={{
      position: 'fixed',
      top: '1rem',
      right: '1rem',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      maxWidth: '400px'
    }}>
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onDismiss: () => void;
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const getNotificationStyles = (type: Notification['type']) => {
    const baseStyle = {
      padding: '1rem',
      borderRadius: '6px',
      border: '1px solid',
      backgroundColor: 'white',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      position: 'relative' as const,
      animation: 'slideIn 0.3s ease-out'
    };

    switch (type) {
      case 'success':
        return { ...baseStyle, borderColor: '#10b981', color: '#059669' };
      case 'error':
        return { ...baseStyle, borderColor: '#ef4444', color: '#dc2626' };
      case 'warning':
        return { ...baseStyle, borderColor: '#f59e0b', color: '#d97706' };
      case 'info':
        return { ...baseStyle, borderColor: '#3b82f6', color: '#2563eb' };
      default:
        return baseStyle;
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  return (
    <div style={getNotificationStyles(notification.type)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.2em' }}>{getIcon(notification.type)}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', marginBottom: notification.message ? '0.25rem' : 0 }}>
            {notification.title}
          </div>
          {notification.message && (
            <div style={{ fontSize: '0.9em', opacity: 0.8 }}>
              {notification.message}
            </div>
          )}
        </div>
        {notification.dismissible && (
          <button
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.2em',
              cursor: 'pointer',
              padding: '0',
              color: 'currentColor',
              opacity: 0.6
            }}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}