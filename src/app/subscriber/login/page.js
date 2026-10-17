'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SubscriberLogin() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Magic Link fallback state
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState('');
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [magicLinkFeedback, setMagicLinkFeedback] = useState({ message: '', type: '' });

  const router = useRouter();

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/subscriber/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to sign in. Please verify your credentials.');
        // If they don't have a password set yet, offer to switch to magic link
        if (data.hasPassword === false && data.email) {
          setMagicLinkEmail(data.email);
          setShowMagicLink(true);
        }
      } else {
        setSuccess('Authentication successful! Opening Sleek...');
        setTimeout(() => {
          router.push(data.redirect || '/');
          router.refresh();
        }, 800);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMagicLink = async (e) => {
    e.preventDefault();
    setMagicLinkFeedback({ message: '', type: '' });
    setIsSendingMagicLink(true);

    try {
      const res = await fetch('/api/magic-link/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: magicLinkEmail }),
      });

      const data = await res.json();

      if (res.ok) {
        setMagicLinkFeedback({
          message: 'An instant access link has been sent to your email inbox.',
          type: 'success',
        });
      } else {
        setMagicLinkFeedback({
          message: data.error || 'Failed to send login link. Please ensure this email has an active subscription.',
          type: 'error',
        });
      }
    } catch (err) {
      setMagicLinkFeedback({
        message: 'Network error. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSendingMagicLink(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-box" style={{ maxWidth: '420px' }}>
        <h2 className="login-title">SLEEK MEMBER</h2>
        
        {!showMagicLink ? (
          <>
            <p style={{
              textAlign: 'center',
              fontSize: '0.85rem',
              color: 'var(--color-muted)',
              marginTop: '-1rem'
            }}>
              Subscriber Sign In
            </p>

            <form onSubmit={handlePasswordLogin} className="editor-form">
              <div className="form-group">
                <label htmlFor="identifier">Email or Display Name</label>
                <input
                  id="identifier"
                  type="text"
                  className="form-input"
                  placeholder="e.g. name@example.com or @displayname"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>

              {error && <p className="login-error">{error}</p>}
              {success && (
                <p className="admin-feedback success" style={{ textAlign: 'center', padding: '0.75rem' }}>
                  {success}
                </p>
              )}

              <button type="submit" className="login-btn" disabled={isLoading}>
                {isLoading ? 'SIGNING IN...' : 'LOG IN'}
              </button>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                textAlign: 'center',
                marginTop: '1rem',
                fontSize: '0.8rem',
                color: 'var(--color-muted)'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    if (identifier.includes('@')) {
                      setMagicLinkEmail(identifier);
                    }
                    setShowMagicLink(true);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-bronze)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    textDecoration: 'underline'
                  }}
                >
                  Forgot password or sign in with Magic Link
                </button>

                <div>
                  Don't have a subscription?{' '}
                  <Link href="/#subscribe" style={{ color: 'var(--color-white)', textDecoration: 'underline' }}>
                    Join Sleek
                  </Link>
                </div>

                <Link
                  href="/"
                  style={{
                    color: 'var(--color-muted)',
                    fontSize: '0.75rem',
                    marginTop: '0.5rem',
                    textDecoration: 'none'
                  }}
                >
                  &larr; Return to Homepage
                </Link>
              </div>
            </form>
          </>
        ) : (
          <>
            <p style={{
              textAlign: 'center',
              fontSize: '0.85rem',
              color: 'var(--color-muted)',
              marginTop: '-1rem'
            }}>
              Instant Magic Link Sign In
            </p>

            <form onSubmit={handleSendMagicLink} className="editor-form">
              <div className="form-group">
                <label htmlFor="magicEmail">Subscribed Email Address</label>
                <input
                  id="magicEmail"
                  type="email"
                  className="form-input"
                  placeholder="your-email@example.com"
                  value={magicLinkEmail}
                  onChange={(e) => setMagicLinkEmail(e.target.value)}
                  required
                  disabled={isSendingMagicLink}
                  autoComplete="email"
                />
              </div>

              {magicLinkFeedback.message && (
                <p className={`admin-feedback ${magicLinkFeedback.type === 'success' ? 'success' : 'error'}`}>
                  {magicLinkFeedback.message}
                </p>
              )}

              <button type="submit" className="login-btn" disabled={isSendingMagicLink}>
                {isSendingMagicLink ? 'SENDING LINK...' : 'SEND MAGIC LINK'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowMagicLink(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-bronze)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    textDecoration: 'underline'
                  }}
                >
                  &larr; Back to Password Login
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
