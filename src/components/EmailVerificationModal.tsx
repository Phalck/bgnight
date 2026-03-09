'use client';

import { useState } from 'react';
import { useToast } from '@/components/Toast';
import styles from './EmailVerificationModal.module.css';

interface EmailVerificationModalProps {
  onVerify: (code: string) => void;
  onClose: () => void;
}

export function EmailVerificationModal({ onVerify, onClose }: EmailVerificationModalProps) {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSending(true);
    setError('');

    try {
      const response = await fetch('/api/user/delete-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      // In dev mode, show the code in a toast
      if (data.code) {
        addToast(`Development mode - Your code is: ${data.code}`, 'success');
      }

      addToast('Verification code sent to your email!', 'success');
      setStep('code');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send code. Please try again.';
      setError(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = () => {
    if (!code.trim() || code.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    onVerify(code);
  };

  const handleResend = async () => {
    setIsSending(true);
    setError('');

    try {
      const response = await fetch('/api/user/delete-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code');
      }

      if (data.code) {
        addToast(`Development mode - Your code is: ${data.code}`, 'success');
      }

      addToast('New verification code sent!', 'success');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend code';
      setError(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {step === 'email' ? 'Verify Your Identity' : 'Enter Verification Code'}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalContent}>
          {step === 'email' ? (
            <>
              <p className={styles.description}>
                To proceed with account deletion, we need to verify your identity. 
                Please enter your email address to receive a verification code.
              </p>

              <div className={styles.field}>
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={isSending}
                />
              </div>
            </>
          ) : (
            <>
              <p className={styles.description}>
                A 6-digit verification code has been sent to <strong>{email}</strong>. 
                Please enter it below to continue.
              </p>

              <div className={styles.field}>
                <label htmlFor="code">Verification Code</label>
                <input
                  type="text"
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className={styles.codeInput}
                  disabled={isSending}
                />
              </div>

              <button 
                className={styles.resendBtn}
                onClick={handleResend}
                disabled={isSending}
              >
                {isSending ? 'Sending...' : 'Resend Code'}
              </button>
            </>
          )}

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.modalActions}>
          <button 
            type="button" 
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isSending}
          >
            Cancel
          </button>
          {step === 'email' ? (
            <button 
              type="button" 
              className={styles.continueBtn}
              onClick={handleSendCode}
              disabled={isSending || !email.trim()}
            >
              {isSending ? 'Sending...' : 'Send Code'}
            </button>
          ) : (
            <button 
              type="button" 
              className={styles.continueBtn}
              onClick={handleVerify}
              disabled={code.length !== 6}
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
