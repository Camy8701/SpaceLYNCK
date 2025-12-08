// ============================================================================
// AUTH SERVICE - Supabase Authentication
// ============================================================================
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export const authService = {
  /**
   * Sign up a new user with email and password
   */
  async signUp({ email, password, fullName }) {
    if (!isSupabaseConfigured) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    return { data, error };
  },

  /**
   * Sign in with email and password
   */
  async signIn({ email, password }) {
    if (!isSupabaseConfigured) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    return { data, error };
  },

  /**
   * Sign in with OAuth provider (Google, GitHub, etc.)
   */
  async signInWithProvider(provider) {
    if (!isSupabaseConfigured) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    return { data, error };
  },

  /**
   * Sign out the current user
   */
  async signOut() {
    if (!isSupabaseConfigured) {
      return { error: null };
    }

    const { error } = await supabase.auth.signOut();
    return { error };
  },

  /**
   * Get the current user session
   */
  async getSession() {
    if (!isSupabaseConfigured) {
      return { data: { session: null }, error: null };
    }

    const { data, error } = await supabase.auth.getSession();
    return { data, error };
  },

  /**
   * Get the current user
   */
  async getUser() {
    if (!isSupabaseConfigured) {
      return { data: { user: null }, error: null };
    }

    const { data, error } = await supabase.auth.getUser();
    return { data, error };
  },

  /**
   * Send password reset email
   */
  async resetPassword(email) {
    if (!isSupabaseConfigured) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });

    return { data, error };
  },

  /**
   * Update user password (after reset)
   */
  async updatePassword(newPassword) {
    if (!isSupabaseConfigured) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    return { data, error };
  },

  /**
   * Update user profile
   */
  async updateProfile({ fullName, avatarUrl }) {
    if (!isSupabaseConfigured) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        avatar_url: avatarUrl
      }
    });

    return { data, error };
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback) {
    if (!isSupabaseConfigured) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }

    return supabase.auth.onAuthStateChange(callback);
  },

  /**
   * Resend confirmation email
   */
  async resendConfirmation(email) {
    if (!isSupabaseConfigured) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email
    });

    return { data, error };
  }
};

export default authService;
