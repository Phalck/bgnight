'use client';

import { useState } from 'react';
import { PlayerSelector } from './PlayerSelector';
import styles from './EventDetailsForm.module.css';

interface Player {
  id: string;
  name: string;
}

interface EventDetailsFormProps {
  availablePlayers: Player[];
  eventDateTime: string;
  location: string;
  customMessage: string;
  selectedPlayers: Player[];
  onDateTimeChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onCustomMessageChange: (value: string) => void;
  onPlayersChange: (players: Player[]) => void;
  onAddPlayer: (name: string) => Promise<Player | null>;
  onGenerateInvite: () => void;
}

export function EventDetailsForm({
  availablePlayers,
  eventDateTime,
  location,
  customMessage,
  selectedPlayers,
  onDateTimeChange,
  onLocationChange,
  onCustomMessageChange,
  onPlayersChange,
  onAddPlayer,
  onGenerateInvite,
}: EventDetailsFormProps) {
  // datetime-local input returns/expects format: YYYY-MM-DDTHH:mm
  // No conversion needed - use the string value directly to avoid timezone issues
  const formatDateTimeForInput = (value: string) => {
    return value || '';
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Event Details</h3>
      
      <div className={styles.form}>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor="eventDateTime">Date & Time</label>
            <input
              type="datetime-local"
              id="eventDateTime"
              value={formatDateTimeForInput(eventDateTime)}
              onChange={(e) => onDateTimeChange(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="location">Location</label>
            <input
              type="text"
              id="location"
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              placeholder="e.g., My House, Game Cafe"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label>Players</label>
          <PlayerSelector
            availablePlayers={availablePlayers}
            selectedPlayers={selectedPlayers}
            onChange={onPlayersChange}
            onAddPlayer={onAddPlayer}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="customMessage">Custom Message (Optional)</label>
          <textarea
            id="customMessage"
            value={customMessage}
            onChange={(e) => onCustomMessageChange(e.target.value)}
            placeholder="Add a personal message to your invite..."
            rows={3}
            className={styles.textarea}
          />
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.generateBtn} onClick={onGenerateInvite}>
          Generate Invite
        </button>
      </div>
    </div>
  );
}
