'use client';

import { useState } from 'react';
import styles from './InviteGenerator.module.css';

interface SuggestedGame {
  id: string;
  title: string;
  minPlayers: number;
  maxPlayers: number;
  maxPlayTime?: number | null;
}

interface YouTubeVideo {
  id: string;
  title: string;
}

interface Player {
  id: string;
  name: string;
}

interface InviteGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGames: SuggestedGame[];
  selectedVideos: Map<string, YouTubeVideo>;
  eventDateTime: string;
  location: string;
  customMessage: string;
  selectedPlayers: Player[];
  onSave: () => void;
  onDontSave: () => void;
}

export function InviteGenerator({
  isOpen,
  onClose,
  selectedGames,
  selectedVideos,
  eventDateTime,
  location,
  customMessage,
  selectedPlayers,
  onSave,
  onDontSave,
}: InviteGeneratorProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const formatDateTime = (datetimeString: string) => {
    if (!datetimeString) return '';
    // Parse the datetime string (YYYY-MM-DDTHH:mm) manually to avoid timezone issues
    const [datePart, timePart] = datetimeString.split('T');
    if (!datePart || !timePart) return '';
    
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    
    // Create date using local timezone
    const date = new Date(year, month - 1, day, hours, minutes);
    
    return date.toLocaleString('sv-SE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatPlayers = (min: number, max: number) => {
    if (min === max) return `${min} players`;
    return `${min}-${max} players`;
  };

  const generateInviteText = () => {
    const gamesList = selectedGames.map((game, index) => {
      const video = selectedVideos.get(game.id);
      return `${index + 1}. ${game.title}
   👥 ${formatPlayers(game.minPlayers, game.maxPlayers)}
   ⏱️ ${game.maxPlayTime || '?'} minutes${video ? `
   📺 How to play: https://youtube.com/watch?v=${video.id}` : ''}`;
    }).join('\n\n');

    return `🎲 Game Night Invitation! 🎲

${customMessage ? customMessage + '\n\n' : ''}Hey everyone! Let's play some board games:

${gamesList}

${eventDateTime ? `📅 When: ${formatDateTime(eventDateTime)}\n` : ''}${location ? `📍 Where: ${location}\n` : ''}${selectedPlayers.length > 0 ? `👥 Who's coming: ${selectedPlayers.map(p => p.name).join(', ')}\n` : ''}
Looking forward to seeing you all there!

Sent via Board Game Night App 🎲`;
  };

  const inviteText = generateInviteText();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Your Game Night Invite</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.previewContainer}>
            <pre className={styles.preview}>{inviteText}</pre>
          </div>

          <button 
            className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
            onClick={handleCopy}
          >
            {copied ? '✓ Copied!' : '📋 Copy to Clipboard'}
          </button>
        </div>

        <div className={styles.modalActions}>
          <button className={styles.dontSaveBtn} onClick={onDontSave}>
            Close & Don't Save
          </button>
          <button className={styles.saveBtn} onClick={onSave}>
            💾 Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
