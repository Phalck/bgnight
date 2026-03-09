'use client';

import { useState } from 'react';
import styles from './ConfirmDeleteModal.module.css';

interface ConfirmDeleteModalProps {
  title: string;
  message: string;
  itemCount?: string;
  requireCode?: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  verificationCode?: string;
  onVerificationCodeChange?: (code: string) => void;
}

export function ConfirmDeleteModal({
  title,
  message,
  itemCount,
  requireCode = false,
  onConfirm,
  onClose,
  verificationCode: externalVerificationCode,
  onVerificationCodeChange
}: ConfirmDeleteModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [internalVerificationCode, setInternalVerificationCode] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const verificationCode = externalVerificationCode !== undefined ? externalVerificationCode : internalVerificationCode;
  const setVerificationCode = onVerificationCodeChange || setInternalVerificationCode;

  const handleConfirm = async () => {
    setError('');

    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    if (requireCode && !verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setIsDeleting(true);

    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete. Please try again.';
      setError(errorMessage);
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.warningIcon}>⚠️</div>
          
          <p className={styles.message}>{message}</p>

          {itemCount && (
            <div className={styles.itemCount}>
              <span className={styles.itemCountLabel}>Items to delete:</span>
              <span className={styles.itemCountValue}>All {itemCount}</span>
            </div>
          )}

          {requireCode && (
            <div className={styles.field}>
              <label htmlFor="verificationCode">Verification Code</label>
              <input
                type="text"
                id="verificationCode"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className={styles.codeInput}
              />
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="confirmText">
              Type <strong>DELETE</strong> to confirm
            </label>
            <input
              type="text"
              id="confirmText"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className={styles.confirmInput}
              autoComplete="off"
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.modalActions}>
          <button 
            type="button" 
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className={styles.deleteBtn}
            onClick={handleConfirm}
            disabled={isDeleting || confirmText !== 'DELETE'}
          >
            {isDeleting ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}
