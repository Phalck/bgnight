'use client';

import { useState, useRef } from 'react';
import { useToast } from '@/components/Toast';
import styles from './RestoreModal.module.css';

interface Conflict {
  item: {
    title: string;
    bggId?: string;
  };
  type: string;
}

interface RestoreModalProps {
  type: 'collection' | 'plays';
  onClose: () => void;
}

export function RestoreModal({ type, onClose }: RestoreModalProps) {
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'upload' | 'conflicts' | 'restoring'>('upload');
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [conflictResolutions, setConflictResolutions] = useState<Map<number, 'skip' | 'replace' | 'keepBoth'>>(new Map());
  const [restoredCount, setRestoredCount] = useState(0);
  const [error, setError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/json' && !selectedFile.name.endsWith('.json')) {
        setError('Please select a valid JSON file');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const analyzeFile = async () => {
    if (!file) return;

    try {
      const content = await file.text();
      const backupData = JSON.parse(content);

      const response = await fetch(`/api/restore/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games: backupData.games }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to analyze file');
      }

      if (result.conflicts && result.conflicts.length > 0) {
        setConflicts(result.conflicts);
        setStep('conflicts');
      } else {
        await performRestore(backupData);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze file';
      setError(errorMessage);
    }
  };

  const performRestore = async (backupData: { games: unknown[] }) => {
    setStep('restoring');

    try {
      // Get a single conflict resolution strategy
      // If no conflicts or multiple different resolutions, default to 'skip'
      let conflictResolution: 'skip' | 'replace' | 'keepBoth' = 'skip';
      if (conflictResolutions.size > 0) {
        const resolutions = Array.from(conflictResolutions.values());
        const firstResolution = resolutions[0];
        // Only use the resolution if all conflicts have the same resolution
        if (resolutions.every(r => r === firstResolution)) {
          conflictResolution = firstResolution;
        }
      }

      const response = await fetch(`/api/restore/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          games: backupData.games,
          conflictResolution
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to restore');
      }

      setRestoredCount(result.restoredCount || 0);
      addToast(`Successfully restored ${result.restoredCount} ${type === 'collection' ? 'games' : 'plays'}!`, 'success');
      
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1500);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore';
      setError(errorMessage);
      setStep('upload');
    }
  };

  const handleConflictResolution = (index: number, resolution: 'skip' | 'replace' | 'keepBoth') => {
    const newResolutions = new Map(conflictResolutions);
    newResolutions.set(index, resolution);
    setConflictResolutions(newResolutions);
  };

  const handleResolveConflicts = () => {
    if (conflicts.length > 0 && conflictResolutions.size < conflicts.length) {
      setError('Please resolve all conflicts before continuing');
      return;
    }

    file?.text().then(content => {
      const backupData = JSON.parse(content);
      performRestore(backupData);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.type !== 'application/json' && !droppedFile.name.endsWith('.json')) {
        setError('Please drop a valid JSON file');
        return;
      }
      setFile(droppedFile);
      setError('');
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {step === 'upload' && `Restore ${type === 'collection' ? 'Collection' : 'Logged Plays'}`}
            {step === 'conflicts' && 'Resolve Conflicts'}
            {step === 'restoring' && 'Restoring...'}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalContent}>
          {error && <p className={styles.error}>{error}</p>}

          {step === 'upload' && (
            <>
              <p className={styles.description}>
                Upload a JSON backup file to restore your {type === 'collection' ? 'game collection' : 'play logs'}.
              </p>

              <div 
                className={styles.dropZone}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className={styles.fileInput}
                />
                <div className={styles.dropZoneContent}>
                  <span className={styles.dropZoneIcon}>📁</span>
                  <p className={styles.dropZoneText}>
                    {file ? file.name : 'Click to select or drag & drop a JSON file'}
                  </p>
                  {file && (
                    <p className={styles.fileSize}>
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {step === 'conflicts' && (
            <>
              <p className={styles.description}>
                The following items already exist in your {type}. Choose how to handle each:
              </p>

              <div className={styles.conflictsList}>
                {conflicts.map((conflict, index) => (
                  <div key={index} className={styles.conflictItem}>
                    <div className={styles.conflictInfo}>
                      <span className={styles.conflictTitle}>{conflict.item.title}</span>
                      {conflict.item.bggId && (
                        <span className={styles.conflictBggId}>BGG ID: {conflict.item.bggId}</span>
                      )}
                    </div>
                    <div className={styles.conflictActions}>
                      <button
                        className={`${styles.conflictBtn} ${conflictResolutions.get(index) === 'skip' ? styles.active : ''}`}
                        onClick={() => handleConflictResolution(index, 'skip')}
                      >
                        Skip
                      </button>
                      <button
                        className={`${styles.conflictBtn} ${conflictResolutions.get(index) === 'replace' ? styles.active : ''}`}
                        onClick={() => handleConflictResolution(index, 'replace')}
                      >
                        Replace
                      </button>
                      <button
                        className={`${styles.conflictBtn} ${conflictResolutions.get(index) === 'keepBoth' ? styles.active : ''}`}
                        onClick={() => handleConflictResolution(index, 'keepBoth')}
                      >
                        Keep Both
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 'restoring' && (
            <div className={styles.restoringState}>
              <div className={styles.spinner}></div>
              <p className={styles.restoringText}>Restoring your {type}...</p>
              {restoredCount > 0 && (
                <p className={styles.successMessage}>
                  ✓ Restored {restoredCount} {type === 'collection' ? 'games' : 'plays'} successfully!
                </p>
              )}
            </div>
          )}
        </div>

        {step !== 'restoring' && (
          <div className={styles.modalActions}>
            <button 
              type="button" 
              className={styles.cancelBtn}
              onClick={onClose}
            >
              Cancel
            </button>
            {step === 'upload' && (
              <button 
                type="button" 
                className={styles.continueBtn}
                onClick={analyzeFile}
                disabled={!file}
              >
                Continue
              </button>
            )}
            {step === 'conflicts' && (
              <button 
                type="button" 
                className={styles.continueBtn}
                onClick={handleResolveConflicts}
                disabled={conflicts.length > 0 && conflictResolutions.size < conflicts.length}
              >
                Restore
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
