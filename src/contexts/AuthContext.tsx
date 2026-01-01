import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// User role types
export type UserRole = 'owner' | 'admin' | 'manager' | 'doctor' | 'provider' | 'front_desk' | 'staff' | 'superadmin';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isFirstLogin: boolean;
  isOrgOwner?: boolean; // Flag for organization ownership
  organizationId?: string; // Current active organization
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
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
    // Check localStorage for existing session
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  
  const [user, setUser] = useState<User | null>(() => {
    // Try to restore user from localStorage
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

  // Persist authentication state
  useEffect(() => {
    localStorage.setItem('isAuthenticated', String(isAuthenticated));
  }, [isAuthenticated]);

  // Persist user data
  useEffect(() => {
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [user]);

  const login = (email: string, password: string) => {
    // Mock authentication - accepts any credentials
    if (email && password) {
      // Simulate backend user role assignment based on email
      let role: UserRole = 'staff';
      let name = 'User';
      let isFirstLogin = false;
      let isOrgOwner = false;
      let organizationId = 'ORG-001'; // Default organization

      // Mock role detection based on email domain/pattern
      if (email.toLowerCase().includes('owner')) {
        role = 'owner';
        name = 'John Doe (Owner)';
        isOrgOwner = true;
      } else if (email.toLowerCase().includes('admin')) {
        role = 'admin';
        name = 'Admin User';
      } else if (email.toLowerCase().includes('manager')) {
        role = 'manager';
        name = 'Manager User';
      } else if (email.toLowerCase().includes('doctor') || email.toLowerCase().includes('dr')) {
        role = 'doctor';
        name = 'Dr. Smith';
      } else if (email.toLowerCase().includes('provider')) {
        role = 'provider';
        name = 'Provider User';
      } else if (email.toLowerCase().includes('desk') || email.toLowerCase().includes('staff')) {
        role = 'front_desk';
        name = 'Front Desk User';
      } else if (email.toLowerCase().includes('superadmin')) {
        role = 'superadmin';
        name = 'Super Admin User';
      }

      // Check if this is a first-time login (simulate with localStorage)
      const userLoginHistory = localStorage.getItem(`login_history_${email}`);
      if (!userLoginHistory) {
        isFirstLogin = true;
        localStorage.setItem(`login_history_${email}`, 'true');
      }

      const newUser: User = {
        id: Math.random().toString(36).substring(7),
        email,
        name,
        role,
        isFirstLogin,
        isOrgOwner,
        organizationId,
      };

      setUser(newUser);
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setActivePatient(null);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('currentUser');
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