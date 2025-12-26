import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import api from '../services/api';

// User role types
export type UserRole = 'owner' | 'admin' | 'manager' | 'doctor' | 'provider' | 'front_desk' | 'staff';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isFirstLogin: boolean;
  isOrgOwner?: boolean;
  organizationId?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
  currentOrganization: string;
  setCurrentOrganization: (org: string) => void;
  activePatient: {
    id: string;
    name: string;
    age: number;
    gender: string;
    dob: string;
  } | null;
  setActivePatient: (patient: any) => void;
  markFirstLoginComplete: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });

  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [currentOffice, setCurrentOffice] = useState('Cranberry Dental Arts [108]');
  const [currentOrganization, setCurrentOrganization] = useState('Cranberry Dental Group');
  const [activePatient, setActivePatient] = useState<{
    id: string;
    name: string;
    age: number;
    gender: string;
    dob: string;
  } | null>(null);

  // Persist auth state
  useEffect(() => {
    localStorage.setItem('isAuthenticated', String(isAuthenticated));
  }, [isAuthenticated]);

  // Persist user
  useEffect(() => {
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [user]);

  // Restore session on refresh
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token && !user) {
      api.get('/api/v1/users/me')
        .then(res => {
          const u = res.data;
          const restoredUser: User = {
            id: String(u.id),
            email: u.email,
            name: u.email,
            role: 'staff',
            isFirstLogin: false,
          };
          setUser(restoredUser);
          setIsAuthenticated(true);
        })
        .catch(() => {
          localStorage.clear();
          setIsAuthenticated(false);
          setUser(null);
        });
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post('/api/v1/auth/login', {
        email,
        password,
        tenant_id: 1,
      });

      const { access_token, refresh_token } = res.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      const meRes = await api.get('/api/v1/users/me');

      const u = meRes.data;
      const newUser: User = {
        id: String(u.id),
        email: u.email,
        name: u.email,
        role: 'staff',
        isFirstLogin: false,
      };

      setUser(newUser);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      console.error('Login failed', err);
      return false;
    }
  };

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        await api.post('/api/v1/auth/logout', {
          refresh_token: refresh,
        });
      }
    } catch (err) {
      console.warn('Logout API failed', err);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      setActivePatient(null);
      localStorage.clear();
    }
  };

  const markFirstLoginComplete = () => {
    if (user && user.isFirstLogin) {
      const updatedUser = { ...user, isFirstLogin: false };
      setUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        logout,
        currentOffice,
        setCurrentOffice,
        currentOrganization,
        setCurrentOrganization,
        activePatient,
        setActivePatient,
        markFirstLoginComplete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
