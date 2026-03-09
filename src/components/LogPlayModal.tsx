'use client';

import { useState } from 'react';
import { PlayerSelector } from './PlayerSelector';
import { WinnerSelector } from './WinnerSelector';
import { StarRating } from './StarRating';
import styles from './LogPlayModal.module.css';

interface Player {
  id: string;
  name: string;
}

interface Game {
  id: string;
  title: string;
}

interface LogPlayModalProps {
  game: Game;
  availablePlayers: Player[];
  onClose: () => void;
  onSave: (playData: {
    playedAt: string;
    playerIds: string[];
    newPlayers: string[];
    winnerIds: string[];
    duration?: number;
    location?: string;
    rating?: number;
    notes?: string;
  }) => Promise<void>;
  onAddPlayer: (name: string) => Promise<Player | null>;
  preFillDate?: string;
  preFillLocation?: string;
  preFillPlayers?: Player[];
  preFillWinners?: Player[];
  preFillDuration?: number;
  preFillRating?: number;
  preFillNotes?: string;
}

export function LogPlayModal({
  game,
  availablePlayers,
  onClose,
  onSave,
  onAddPlayer,
  preFillDate,
  preFillLocation,
  preFillPlayers,
  preFillWinners,
  preFillDuration,
  preFillRating,
  preFillNotes
}: LogPlayModalProps) {
  const [playedAt, setPlayedAt] = useState(() => {
    if (preFillDate) return preFillDate;
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>(preFillPlayers || []);
  const [winners, setWinners] = useState<Player[]>(preFillWinners || []);
  const [duration, setDuration] = useState(preFillDuration?.toString() || '');
  const [location, setLocation] = useState(preFillLocation || '');
  const [rating, setRating] = useState(preFillRating || 0);
  const [notes, setNotes] = useState(preFillNotes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handlePlayersChange = (players: Player[]) => {
    setSelectedPlayers(players);
    // Remove winners that are no longer in players
    setWinners(prev => prev.filter(w => players.find(p => p.id === w.id)));
  };

  const handleSave = async () => {
    if (selectedPlayers.length === 0) {
      setError('Please select at least one player');
      return;
    }

    setError('');
    setSaving(true);

    try {
      const existingPlayerIds = selectedPlayers
        .filter(p => availablePlayers.find(ap => ap.id === p.id))
        .map(p => p.id);
      
      const newPlayerNames = selectedPlayers
        .filter(p => !availablePlayers.find(ap => ap.id === p.id))
        .map(p => p.name);

      await onSave({
        playedAt,
        playerIds: existingPlayerIds,
        newPlayers: newPlayerNames,
        winnerIds: winners.map(w => w.id),
        duration: duration ? parseInt(duration) : undefined,
        location: location || undefined,
        rating: rating || undefined,
        notes: notes || undefined,
      });
      
      onClose();
    } catch (err) {
      setError('Failed to save play log');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Log a Play</h2>
          <p className={styles.gameName}>{game.title}</p>
          <button type="button" className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalContent}>
          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="playedAt">Date *</label>
              <input
                type="date"
                id="playedAt"
                value={playedAt}
                onChange={(e) => setPlayedAt(e.target.value)}
                required
              />
            </div>

            <div className={styles.field}>
              <label>Players *</label>
              <PlayerSelector
                availablePlayers={availablePlayers}
                selectedPlayers={selectedPlayers}
                onChange={handlePlayersChange}
                onAddPlayer={onAddPlayer}
              />
            </div>

            <div className={styles.field}>
              <label>Winners</label>
              <WinnerSelector
                players={selectedPlayers}
                winners={winners}
                onChange={setWinners}
              />
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="duration">Duration (minutes)</label>
                <input
                  type="number"
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g., 90"
                  min="1"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="location">Location</label>
                <input
                  type="text"
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Game Cafe"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label>Rating</label>
              <StarRating value={rating} onChange={setRating} />
            </div>

            <div className={styles.field}>
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes about the game..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className={styles.modalActions}>
          <button 
            type="button" 
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving || selectedPlayers.length === 0}
          >
            {saving ? 'Saving...' : 'Save Play'}
          </button>
        </div>
      </div>
    </div>
  );
}
