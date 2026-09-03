import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole, EmergencyAlert, NotificationItem } from '../types';
import { ApiClient } from '../services/api';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  activeViewMode: 'AUTHORITY' | 'CITIZEN';
  activeAlerts: EmergencyAlert[];
  notifications: NotificationItem[];
  unreadCount: number;
  login: (identifier: string, pass: string) => Promise<void>;
  adminClearanceLogin: (clearanceKey: string, identifier: string, pass: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => Promise<void>;
  setActiveViewMode: (mode: 'AUTHORITY' | 'CITIZEN') => void;
  refreshAlerts: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('sentinelx_token'));
  const [activeViewMode, setActiveViewMode] = useState<'AUTHORITY' | 'CITIZEN'>('AUTHORITY');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeAlerts, setActiveAlerts] = useState<EmergencyAlert[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const refreshAlerts = useCallback(async () => {
    try {
      if (token) {
        const res = await ApiClient.getActiveEmergencyAlerts();
        if (res.success) {
          setActiveAlerts(res.alerts);
        }
      }
    } catch (err) {
      // Benign if unauthorized or server reloading
    }
  }, [token]);

  const refreshNotifications = useCallback(async () => {
    try {
      if (token && user) {
        const res = await ApiClient.getNotifications();
        if (res.success) {
          setNotifications(res.notifications);
        }
      }
    } catch (err) {
      // Ignored
    }
  }, [token, user]);

  // Initial load
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('sentinelx_token');
      if (savedToken) {
        try {
          const res = await ApiClient.getMe();
          if (res.success && res.user) {
            setUser(res.user);
            setToken(savedToken);
          } else {
            ApiClient.clearToken();
            setToken(null);
            setUser(null);
          }
        } catch (err) {
          ApiClient.clearToken();
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Poll alerts & notifications periodically
  useEffect(() => {
    if (user && token) {
      refreshAlerts();
      refreshNotifications();

      const interval = setInterval(() => {
        refreshAlerts();
        refreshNotifications();
      }, 15000); // 15 seconds

      return () => clearInterval(interval);
    }
  }, [user, token, refreshAlerts, refreshNotifications]);

  const login = async (identifier: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await ApiClient.login(identifier, pass);
      if (res.success) {
        setUser(res.user);
        setToken(res.token);
        setActiveViewMode(res.user.role === UserRole.CITIZEN ? 'CITIZEN' : 'AUTHORITY');
        await refreshAlerts();
        await refreshNotifications();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const adminClearanceLogin = async (clearanceKey: string, identifier: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await ApiClient.adminClearance({ clearanceKey, identifier, password: pass });
      if (res.success) {
        setUser(res.user);
        setToken(res.token);
        setActiveViewMode('AUTHORITY');
        await refreshAlerts();
        await refreshNotifications();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await ApiClient.register(data);
      if (res.success) {
        setUser(res.user);
        setToken(res.token);
        setActiveViewMode('CITIZEN');
        await refreshAlerts();
        await refreshNotifications();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = async (targetRole: UserRole) => {
    // If not logged in, only Citizen services is available in the Public Portal (Guest)
    if (!user) {
      if (targetRole !== UserRole.CITIZEN) {
        throw new Error('Public portal (guest) access is strictly restricted to Citizen Services. Official login is required for Police, Consumer Rights (DNCRP), or Admin consoles.');
      }
      setIsLoading(true);
      try {
        const res = await ApiClient.demoSwitchRole(UserRole.CITIZEN);
        if (res.success) {
          setUser(res.user);
          setToken(res.token);
          setActiveViewMode('CITIZEN');
          await refreshAlerts();
          await refreshNotifications();
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Authenticated user RBAC logic:
    // 1. Citizen cannot switch to any authority role
    if (user.role === UserRole.CITIZEN) {
      if (targetRole !== UserRole.CITIZEN) {
        throw new Error('Access Denied: Citizens are registered as citizens and only take citizen services. Authority roles are strictly locked.');
      }
      setActiveViewMode('CITIZEN');
      return;
    }

    // 2. Authority users (Police, Consumer Rights, Admin) are also citizens:
    // They can view Citizen Services (using their own account credentials) or their assigned authority dashboard
    if (targetRole === UserRole.CITIZEN) {
      setActiveViewMode('CITIZEN');
      return;
    }

    if (targetRole === user.role) {
      setActiveViewMode('AUTHORITY');
      return;
    }

    // 3. Authority users cannot switch to other distinct authority agencies
    throw new Error(`Access Denied: As a ${user.role} stakeholder, you cannot access other authority departments.`);
  };

  const logout = () => {
    ApiClient.clearToken();
    setUser(null);
    setToken(null);
    setActiveViewMode('AUTHORITY');
    setActiveAlerts([]);
    setNotifications([]);
  };

  const markNotificationRead = async (id: string) => {
    try {
      await ApiClient.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        activeViewMode,
        activeAlerts,
        notifications,
        unreadCount,
        login,
        adminClearanceLogin,
        register,
        logout,
        switchRole,
        setActiveViewMode,
        refreshAlerts,
        refreshNotifications,
        markNotificationRead
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
