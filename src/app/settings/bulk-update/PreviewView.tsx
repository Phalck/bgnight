'use client';

import { useState } from 'react';
import styles from './page.module.css';

interface PreviewViewProps {
  data: {
    preview?: {
      totalGames: number;
      gamesWithBggId: number;
      gamesNeedingSearch: number;
      gamesWithManualEdits: number;
      manualEditGames: Array<{
        gameId: string;
        title: string;
        editedFields: string[];
        editedAt: Date;
      }>;
    };
    existingSession?: {
      id: string;
      status: string;
      canResume: boolean;
      progress: {
        total: number;
        processed: number;
        percentComplete: number;
      };
    };
  };
  onStart: (overwriteManual: boolean, retryStrategy: string) => void;
  onResume: (sessionId: string) => void;
}

export function PreviewView({ data, onStart, onResume }: PreviewViewProps) {
  const [overwriteManual, setOverwriteManual] = useState(false);
  const [retryStrategy, setRetryStrategy] = useState('skip');

  if (data.existingSession) {
    return (
      <div className={styles.viewContainer}>
        <h2 className={styles.viewTitle}>Active Session Found</h2>
        
        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Status:</span>
            <span className={styles.summaryValue}>
              {data.existingSession.status === 'paused' ? 'Paused' : 'In Progress'}
            </span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Progress:</span>
            <span className={styles.summaryValue}>
              {data.existingSession.progress.processed} of {data.existingSession.progress.total} games
            </span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Complete:</span>
            <span className={styles.summaryValue}>
              {data.existingSession.progress.percentComplete}%
            </span>
          </div>
        </div>
        
        <div className={styles.actions}>
          {data.existingSession.canResume && (
            <button 
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={() => onResume(data.existingSession!.id)}
            >
              Resume Update
            </button>
          )}
          <button 
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => onStart(false, 'skip')}
          >
            Start New Update
          </button>
        </div>
      </div>
    );
  }

  const preview = data.preview;
  
  if (!preview) {
    return (
      <div className={styles.viewContainer}>
        <p>Error loading preview</p>
      </div>
    );
  }

  return (
    <div className={styles.viewContainer}>
      <h2 className={styles.viewTitle}>Update Preview</h2>
      
      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Total games in collection:</span>
          <span className={styles.summaryValue}>{preview.totalGames}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Will auto-match:</span>
          <span className={styles.summaryValue}>{preview.gamesWithBggId} games</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Need BGG search:</span>
          <span className={styles.summaryValue}>{preview.gamesNeedingSearch} games</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Have manual edits:</span>
          <span className={styles.summaryValue}>{preview.gamesWithManualEdits} games</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Estimated time:</span>
          <span className={styles.summaryValue}>
            {Math.ceil(preview.totalGames * 5 / 60)}-{Math.ceil(preview.totalGames * 10 / 60)} minutes
          </span>
        </div>
      </div>
      
      {preview.manualEditGames.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Games with Manual Edits</h3>
          <div className={styles.gamesList}>
            {preview.manualEditGames.map(game => (
              <div key={game.gameId} className={styles.gameItem}>
                <span className={styles.gameTitle}>{game.title}</span>
                <span className={styles.gameMeta}>
                  Edited: {game.editedFields.join(', ')}
                </span>
              </div>
            ))}
          </div>
          
          <div className={styles.options}>
            <div className={styles.optionGroup}>
              <div className={styles.optionGroupTitle}>How should we handle manually edited games?</div>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  checked={overwriteManual}
                  onChange={() => setOverwriteManual(true)}
                />
                Overwrite all without asking
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  checked={!overwriteManual}
                  onChange={() => setOverwriteManual(false)}
                />
                Pause and ask for approval
              </label>
            </div>
            
            <div className={styles.optionGroup}>
              <div className={styles.optionGroupTitle}>What should happen if a game fails?</div>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  checked={retryStrategy === 'retry'}
                  onChange={() => setRetryStrategy('retry')}
                />
                Retry automatically (up to 3 times)
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  checked={retryStrategy === 'skip'}
                  onChange={() => setRetryStrategy('skip')}
                />
                Skip and show list at the end
              </label>
            </div>
          </div>
        </div>
      )}
      
      <div className={styles.actions}>
        <button 
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={() => onStart(overwriteManual, retryStrategy)}
        >
          Start Bulk Update
        </button>
      </div>
    </div>
  );
}