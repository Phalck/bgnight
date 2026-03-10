'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { RestoreModal } from '@/components/RestoreModal';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { EmailVerificationModal } from '@/components/EmailVerificationModal';
import styles from './SettingsMenu.module.css';

export function SettingsMenu() {
  const router = useRouter();
  const { addToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteCollectionModal, setShowDeleteCollectionModal] = useState(false);
  const [showDeletePlaysModal, setShowDeletePlaysModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false);

  // Restore type
  const [restoreType, setRestoreType] = useState<'collection' | 'plays'>('collection');
  
  // Account deletion verification code
  const [accountDeletionCode, setAccountDeletionCode] = useState('');

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBackup = async (type: 'collection' | 'plays') => {
    try {
      const response = await fetch(`/api/backup/${type}`);
      if (!response.ok) throw new Error('Failed to backup');
      
      const data = await response.json();
      
      // Create downloadable file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bgnight-${type}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      addToast(`Backup downloaded successfully!`, 'success');
    } catch (error) {
      addToast('Failed to create backup', 'error');
    }
  };

  const handleDeleteCollection = async () => {
    try {
      const response = await fetch('/api/delete/collection', { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      
      const data = await response.json();
      addToast(data.message, 'success');
      router.refresh();
    } catch (error) {
      addToast('Failed to delete collection', 'error');
    }
  };

  const handleDeletePlays = async () => {
    try {
      const response = await fetch('/api/delete/plays', { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      
      const data = await response.json();
      addToast(data.message, 'success');
      router.refresh();
    } catch (error) {
      addToast('Failed to delete plays', 'error');
    }
  };

  const handleDeleteAccount = async (code: string) => {
    try {
      const response = await fetch('/api/user/delete-request', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }
      
      addToast('Account deleted successfully', 'success');
      router.push('/');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete account';
      addToast(errorMessage, 'error');
      throw error;
    }
  };

  return (
    <>
      <div className={styles.container} ref={menuRef}>
        <button 
          className={styles.settingsBtn}
          onClick={() => setIsOpen(!isOpen)}
          title="Settings"
          data-settings-trigger
        >
          ⚙️ Settings
        </button>

        {isOpen && (
          <div className={styles.dropdown}>
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Backup</h4>
              <button
                className={styles.menuItem}
                onClick={() => {
                  handleBackup('collection');
                  setIsOpen(false);
                }}
              >
                📥 Backup Collection
              </button>
              <button
                className={styles.menuItem}
                onClick={() => {
                  handleBackup('plays');
                  setIsOpen(false);
                }}
              >
                📥 Backup Logged Plays
              </button>
            </div>

            <div className={styles.divider} />

            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Restore</h4>
              <button 
                className={styles.menuItem}
                onClick={() => {
                  setRestoreType('collection');
                  setShowRestoreModal(true);
                  setIsOpen(false);
                }}
              >
                📤 Restore Collection
              </button>
              <button 
                className={styles.menuItem}
                onClick={() => {
                  setRestoreType('plays');
                  setShowRestoreModal(true);
                  setIsOpen(false);
                }}
              >
                📤 Restore Logged Plays
              </button>
            </div>

            <div className={styles.divider} />

            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Danger Zone</h4>
              <button 
                className={`${styles.menuItem} ${styles.danger}`}
                onClick={() => {
                  setShowDeleteCollectionModal(true);
                  setIsOpen(false);
                }}
              >
                🗑️ Delete Collection
              </button>
              <button 
                className={`${styles.menuItem} ${styles.danger}`}
                onClick={() => {
                  setShowDeletePlaysModal(true);
                  setIsOpen(false);
                }}
              >
                🗑️ Delete Logged Plays
              </button>
              <button 
                className={`${styles.menuItem} ${styles.danger}`}
                onClick={() => {
                  setShowEmailVerificationModal(true);
                  setIsOpen(false);
                }}
              >
                ⚠️ Remove User Account
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showRestoreModal && (
        <RestoreModal
          type={restoreType}
          onClose={() => setShowRestoreModal(false)}
        />
      )}

      {showDeleteCollectionModal && (
        <ConfirmDeleteModal
          title="Delete Collection"
          message="This will permanently delete all games from your collection. This action cannot be undone."
          itemCount="games"
          onConfirm={handleDeleteCollection}
          onClose={() => setShowDeleteCollectionModal(false)}
        />
      )}

      {showDeletePlaysModal && (
        <ConfirmDeleteModal
          title="Delete Logged Plays"
          message="This will permanently delete all your logged plays. This action cannot be undone."
          itemCount="logged plays"
          onConfirm={handleDeletePlays}
          onClose={() => setShowDeletePlaysModal(false)}
        />
      )}

      {showEmailVerificationModal && (
        <EmailVerificationModal
          onVerify={(code) => {
            setAccountDeletionCode(code);
            setShowEmailVerificationModal(false);
            setShowDeleteAccountModal(true);
          }}
          onClose={() => setShowEmailVerificationModal(false)}
        />
      )}

      {showDeleteAccountModal && (
        <ConfirmDeleteModal
          title="Remove User Account"
          message="This will permanently delete your account and all associated data. This action cannot be undone."
          itemCount="account"
          requireCode={true}
          onConfirm={() => handleDeleteAccount(accountDeletionCode)}
          onClose={() => setShowDeleteAccountModal(false)}
        />
      )}
    </>
  );
}