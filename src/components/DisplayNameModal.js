'use client';

import { useState } from 'react';
import styles from './DisplayNameModal.module.css';

export default function DisplayNameModal({ isOpen, onClose, onSubmit }) {
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const value = e.target.value;
    setDisplayName(value);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate on backend
      const validateRes = await fetch('/api/display-name/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });

      const validateData = await validateRes.json();

      if (!validateRes.ok) {
        setError(validateData.error || 'Validation failed');
        setLoading(false);
        return;
      }

      // Set display name
      const setRes = await fetch('/api/display-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });

      const setData = await setRes.json();

      if (!setRes.ok) {
        setError(setData.error || 'Failed to set display name');
        setLoading(false);
        return;
      }

      // Success
      setDisplayName('');
      onSubmit(setData.displayName);
      onClose();
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Choose Your Display Name</h2>
          <p>This is how others will see you in comments</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <input
              type="text"
              value={displayName}
              onChange={handleChange}
              placeholder="Enter a display name"
              minLength={3}
              maxLength={12}
              disabled={loading}
              autoFocus
            />
            <span className={styles.counter}>{displayName.length}/12</span>
          </div>

          <div className={styles.rules}>
            <p className={styles.rulesTitle}>Requirements:</p>
            <ul>
              <li>3-12 characters</li>
              <li>Letters, numbers, and underscores only</li>
              <li>Cannot contain: admin, moderator, support, sleek</li>
            </ul>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button
              type="submit"
              disabled={displayName.length < 3 || displayName.length > 12 || loading}
              className={styles.submitBtn}
            >
              {loading ? 'Setting...' : 'Continue'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={styles.cancelBtn}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
