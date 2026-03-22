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
  inviteExpiration: number;
  onDateTimeChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onCustomMessageChange: (value: string) => void;
  onPlayersChange: (players: Player[]) => void;
  onAddPlayer: (name: string) => Promise<Player | null>;
  onInviteExpirationChange: (value: number) => void;
  onGenerateInvite: () => void;
}

const EXPIRATION_OPTIONS = [
  { value: 4, label: '4 hours' },
  { value: 8, label: '8 hours' },
  { value: 24, label: '24 hours' },
  { value: 48, label: '48 hours' },
];

export function EventDetailsForm({
  availablePlayers,
  eventDateTime,
  location,
  customMessage,
  selectedPlayers,
  inviteExpiration,
  onDateTimeChange,
  onLocationChange,
  onCustomMessageChange,
  onPlayersChange,
  onAddPlayer,
  onInviteExpirationChange,
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

        <div className={styles.field}>
          <label htmlFor="inviteExpiration">Invite Link Expires After</label>
          <select
            id="inviteExpiration"
            value={inviteExpiration}
            onChange={(e) => onInviteExpirationChange(Number(e.target.value))}
            className={styles.select}
          >
            {EXPIRATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
