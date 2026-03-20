'use client';

import { useState } from 'react';
import styles from './page.module.css';

interface ApprovalViewProps {
  games: Array<{
    gameId: string;
    title: string;
    editedFields: string[];
  }>;
  onApprove: (approvedGameIds: string[]) => void;
  onCancel: () => void;
}

export function ApprovalView({ games, onApprove, onCancel }: ApprovalViewProps) {
  const [approvedIds, setApprovedIds] = useState<string[]>([]);
  
  const toggleApproval = (gameId: string) => {
    setApprovedIds(prev => 
      prev.includes(gameId)
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId]
    );
  };
  
  const selectAll = () => {
    setApprovedIds(games.map(g => g.gameId));
  };
  
  const selectNone = () => {
    setApprovedIds([]);
  };
  
  return (
    <div className={styles.viewContainer}>
      <h2 className={styles.viewTitle}>Approve Manual Edits</h2>
      
      <p className={styles.sectionTitle}>
        Select which games to update from BGG:
      </p>
      
      <div className={styles.gamesList}>
        {games.map(game => (
          <div key={game.gameId} className={styles.gameItem}>
            <input
              type="checkbox"
              checked={approvedIds.includes(game.gameId)}
              onChange={() => toggleApproval(game.gameId)}
            />
            <div className={styles.gameInfo}>
              <div className={styles.gameTitle}>{game.title}</div>
              <div className={styles.gameMeta}>
                Edited fields: {game.editedFields.join(', ')}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className={styles.actions}>
        <button 
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={selectAll}
        >
          Select All
        </button>
        <button 
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={selectNone}
        >
          Select None
        </button>
      </div>
      
      <div className={styles.actions} style={{ marginTop: '2rem' }}>
        <button 
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button 
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={() => onApprove(approvedIds)}
          disabled={approvedIds.length === 0}
        >
          Update Selected ({approvedIds.length})
        </button>
      </div>
    </div>
  );
}