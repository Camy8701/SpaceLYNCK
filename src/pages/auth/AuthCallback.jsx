// ============================================================================
// AUTH CALLBACK - Handles OAuth and Email Confirmation Redirects
// ============================================================================
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code from URL if present (for OAuth)
        const code = searchParams.get('code');
        const error_description = searchParams.get('error_description');
        
        if (error_description) {
          setError(error_description);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        if (code) {
          // Exchange code for session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('Auth callback error:', error);
            setError(error.message);
            setTimeout(() => navigate('/login'), 3000);
            return;
          }
          
          // Successfully authenticated
          navigate('/Dashboard', { replace: true });
        } else {
          // Check if there's a hash with tokens (for email confirmation)
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const type = hashParams.get('type');
          
          if (accessToken) {
            // Session should be automatically set by Supabase
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
              if (type === 'recovery') {
                // Password recovery - redirect to reset password page
                navigate('/auth/reset-password', { replace: true });
              } else {
                // Email confirmation or sign in
                navigate('/Dashboard', { replace: true });
              }
            } else {
              setError('Failed to establish session');
              setTimeout(() => navigate('/login'), 3000);
            }
          } else {
            // No code or tokens - redirect to login
            navigate('/login', { replace: true });
          }
        }
      } catch (err) {
        console.error('Auth callback exception:', err);
        setError('An unexpected error occurred');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="text-center">
        {error ? (
          <>
            <div className="text-red-400 mb-4">{error}</div>
            <p className="text-slate-400">Redirecting to login...</p>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-4" />
            <p className="text-slate-400">Completing authentication...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
