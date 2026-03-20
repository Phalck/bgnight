'use client';

import { useState } from 'react';
import styles from './page.module.css';

interface ResultsViewProps {
  data: {
    progress: {
      total: number;
      processed: number;
      autoMatched: number;
      manualApproved: number;
      skipped: number;
      failed: number;
    };
    skippedGames?: Array<{
      gameId: string;
      title: string;
      reason: string;
    }>;
    failedGames?: Array<{
      gameId: string;
      title: string;
      error: string;
    }>;
  };
  onRetryFailed: (gameIds: string[]) => void;
  onExport: () => void;
  onClose: () => void;
}

export function ResultsView({ data, onRetryFailed, onExport, onClose }: ResultsViewProps) {
  const { progress, skippedGames = [], failedGames = [] } = data;
  
  const [selectedFailed, setSelectedFailed] = useState<string[]>([]);
  
  const toggleFailedSelection = (gameId: string) => {
    setSelectedFailed(prev =>
      prev.includes(gameId)
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId]
    );
  };
  
  return (
    <div className={styles.viewContainer}>
      <h2 className={styles.viewTitle}>✓ Bulk Update Complete!</h2>
      
      <div className={styles.stats} style={{ marginBottom: '2rem' }}>
        <div className={styles.stat}>
          <div className={styles.statValue}>{progress.processed}</div>
          <div className={styles.statLabel}>Games Updated</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{progress.autoMatched}</div>
          <div className={styles.statLabel}>Auto-Matched</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{progress.manualApproved}</div>
          <div className={styles.statLabel}>Manual-Approved</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{progress.skipped}</div>
          <div className={styles.statLabel}>Skipped</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{progress.failed}</div>
          <div className={styles.statLabel}>Failed</div>
        </div>
      </div>
      
      {skippedGames.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Skipped Games</h3>
          <div className={styles.gamesList}>
            {skippedGames.map(game => (
              <div key={game.gameId} className={styles.gameItem}>
                <div className={styles.gameInfo}>
                  <div className={styles.gameTitle}>{game.title}</div>
                  <div className={styles.gameMeta}>{game.reason}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {failedGames.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Failed Games (Can Retry)</h3>
          <div className={styles.gamesList}>
            {failedGames.map(game => (
              <div key={game.gameId} className={styles.gameItem}>
                <input
                  type="checkbox"
                  checked={selectedFailed.includes(game.gameId)}
                  onChange={() => toggleFailedSelection(game.gameId)}
                />
                <div className={styles.gameInfo}>
                  <div className={styles.gameTitle}>{game.title}</div>
                  <div className={styles.gameMeta}>{game.error}</div>
                </div>
              </div>
            ))}
          </div>
          
          <div className={styles.actions}>
            <button
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={() => onRetryFailed(selectedFailed)}
              disabled={selectedFailed.length === 0}
            >
              Retry Selected ({selectedFailed.length})
            </button>
          </div>
        </div>
      )}
      
      <div className={styles.actions} style={{ marginTop: '2rem' }}>
        <button 
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={onExport}
        >
          Export Report (JSON)
        </button>
        <button 
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}