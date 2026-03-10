'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useToast } from '@/components/Toast';
import { RestoreModal } from '@/components/RestoreModal';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import styles from './SettingsMenu.module.css';

export function SettingsMenu() {
  const router = useRouter();
  const { data: session } = useSession();
  const { addToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteCollectionModal, setShowDeleteCollectionModal] = useState(false);
  const [showDeletePlaysModal, setShowDeletePlaysModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  // Restore type
  const [restoreType, setRestoreType] = useState<'collection' | 'plays'>('collection');

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
      window.location.reload();
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
      window.location.reload();
    } catch (error) {
      addToast('Failed to delete plays', 'error');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch('/api/user/delete-request', {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }
      
      addToast('Account deleted successfully', 'success');
      // Sign out and redirect to home page
      await signOut({ callbackUrl: '/' });
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
                  setShowDeleteAccountModal(true);
                  setIsOpen(false);
                }}
              >
                ⚠️ Remove User Account
              </button>
            </div>

            {session?.user?.role === 'ADMIN' && (
              <>
                <div className={styles.divider} />
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>Administration</h4>
                  <button
                    className={styles.menuItem}
                    onClick={() => {
                      router.push('/admin');
                      setIsOpen(false);
                    }}
                  >
                    👑 Admin Panel
                  </button>
                </div>
              </>
            )}
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

      {showDeleteAccountModal && (
        <ConfirmDeleteModal
          title="Remove User Account"
          message="This will permanently delete your account and all associated data. This action cannot be undone."
          itemCount="account"
          onConfirm={handleDeleteAccount}
          onClose={() => setShowDeleteAccountModal(false)}
        />
      )}
    </>
  );
}