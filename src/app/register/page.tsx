'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import styles from '../login/page.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteOnlyMode, setInviteOnlyMode] = useState(false);
  const [checkingSettings, setCheckingSettings] = useState(true);

  // Fetch site settings to check if invite-only mode is enabled
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings/public');
        if (res.ok) {
          const data = await res.json();
          setInviteOnlyMode(data.inviteOnlyMode || false);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setCheckingSettings(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, inviteCode: inviteOnlyMode ? inviteCode : undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Failed to sign in after registration');
      } else {
        router.push('/collection');
      }
    } catch {
      setError('Something went wrong');
    }

    setLoading(false);
  };

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.card}>
            <h1 className={styles.title}>Create Account</h1>
            <p className={styles.subtitle}>Start your board game collection</p>

            <form onSubmit={handleSubmit} className={styles.form}>
              {error && <div className={styles.error}>{error}</div>}
              
              <div className={styles.field}>
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                />
              </div>

              {inviteOnlyMode && (
                <>
                  <div className={styles.infoBox}>
                    <strong>🔒 Invite-Only Registration</strong>
                    <span>An invite code is required to create an account. Contact an administrator to receive an invite code.</span>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="inviteCode">Invite Code *</label>
                    <input
                      id="inviteCode"
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      required
                      placeholder="Enter your invite code"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                </>
              )}

              <button type="submit" className={styles.submitBtn} disabled={loading || checkingSettings}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <p className={styles.footer}>
              Already have an account? <Link href="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
