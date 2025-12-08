// ============================================================================
// AUTH CONTEXT - Supabase Authentication Provider
// ============================================================================
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { authService } from '@/services/authService';
import { isSupabaseConfigured } from '@/lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({ id: 'lynckspace', public_settings: {} });

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      setIsLoadingAuth(true);
      
      try {
        // Get current session
        const { data: { session }, error } = await authService.getSession();
        
        if (error) {
          console.error('[Auth] Session error:', error);
          setAuthError({ type: 'session_error', message: error.message });
        } else if (session) {
          setSession(session);
          setUser(session.user);
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error('[Auth] Init error:', err);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      console.log('[Auth] State changed:', event);
      
      if (event === 'SIGNED_IN' && session) {
        setSession(session);
        setUser(session.user);
        setIsAuthenticated(true);
        setAuthError(null);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setIsAuthenticated(false);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setSession(session);
        setUser(session.user);
      } else if (event === 'USER_UPDATED' && session) {
        setUser(session.user);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Sign up
  const signUp = useCallback(async ({ email, password, fullName }) => {
    setIsLoadingAuth(true);
    setAuthError(null);
    
    try {
      const { data, error } = await authService.signUp({ email, password, fullName });
      
      if (error) {
        setAuthError({ type: 'signup_error', message: error.message });
        return { success: false, error };
      }
      
      // Check if email confirmation is required
      if (data?.user && !data?.session) {
        return { 
          success: true, 
          needsConfirmation: true,
          message: 'Please check your email to confirm your account.'
        };
      }
      
      return { success: true, data };
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  // Sign in
  const signIn = useCallback(async ({ email, password }) => {
    setIsLoadingAuth(true);
    setAuthError(null);
    
    try {
      const { data, error } = await authService.signIn({ email, password });
      
      if (error) {
        setAuthError({ type: 'signin_error', message: error.message });
        return { success: false, error };
      }
      
      return { success: true, data };
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  // Sign in with OAuth provider
  const signInWithProvider = useCallback(async (provider) => {
    setAuthError(null);
    
    const { data, error } = await authService.signInWithProvider(provider);
    
    if (error) {
      setAuthError({ type: 'oauth_error', message: error.message });
      return { success: false, error };
    }
    
    return { success: true, data };
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    const { error } = await authService.signOut();
    
    if (error) {
      console.error('[Auth] Sign out error:', error);
    }
    
    setSession(null);
    setUser(null);
    setIsAuthenticated(false);
    
    return { error };
  }, []);

  // Legacy logout function (alias for signOut)
  const logout = useCallback((shouldRedirect = true) => {
    signOut().then(() => {
      if (shouldRedirect) {
        window.location.href = '/login';
      }
    });
  }, [signOut]);

  // Reset password
  const resetPassword = useCallback(async (email) => {
    setAuthError(null);
    
    const { data, error } = await authService.resetPassword(email);
    
    if (error) {
      setAuthError({ type: 'reset_error', message: error.message });
      return { success: false, error };
    }
    
    return { success: true, message: 'Password reset email sent. Please check your inbox.' };
  }, []);

  // Update password
  const updatePassword = useCallback(async (newPassword) => {
    setAuthError(null);
    
    const { data, error } = await authService.updatePassword(newPassword);
    
    if (error) {
      setAuthError({ type: 'update_error', message: error.message });
      return { success: false, error };
    }
    
    return { success: true };
  }, []);

  // Update profile
  const updateProfile = useCallback(async ({ fullName, avatarUrl }) => {
    const { data, error } = await authService.updateProfile({ fullName, avatarUrl });
    
    if (error) {
      return { success: false, error };
    }
    
    // Update local user state
    if (data?.user) {
      setUser(data.user);
    }
    
    return { success: true };
  }, []);

  // Navigate to login
  const navigateToLogin = useCallback(() => {
    window.location.href = '/login';
  }, []);

  // Check app state (for compatibility)
  const checkAppState = useCallback(async () => {
    // No-op for now, kept for compatibility
  }, []);

  const value = {
    // State
    user,
    session,
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    appPublicSettings,
    isSupabaseConfigured,
    
    // Auth methods
    signUp,
    signIn,
    signInWithProvider,
    signOut,
    logout, // Legacy alias
    resetPassword,
    updatePassword,
    updateProfile,
    
    // Utilities
    navigateToLogin,
    checkAppState,
    clearError: () => setAuthError(null)
  };

  return (
    <AuthContext.Provider value={value}>
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

export default AuthContext;
