'use client';

import { useState } from 'react';
import styles from './BackupModal.module.css';

interface BackupModalProps {
  type: 'collection' | 'plays';
  onClose: () => void;
}

export function BackupModal({ type, onClose }: BackupModalProps) {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupData, setBackupData] = useState<{ games?: unknown[]; plays?: unknown[] } | null>(null);

  const handleBackup = async () => {
    setIsBackingUp(true);
    
    try {
      const response = await fetch(`/api/backup/${type}`);
      if (!response.ok) throw new Error('Failed to backup');
      
      const data = await response.json();
      setBackupData(data);
      
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
    } catch (error) {
      console.error('Backup failed:', error);
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            Backup {type === 'collection' ? 'Collection' : 'Logged Plays'}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalContent}>
          {isBackingUp ? (
            <div className={styles.backingUpState}>
              <div className={styles.spinner}></div>
              <p>Creating backup...</p>
            </div>
          ) : backupData ? (
            <div className={styles.successState}>
              <div className={styles.successIcon}>✓</div>
              <p>Backup downloaded successfully!</p>
              <p className={styles.fileInfo}>
                {type === 'collection' 
                  ? `${backupData.games?.length || 0} games backed up`
                  : `${backupData.plays?.length || 0} plays backed up`
                }
              </p>
            </div>
          ) : (
            <>
              <p className={styles.description}>
                Create a backup of your {type === 'collection' ? 'game collection' : 'play logs'} 
                as a JSON file. This file can be used to restore your data later.
              </p>
              <button 
                className={styles.backupBtn}
                onClick={handleBackup}
              >
                📥 Download Backup
              </button>
            </>
          )}
        </div>

        <div className={styles.modalActions}>
          <button 
            type="button" 
            className={styles.closeBtn2}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
