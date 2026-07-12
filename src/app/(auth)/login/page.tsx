'use client';

import { useActionState } from 'react';
import { login } from './actions';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <div className="login-container">
      <div className="login-glow" />
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 2L4 9v14l12 7 12-7V9L16 2z" stroke="url(#grad)" strokeWidth="2" fill="none" />
              <path d="M16 8l-6 3.5v7L16 22l6-3.5v-7L16 8z" fill="url(#grad)" opacity="0.3" />
              <defs>
                <linearGradient id="grad" x1="4" y1="2" x2="28" y2="30">
                  <stop stopColor="#3b82f6" />
                  <stop offset="1" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1>PowerPlus</h1>
          <p className="login-subtitle">Lead Finder</p>
        </div>

        <form action={formAction}>
          <div className="login-field">
            <label htmlFor="password">Access Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter password"
              autoFocus
              required
              disabled={isPending}
            />
          </div>

          {state?.error && (
            <div className="login-error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0V5zm.75 6.5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
              </svg>
              {state.error}
            </div>
          )}

          <button type="submit" className="login-button" disabled={isPending}>
            {isPending ? (
              <span className="login-spinner" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="login-footer">
          PowerPlus LLC — Generator Solutions
        </p>
      </div>
    </div>
  );
}
