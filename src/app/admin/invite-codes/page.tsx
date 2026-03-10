'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import styles from './page.module.css';

interface InviteCode {
  id: string;
  code: string;
  createdBy: string;
  usedBy: string | null;
  usedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function InviteCodesPage() {
  const { addToast } = useToast();
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUsed, setShowUsed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [count, setCount] = useState(1);
  const [expiresAt, setExpiresAt] = useState('');

  const fetchCodes = async () => {
    try {
      const res = await fetch(`/api/admin/invite-codes?showUsed=${showUsed}`);
      if (res.ok) {
        const data = await res.json();
        setCodes(data.codes);
      } else {
        addToast('Failed to fetch invite codes', 'error');
      }
    } catch (error) {
      addToast('Failed to fetch invite codes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, [showUsed]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const body: { count: number; expiresAt?: string } = { count };
      if (expiresAt) {
        body.expiresAt = new Date(expiresAt).toISOString();
      }

      const res = await fetch('/api/admin/invite-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        addToast(data.message, 'success');
        fetchCodes();
        setCount(1);
        setExpiresAt('');
      } else {
        const data = await res.json();
        addToast(data.error || 'Failed to generate codes', 'error');
      }
    } catch (error) {
      addToast('Failed to generate codes', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invite code?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/invite-codes/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        addToast('Invite code deleted', 'success');
        fetchCodes();
      } else {
        addToast('Failed to delete invite code', 'error');
      }
    } catch (error) {
      addToast('Failed to delete invite code', 'error');
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    addToast('Code copied to clipboard!', 'success');
  };

  const activeCodes = codes.filter(c => !c.usedBy && c.isActive);
  const usedCodes = codes.filter(c => c.usedBy);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Invite Codes</h1>
      </div>

      <div className={styles.generateSection}>
        <h2 className={styles.sectionTitle}>Generate New Codes</h2>
        <div className={styles.generateForm}>
          <div className={styles.formGroup}>
            <label>Number of codes</label>
            <input
              type="number"
              min="1"
              max="50"
              value={count}
              onChange={(e) => setCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
              className={styles.input}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label>Expires at (optional)</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className={styles.input}
            />
          </div>
          
          <button
            onClick={handleGenerate}
            disabled={generating}
            className={styles.generateBtn}
          >
            {generating ? 'Generating...' : 'Generate Codes'}
          </button>
        </div>
      </div>

      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{activeCodes.length}</span>
          <span className={styles.statLabel}>Available</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{usedCodes.length}</span>
          <span className={styles.statLabel}>Used</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{codes.length}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
      </div>

      <div className={styles.filterBar}>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={showUsed}
            onChange={(e) => setShowUsed(e.target.checked)}
          />
          Show used codes
        </label>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading codes...</div>
      ) : codes.length === 0 ? (
        <div className={styles.empty}>
          No invite codes found. Generate some codes to get started.
        </div>
      ) : (
        <div className={styles.codesGrid}>
          {codes.map((code) => (
            <div
              key={code.id}
              className={`${styles.codeCard} ${code.usedBy ? styles.used : ''} ${!code.isActive ? styles.expired : ''}`}
            >
              <div className={styles.codeHeader}>
                <span className={styles.code}>{code.code}</span>
                <div className={styles.codeActions}>
                  {!code.usedBy && (
                    <button
                      onClick={() => copyToClipboard(code.code)}
                      className={styles.iconBtn}
                      title="Copy code"
                    >
                      📋
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(code.id)}
                    className={styles.iconBtn}
                    title="Delete code"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <div className={styles.codeDetails}>
                {code.usedBy ? (
                  <>
                    <span className={styles.badgeUsed}>Used</span>
                    <span className={styles.date}>
                      Used on {new Date(code.usedAt!).toLocaleDateString()}
                    </span>
                  </>
                ) : code.expiresAt && new Date(code.expiresAt) < new Date() ? (
                  <>
                    <span className={styles.badgeExpired}>Expired</span>
                    <span className={styles.date}>
                      Expired on {new Date(code.expiresAt).toLocaleDateString()}
                    </span>
                  </>
                ) : (
                  <>
                    <span className={styles.badgeActive}>Active</span>
                    {code.expiresAt && (
                      <span className={styles.date}>
                        Expires: {new Date(code.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </>
                )}
              </div>
              
              <div className={styles.codeMeta}>
                Created: {new Date(code.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}