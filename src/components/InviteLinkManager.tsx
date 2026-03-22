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

  const formatExpiration = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeRemaining = (dateString: string) => {
    const expiresAt = new Date(dateString);
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast('Link copied to clipboard!', 'success');
    } catch {
      addToast('Failed to copy link', 'error');
    }
  };

  const getInviteUrl = () => {
    if (!inviteToken) return '';
    return `${window.location.origin}/invite/${inviteToken}`;
  };

  if (!isActive && !showGenerateForm) {
    return (
      <div className={styles.container}>
        <button
          className={styles.generateBtn}
          onClick={() => setShowGenerateForm(true)}
          disabled={loading}
        >
          {loading ? <LoadingSpinner size="small" /> : '🔗 Generate Invite Link'}
        </button>
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
      <div className={styles.linkInfo}>
        <div className={styles.status}>
          <span className={styles.statusActive}>●</span>
          <span>Active</span>
          {inviteExpiresAt && (
            <span className={styles.expiration}>
              (Expires: {formatExpiration(inviteExpiresAt)} - {getTimeRemaining(inviteExpiresAt)})
            </span>
          )}
        </div>
        <div className={styles.linkDisplay}>
          <input
            type="text"
            value={getInviteUrl()}
            readOnly
            className={styles.linkInput}
          />
          <button
            className={styles.copyBtn}
            onClick={() => copyToClipboard(getInviteUrl())}
            title="Copy link"
          >
            📋
          </button>
        </div>
      </div>
      <div className={styles.actions}>
        <button
          className={styles.regenerateBtn}
          onClick={handleRegenerate}
          disabled={loading}
        >
          {loading ? <LoadingSpinner size="small" /> : '🔄 Regenerate'}
        </button>
        <button
          className={styles.disableBtn}
          onClick={handleDisable}
          disabled={loading}
        >
          {loading ? <LoadingSpinner size="small" /> : '🚫 Disable'}
        </button>
      </div>
    </div>
  );
}