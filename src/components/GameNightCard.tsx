'use client';

import { useState } from 'react';
import { StarRating } from './StarRating';
import styles from './GameNightCard.module.css';

interface Player {
  id: string;
  name: string;
}

interface Game {
  id: string;
  title: string;
  thumbnail?: string | null;
}

interface PlayLog {
  id: string;
  game: Game;
  playedAt: string;
  players: Player[];
  winners: Player[];
  duration?: number;
  location?: string;
  rating?: number;
  notes?: string;
}

interface GameNightCardProps {
  date: string;
  plays: PlayLog[];
  onDeletePlay: (playId: string) => Promise<void>;
  onEditPlay?: (play: PlayLog) => void;
}

export function GameNightCard({ date, plays, onDeletePlay, onEditPlay }: GameNightCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if it's today or yesterday
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const totalDuration = plays.reduce((sum, play) => sum + (play.duration || 0), 0);
  
  const allPlayers = Array.from(new Set(
    plays.flatMap(play => play.players.map(p => p.name))
  ));

  const uniqueLocations = Array.from(new Set(
    plays.map(play => play.location).filter(Boolean)
  ));

  const handleDelete = async (playId: string) => {
    if (!confirm('Are you sure you want to delete this play log?')) return;
    
    setDeletingId(playId);
    try {
      await onDeletePlay(playId);
    } catch (error) {
      console.error('Failed to delete play:', error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.headerMain}>
          <h3 className={styles.date}>{formatDate(date)}</h3>
          <div className={styles.meta}>
            <span className={styles.metaItem}>🎲 {plays.length} game{plays.length !== 1 ? 's' : ''}</span>
            {totalDuration > 0 && (
              <span className={styles.metaItem}>⏱️ {Math.floor(totalDuration / 60)}h {totalDuration % 60}m</span>
            )}
          </div>
        </div>
        <button 
          type="button"
          className={styles.expandBtn}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? '▲ Collapse' : '▼ Expand'}
        </button>
      </div>

      <div className={styles.gamesPreview}>
        {plays.map(play => (
          <div key={play.id} className={styles.gamePreview}>
            {play.game.thumbnail ? (
              <img 
                src={play.game.thumbnail} 
                alt={play.game.title}
                className={styles.gameThumb}
              />
            ) : (
              <div className={styles.gamePlaceholder}>🎲</div>
            )}
            <span className={styles.gameTitle}>{play.game.title}</span>
          </div>
        ))}
      </div>

      <div className={styles.playersSection}>
        <span className={styles.playersLabel}>Players:</span>
        <span className={styles.playersList}>{allPlayers.join(', ')}</span>
      </div>

      {uniqueLocations.length > 0 && (
        <div className={styles.locationSection}>
          <span className={styles.locationLabel}>📍</span>
          <span className={styles.locationValue}>{uniqueLocations.join(', ')}</span>
        </div>
      )}

      {expanded && (
        <div className={styles.expandedContent}>
          <h4 className={styles.detailsTitle}>Game Details</h4>
          {plays.map(play => (
            <div key={play.id} className={styles.playDetail}>
              <div className={styles.playHeader}>
                <h5 className={styles.playGameTitle}>{play.game.title}</h5>
                <div className={styles.actions}>
                  {onEditPlay && (
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() => onEditPlay(play)}
                      title="Edit play log"
                    >
                      ✏️
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(play.id)}
                    disabled={deletingId === play.id}
                    title="Delete play log"
                  >
                    {deletingId === play.id ? '...' : '🗑️'}
                  </button>
                </div>
              </div>

              <div className={styles.playInfo}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Players:</span>
                  <span className={styles.infoValue}>
                    {play.players.map(p => p.name).join(', ')}
                  </span>
                </div>

                {play.winners.length > 0 && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Winner(s):</span>
                    <span className={styles.infoValue}>
                      {play.winners.map(w => w.name).join(', ')}
                      <span className={styles.winnerIcon}>🏆</span>
                    </span>
                  </div>
                )}

                {play.duration && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Duration:</span>
                    <span className={styles.infoValue}>{play.duration} minutes</span>
                  </div>
                )}

                {play.location && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Location:</span>
                    <span className={styles.infoValue}>{play.location}</span>
                  </div>
                )}

                {play.rating !== null && play.rating !== undefined && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Rating:</span>
                    <StarRating value={play.rating} readOnly size="small" />
                  </div>
                )}

                {play.notes && (
                  <div className={styles.notesRow}>
                    <span className={styles.infoLabel}>Notes:</span>
                    <p className={styles.notesText}>{play.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
