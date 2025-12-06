import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState({ id: 'mock-user-1', full_name: 'Guest User', email: 'guest@example.com' });
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Always authenticated in standalone mode
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({ id: 'mock-app', public_settings: {} });

  // Simplified - no actual auth checks needed
  const checkAppState = async () => {
    console.log('[Mock] AuthContext: checkAppState called');
    // Already initialized with mock data
  };

  const checkUserAuth = async () => {
    console.log('[Mock] AuthContext: checkUserAuth called');
    // Already authenticated with mock user
  };

  const logout = (shouldRedirect = true) => {
    console.log('[Mock] AuthContext: logout called');
    // In standalone mode, just refresh the page
    if (shouldRedirect) {
      window.location.reload();
    }
  };

  const navigateToLogin = () => {
    console.log('[Mock] AuthContext: navigateToLogin called');
    // In standalone mode, do nothing
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
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
