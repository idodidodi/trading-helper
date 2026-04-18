'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleResetRequest(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card glass-card">
          <h1>Check your email</h1>
          <p className="subtitle">
            We&apos;ve sent a password reset link to <strong>{email}</strong>.
            Please check your inbox to continue.
          </p>
          <div className="auth-footer">
            <Link href="/login">Back to login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card glass-card">
        <h1>Forgot Password</h1>
        <p className="subtitle">Enter your email and we&apos;ll send you a link to reset your password.</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleResetRequest} method="POST">
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner"></span> : 'Send Reset Link'}
          </button>
        </form>

        <div className="auth-footer">
          Remembered your password?{' '}
          <Link href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
