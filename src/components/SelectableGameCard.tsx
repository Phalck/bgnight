'use client';

import { useState } from 'react';
import styles from './SelectableGameCard.module.css';

interface SuggestedGame {
  id: string;
  title: string;
  thumbnail?: string | null;
  minPlayers: number;
  maxPlayers: number;
  maxPlayTime?: number | null;
  matchScore: number;
}

interface SelectableGameCardProps {
  game: SuggestedGame;
  selected: boolean;
  onToggle: () => void;
  showArtwork?: boolean;
}

export function SelectableGameCard({ game, selected, onToggle, showArtwork = true }: SelectableGameCardProps) {
  const formatPlayers = () => {
    if (game.minPlayers === game.maxPlayers) {
      return `${game.minPlayers} players`;
    }
    return `${game.minPlayers}-${game.maxPlayers} players`;
  };

  return (
    <div 
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      onClick={onToggle}
    >
      <div className={styles.checkboxContainer}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className={styles.checkbox}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      
      {showArtwork && (
        <div className={styles.imageContainer}>
          {game.thumbnail ? (
            <img src={game.thumbnail} alt={game.title} className={styles.image} />
          ) : (
            <div className={styles.placeholder}>
              <span>🎲</span>
            </div>
          )}
        </div>
      )}
      
      <div className={styles.content}>
        <h3 className={styles.title}>{game.title}</h3>
        <div className={styles.meta}>
          <span className={styles.metaItem}>{formatPlayers()}</span>
          {game.maxPlayTime && (
            <span className={styles.metaItem}>{game.maxPlayTime} min</span>
          )}
        </div>
        <div className={styles.matchScore}>
          <span className={styles.scoreValue}>{game.matchScore}%</span>
          <span className={styles.scoreLabel}>match</span>
        </div>
      </div>
      
      {selected && (
        <div className={styles.selectedIndicator}>
          ✓
        </div>
      )}
    </div>
  );
}
