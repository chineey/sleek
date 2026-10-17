'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SubscriberSetupContent() {
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [subscriberEmail, setSubscriberEmail] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get('welcome') === 'true';

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/subscriber/status');
        const data = await res.json();
        if (data.isSubscriber && data.email) {
          setSubscriberEmail(data.email);
          // Check if already has a display name
          const nameRes = await fetch('/api/display-name');
          if (nameRes.ok) {
            const nameData = await nameRes.json();
            if (nameData.displayName) {
              setDisplayName(nameData.displayName);
            }
          }
        } else {
          setError('No active subscription found. Please sign in or subscribe first.');
        }
      } catch (err) {
        setError('Failed to verify subscriber session.');
      } finally {
        setIsCheckingAuth(false);
      }
    }
    checkAuth();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validations
    const cleanName = displayName.trim();
    if (cleanName.length < 3 || cleanName.length > 12) {
      setError('Display name must be between 3 and 12 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanName)) {
      setError('Display name can only contain letters, numbers, and underscores.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/subscriber/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: cleanName, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to complete setup. Please try again.');
      } else {
        setSuccess('Setup complete! Redirecting you to Sleek...');
        setTimeout(() => {
          router.push('/?subscribed=true');
          router.refresh();
        }, 1200);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-box" style={{ maxWidth: '440px' }}>
        <h2 className="login-title">
          {isWelcome ? 'WELCOME TO SLEEK' : 'SET UP YOUR ACCESS'}
        </h2>
        <p style={{
          textAlign: 'center',
          fontSize: '0.85rem',
          color: 'var(--color-muted)',
          marginTop: '-1rem',
          lineHeight: '1.5'
        }}>
          {subscriberEmail ? (
            <>
              Account: <strong style={{ color: 'var(--color-white)' }}>{subscriberEmail}</strong><br />
              Create your display name and password so you can sign in anytime on any device.
            </>
          ) : (
            'Choose your display name and password to sign in on any device.'
          )}
        </p>

        {isCheckingAuth ? (
          <p style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '2rem 0' }}>
            Verifying subscription...
          </p>
        ) : !subscriberEmail ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
            <p className="login-error">{error || 'Active subscriber session required.'}</p>
            <Link href="/subscriber/login" className="login-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
              GO TO LOGIN
            </Link>
            <Link href="/#subscribe" style={{ color: 'var(--color-bronze)', fontSize: '0.8rem', textDecoration: 'underline' }}>
              Subscribe to Sleek
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="editor-form">
            <div className="form-group">
              <label htmlFor="displayName">Display Name</label>
              <input
                id="displayName"
                type="text"
                className="form-input"
                placeholder="e.g. alex_noir"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                disabled={isLoading}
                maxLength={12}
                autoComplete="off"
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                3–12 letters, numbers, or underscores (for comments and sign in)
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="password">Create Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                className="form-input"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>

            {error && <p className="login-error">{error}</p>}
            {success && (
              <p className="admin-feedback success" style={{ textAlign: 'center', padding: '0.75rem' }}>
                {success}
              </p>
            )}

            <button type="submit" className="login-btn" disabled={isLoading}>
              {isLoading ? 'SAVING...' : 'COMPLETE SETUP & ENTER'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <Link
                href="/"
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-muted)',
                  textDecoration: 'underline',
                  transition: 'color 0.2s ease'
                }}
              >
                Skip for now & go to homepage
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function SubscriberSetup() {
  return (
    <Suspense
      fallback={
        <div className="login-wrapper">
          <div className="login-box">
            <h2 className="login-title">SLEEK MEMBER</h2>
            <p style={{ textAlign: 'center', color: 'var(--color-muted)' }}>Loading setup...</p>
          </div>
        </div>
      }
    >
      <SubscriberSetupContent />
    </Suspense>
  );
}
