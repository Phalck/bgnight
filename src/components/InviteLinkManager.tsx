'use client';

import { useState } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { useToast } from './Toast';
import * as api from '@/lib/api-client';
import styles from './InviteLinkManager.module.css';

interface InviteLinkManagerProps {
  nightId: string;
  inviteToken?: string | null;
  inviteExpiresAt?: string | null;
  inviteEnabled?: boolean;
  onUpdate: () => void;
}

const EXPIRATION_OPTIONS = [
  { value: 4, label: '4 hours' },
  { value: 8, label: '8 hours' },
  { value: 24, label: '24 hours' },
  { value: 48, label: '48 hours' },
];

export function InviteLinkManager({
  nightId,
  inviteToken,
  inviteExpiresAt,
  inviteEnabled,
  onUpdate,
}: InviteLinkManagerProps) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedExpiration, setSelectedExpiration] = useState(24);
  const [showGenerateForm, setShowGenerateForm] = useState(false);

  const isExpired = inviteExpiresAt ? new Date() > new Date(inviteExpiresAt) : false;
  const isActive = inviteEnabled && inviteToken && !isExpired;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await api.post<{
        token: string;
        expiresAt: string;
        url: string;
      }>(`/api/planned-nights/${nightId}/invite`, {
        expirationHours: selectedExpiration,
      });

      await navigator.clipboard.writeText(response.url);
      addToast('Invite link generated and copied to clipboard!', 'success');
      setShowGenerateForm(false);
      onUpdate();
    } catch (err) {
      const message = api.getErrorMessage(err);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('This will invalidate the existing invite link. Continue?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.patch<{
        token: string;
        expiresAt: string;
        url: string;
      }>(`/api/planned-nights/${nightId}/invite`, {
        expirationHours: selectedExpiration,
      });

      await navigator.clipboard.writeText(response.url);
      addToast('New invite link generated and copied to clipboard!', 'success');
      onUpdate();
    } catch (err) {
      const message = api.getErrorMessage(err);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      await api.del(`/api/planned-nights/${nightId}/invite`);
      addToast('Invite link disabled', 'success');
      onUpdate();
    } catch (err) {
      const message = api.getErrorMessage(err);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    const url = getInviteUrl();
    if (!url) return;
    
    try {
      await navigator.clipboard.writeText(url);
      addToast('Link copied to clipboard!', 'success');
    } catch {
      addToast('Failed to copy link', 'error');
    }
  };

  const visitPage = () => {
    const url = getInviteUrl();
    if (url) {
      window.open(url, '_blank');
    }
  };

  const getInviteUrl = () => {
    if (!inviteToken) return '';
    return `${window.location.origin}/invite/${inviteToken}`;
  };

  if (!isActive && !showGenerateForm) {
    return (
      <div className={styles.container}>
        <div className={styles.statusRow}>
          <span className={styles.statusText}>Player RSVP link has expired</span>
          <button
            className={styles.iconBtn}
            onClick={() => setShowGenerateForm(true)}
            disabled={loading}
            title="Generate new invite link"
          >
            {loading ? <LoadingSpinner size="small" /> : '🔗'}
          </button>
        </div>
      </div>
    );
  }

  if (showGenerateForm) {
    return (
      <div className={styles.container}>
        <div className={styles.form}>
          <label className={styles.label}>Link expires after:</label>
          <select
            className={styles.select}
            value={selectedExpiration}
            onChange={(e) => setSelectedExpiration(Number(e.target.value))}
            disabled={loading}
          >
            {EXPIRATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className={styles.formActions}>
            <button
              className={styles.cancelBtn}
              onClick={() => setShowGenerateForm(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className={styles.generateBtn}
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? <LoadingSpinner size="small" /> : 'Generate & Copy Link'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.statusRow}>
        <span className={styles.statusTextActive}>
          <span className={styles.statusDotActive}>●</span>
          Player RSVP link is active
        </span>
        <div className={styles.iconActions}>
          <button
            className={styles.iconBtn}
            onClick={copyToClipboard}
            disabled={loading}
            title="Copy link to clipboard"
          >
            📋
          </button>
          <button
            className={styles.iconBtn}
            onClick={visitPage}
            disabled={loading}
            title="Visit invite page"
          >
            🔗
          </button>
          <button
            className={styles.iconBtn}
            onClick={handleRegenerate}
            disabled={loading}
            title="Regenerate link"
          >
            {loading ? <LoadingSpinner size="small" /> : '🔄'}
          </button>
          <button
            className={styles.iconBtn + ' ' + styles.iconBtnDanger}
            onClick={handleDisable}
            disabled={loading}
            title="Disable link"
          >
            🚫
          </button>
        </div>
      </div>
    </div>
  );
}
