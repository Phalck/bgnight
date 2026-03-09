'use client';

import { useState, useEffect } from 'react';
import { StarRating } from './StarRating';
import styles from './PlayHistoryModal.module.css';

interface Player {
  id: string;
  name: string;
}

interface PlayLog {
  id: string;
  playedAt: string;
  players: Player[];
  winners: Player[];
  duration?: number;
  location?: string;
  rating?: number;
  notes?: string;
}

interface Game {
  id: string;
  title: string;
  thumbnail?: string | null;
}

interface PlayHistoryModalProps {
  game: Game;
  onClose: () => void;
  onLogNewPlay: () => void;
  onDeletePlay: (playId: string) => Promise<void>;
}

export function PlayHistoryModal({ 
  game, 
  onClose, 
  onLogNewPlay,
  onDeletePlay 
}: PlayHistoryModalProps) {
  const [plays, setPlays] = useState<PlayLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPlays();
  }, [game.id]);

  const fetchPlays = async () => {
    try {
      const res = await fetch(`/api/games/${game.id}/plays`);
      if (res.ok) {
        const data = await res.json();
        setPlays(data);
      }
    } catch (error) {
      console.error('Failed to fetch plays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (playId: string) => {
    if (!confirm('Are you sure you want to delete this play log?')) return;
    
    setDeletingId(playId);
    try {
      await onDeletePlay(playId);
      setPlays(plays.filter(p => p.id !== playId));
    } catch (error) {
      console.error('Failed to delete play:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <h2 className={styles.modalTitle}>Play History</h2>
            <p className={styles.gameName}>{game.title}</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalContent}>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading plays...</p>
            </div>
          ) : plays.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyText}>No plays logged yet for this game</p>
              <p className={styles.emptyHint}>Click "Log a Play" to record your first game night!</p>
            </div>
          ) : (
            <div className={styles.playsList}>
              {plays.map((play) => (
                <div key={play.id} className={styles.playItem}>
                  <div className={styles.playHeader}>
                    <span className={styles.playDate}>{formatDate(play.playedAt)}</span>
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

                  <div className={styles.playDetails}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Players:</span>
                      <span className={styles.detailValue}>
                        {play.players.map(p => p.name).join(', ')}
                      </span>
                    </div>

                    {play.winners.length > 0 && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Winner(s):</span>
                        <span className={styles.detailValue}>
                          {play.winners.map(w => w.name).join(', ')}
                          <span className={styles.winnerIcon}>🏆</span>
                        </span>
                      </div>
                    )}

                    {play.duration && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Duration:</span>
                        <span className={styles.detailValue}>{play.duration} minutes</span>
                      </div>
                    )}

                    {play.location && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Location:</span>
                        <span className={styles.detailValue}>{play.location}</span>
                      </div>
                    )}

                    {play.rating !== null && play.rating !== undefined && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Rating:</span>
                        <StarRating value={play.rating} readOnly size="small" />
                      </div>
                    )}

                    {play.notes && (
                      <div className={styles.notesSection}>
                        <span className={styles.detailLabel}>Notes:</span>
                        <p className={styles.notesText}>{play.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.modalActions}>
          <button 
            type="button" 
            className={styles.logPlayBtn}
            onClick={onLogNewPlay}
          >
            Log a Play
          </button>
        </div>
      </div>
    </div>
  );
}
