'use client';

import styles from './WinnerSelector.module.css';

interface Player {
  id: string;
  name: string;
}

interface WinnerSelectorProps {
  players: Player[];
  winners: Player[];
  onChange: (winners: Player[]) => void;
}

export function WinnerSelector({ players, winners, onChange }: WinnerSelectorProps) {
  if (players.length === 0) {
    return (
      <div className={styles.container}>
        <p className={styles.hint}>Select players first to choose winners</p>
      </div>
    );
  }

  const handleToggleWinner = (player: Player) => {
    const isWinner = winners.find(w => w.id === player.id);
    if (isWinner) {
      onChange(winners.filter(w => w.id !== player.id));
    } else {
      onChange([...winners, player]);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.checkboxList}>
        {players.map(player => {
          const isWinner = winners.find(w => w.id === player.id);
          return (
            <label 
              key={player.id} 
              className={`${styles.checkbox} ${isWinner ? styles.selected : ''}`}
            >
              <input
                type="checkbox"
                checked={!!isWinner}
                onChange={() => handleToggleWinner(player)}
              />
              <span className={styles.playerName}>{player.name}</span>
              {isWinner && <span className={styles.winnerBadge}>🏆</span>}
            </label>
          );
        })}
      </div>
      {winners.length > 0 && (
        <p className={styles.summary}>
          {winners.length} winner{winners.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}
