'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Supabase reset link automatic session creation check
    async function checkSession() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // If no session, the user didn't arrive here via a valid reset link/token
        setError('Invalid or expired reset link. Please request a new one.');
      } else {
        setIsSessionActive(true);
      }
    }
    checkSession();
  }, []);

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!isSessionActive) return;

    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Success! Redirect to dashboard
    router.push('/dashboard?message=Password reset successful');
    router.refresh();
  }

  return (
    <div className="auth-page">
      <div className="auth-card glass-card">
        <h1>Set New Password</h1>
        <p className="subtitle">Choose a strong password to secure your account.</p>

        {error && (
          <div className="auth-error">
            {error}
            {!isSessionActive && (
              <div style={{ marginTop: '10px' }}>
                <Link href="/forgot-password" className="btn btn-ghost" style={{ width: '100%' }}>
                  Request New Link
                </Link>
              </div>
            )}
          </div>
        )}

        <form className="auth-form" onSubmit={handleResetPassword} method="POST">
          <div className="input-group">
            <label htmlFor="password">New Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={!isSessionActive}
              autoComplete="new-password"
            />
          </div>

          <div className="input-group">
            <label htmlFor="confirm-password">Confirm New Password</label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              className="input"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              disabled={!isSessionActive}
              autoComplete="new-password"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading || !isSessionActive}
          >
            {loading ? <span className="spinner"></span> : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
