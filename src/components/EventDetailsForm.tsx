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
  selectedPlayers: Player[];
  inviteExpiration: number;
  saving?: boolean;
  onDateTimeChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onPlayersChange: (players: Player[]) => void;
  onAddPlayer: (name: string) => Promise<Player | null>;
  onInviteExpirationChange: (value: number) => void;
  onSave: () => void;
  onCancel: () => void;
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
  selectedPlayers,
  inviteExpiration,
  saving = false,
  onDateTimeChange,
  onLocationChange,
  onPlayersChange,
  onAddPlayer,
  onInviteExpirationChange,
  onSave,
  onCancel,
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
        <button
          className={styles.cancelBtn}
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          className={styles.generateBtn}
          onClick={onSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save & Close'}
        </button>
      </div>
    </div>
  );
}
