'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { LogPlayModal } from '@/components/LogPlayModal';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/components/Toast';
import * as api from '@/lib/api-client';
import styles from './page.module.css';

interface Player {
  id: string;
  name: string;
}

interface PlannedGame {
  id: string;
  game: {
    id: string;
    title: string;
    thumbnail?: string | null;
    minPlayers: number;
    maxPlayers: number;
    maxPlayTime?: number | null;
  };
  youtubeVideoId?: string;
  youtubeVideoTitle?: string;
  youtubeVideoUrl?: string;
  order: number;
}

interface PlannedNight {
  id: string;
  plannedAt: string;
  eventDateTime?: string;
  location?: string;
  customMessage?: string;
  games: PlannedGame[];
  players: Player[];
}

interface GameForLog {
  id: string;
  title: string;
}

export default function PlannedNightsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { addToast } = useToast();
  
  const [plannedNights, setPlannedNights] = useState<PlannedNight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Track which games have been logged
  const [loggedGameIds, setLoggedGameIds] = useState<Set<string>>(new Set());
  
  // Log play modal state
  const [players, setPlayers] = useState<Player[]>([]);
  const [loggingGame, setLoggingGame] = useState<GameForLog | null>(null);
  const [preFillDate, setPreFillDate] = useState('');
  const [preFillLocation, setPreFillLocation] = useState('');
  const [showLogModal, setShowLogModal] = useState(false);

  const fetchPlannedNights = useCallback(async () => {
    try {
      const data = await api.get<PlannedNight[]>('/api/planned-nights');
      setPlannedNights(data);
      setError(null);
    } catch (err) {
      const message = api.getErrorMessage(err);
      setError(message);
      addToast(message, 'error');
    }
  }, [addToast]);

  const fetchPlayers = useCallback(async () => {
    try {
      const data = await api.get<Player[]>('/api/players');
      setPlayers(data);
    } catch (err) {
      const message = api.getErrorMessage(err);
      addToast(message, 'error');
    }
  }, [addToast]);

  const fetchLoggedGames = useCallback(async () => {
    try {
      const plays = await api.get<{ gameId: string }[]>('/api/plays');
      // Extract unique game IDs that have been logged
      const gameIds = new Set<string>(plays.map((play) => play.gameId));
      setLoggedGameIds(gameIds);
    } catch (err) {
      const message = api.getErrorMessage(err);
      addToast(message, 'error');
    }
  }, [addToast]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      Promise.all([fetchPlannedNights(), fetchPlayers(), fetchLoggedGames()]).then(() => {
        setLoading(false);
      });
    }
  }, [status, router, fetchPlannedNights, fetchPlayers, fetchLoggedGames]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this planned game night?')) return;
    
    setDeletingId(id);
    try {
      await api.del(`/api/planned-nights/${id}`);
      setPlannedNights(prev => prev.filter(night => night.id !== id));
      addToast('Planned night deleted', 'success');
    } catch (err) {
      const message = api.getErrorMessage(err);
      addToast(message, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (datetimeString: string) => {
    // Parse the datetime string (YYYY-MM-DDTHH:mm) manually to avoid timezone issues
    const [datePart, timePart] = datetimeString.split('T');
    if (!datePart || !timePart) return '';
    
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    
    // Create date using local timezone
    const date = new Date(year, month - 1, day, hours, minutes);
    
    return date.toLocaleString('sv-SE', {
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

  const regenerateInvite = async (night: PlannedNight) => {
    const gamesList = night.games.map((plannedGame, index) => {
      const game = plannedGame.game;
      return `${index + 1}. ${game.title}
   👥 ${formatPlayers(game.minPlayers, game.maxPlayers)}
   ⏱️ ${game.maxPlayTime || '?'} minutes${plannedGame.youtubeVideoUrl ? `
   📺 How to play: ${plannedGame.youtubeVideoUrl}` : ''}`;
    }).join('\n\n');

    const inviteText = `🎲 Game Night Invitation! 🎲

${night.customMessage ? night.customMessage + '\n\n' : ''}Hey everyone! Let's play some board games:

${gamesList}

${night.eventDateTime ? `📅 When: ${formatDate(night.eventDateTime)}\n` : ''}${night.location ? `📍 Where: ${night.location}\n` : ''}${night.players.length > 0 ? `👥 Who's coming: ${night.players.map(p => p.name).join(', ')}\n` : ''}
Looking forward to seeing you all there!

Sent via Board Game Night App 🎲`;

    try {
      await navigator.clipboard.writeText(inviteText);
      addToast('Invite copied to clipboard!', 'success');
    } catch (err) {
      addToast('Failed to copy invite', 'error');
    }
  };

  const handleLogPlay = (game: PlannedGame['game'], night: PlannedNight) => {
    setLoggingGame({ id: game.id, title: game.title });
    // Use the planned night date if available, otherwise use current date
    if (night.eventDateTime) {
      // Parse the datetime string (YYYY-MM-DDTHH:mm) manually to avoid timezone issues
      const [datePart] = night.eventDateTime.split('T');
      setPreFillDate(datePart || new Date().toISOString().split('T')[0]);
    } else {
      setPreFillDate(new Date().toISOString().split('T')[0]);
    }
    setPreFillLocation(night.location || '');
    setShowLogModal(true);
  };

  const handleAddPlayer = async (name: string): Promise<Player | null> => {
    try {
      const newPlayer = await api.post<Player>('/api/players', { name });
      setPlayers(prev => [...prev, newPlayer]);
      addToast(`Player "${name}" added`, 'success');
      return newPlayer;
    } catch (err) {
      const message = api.getErrorMessage(err);
      addToast(message, 'error');
      return null;
    }
  };

  const handleSavePlay = async (playData: {
    playedAt: string;
    playerIds: string[];
    newPlayers: string[];
    winnerIds: string[];
    duration?: number;
    location?: string;
    rating?: number;
    notes?: string;
  }) => {
    if (!loggingGame) return;
    
    try {
      await api.post(`/api/games/${loggingGame.id}/plays`, playData);
      
      setShowLogModal(false);
      setLoggingGame(null);
      // Add game to logged games set
      setLoggedGameIds(prev => new Set([...prev, loggingGame.id]));
      // Refresh players to get any newly created ones
      await fetchPlayers();
      addToast('Play logged successfully!', 'success');
    } catch (err) {
      const message = api.getErrorMessage(err);
      addToast(message, 'error');
      throw err;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.loadingContainer}>
              <LoadingSpinner size="large" />
              <p className={styles.loadingText}>Loading your planned nights...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.errorContainer}>
              <div className={styles.errorIcon}>⚠️</div>
              <h2 className={styles.errorTitle}>Failed to Load Planned Nights</h2>
              <p className={styles.errorMessage}>{error}</p>
              <button 
                className={styles.retryBtn}
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  Promise.all([fetchPlannedNights(), fetchPlayers(), fetchLoggedGames()]).then(() => {
                    setLoading(false);
                  });
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Planned BGNs</h1>
              <p className={styles.subtitle}>Your planned board game nights</p>
            </div>
            <a href="/plan" className={styles.planBtn}>+ Plan New Night</a>
          </div>

          {plannedNights.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>📅</span>
              <h2>No planned game nights yet!</h2>
              <p>Start planning your next board game night.</p>
              <a href="/plan" className={styles.planBtn}>Plan a Game Night →</a>
            </div>
          ) : (
            <div className={styles.nightsList}>
              {plannedNights.map(night => {
                // Check if all games in this night have been logged
                const allGamesLogged = night.games.length > 0 && night.games.every(
                  plannedGame => loggedGameIds.has(plannedGame.game.id)
                );
                
                return (
                  <div key={night.id} className={styles.nightCard}>
                    <div className={styles.nightHeader}>
                      <div>
                        <h3 className={styles.nightTitle}>
                          {night.eventDateTime 
                            ? formatDate(night.eventDateTime)
                            : 'Game Night Plan'
                          }
                        </h3>
                        <p className={styles.nightMeta}>
                          Planned on {new Date(night.plannedAt).toLocaleDateString()}
                          {night.location && ` • ${night.location}`}
                        </p>
                      </div>
                      <div className={styles.nightActions}>
                        <button
                          className={styles.copyBtn}
                          onClick={() => regenerateInvite(night)}
                          title="Copy invite to clipboard"
                        >
                          📋
                        </button>
                        <button
                          className={styles.cancelBtn}
                          onClick={() => handleDelete(night.id)}
                          disabled={deletingId === night.id}
                          title="Cancel this planned game night"
                        >
                          {deletingId === night.id ? (
                            <LoadingSpinner size="small" />
                          ) : 'Cancel'}
                        </button>
                        {allGamesLogged && (
                          <button
                            className={styles.removeCompletedBtn}
                            onClick={() => handleDelete(night.id)}
                            disabled={deletingId === night.id}
                            title="Remove completed game night"
                          >
                            {deletingId === night.id ? (
                              <LoadingSpinner size="small" />
                            ) : 'Remove'}
                          </button>
                        )}
                      </div>
                    </div>

                    {night.customMessage && (
                      <p className={styles.customMessage}>{night.customMessage}</p>
                    )}

                    <div className={styles.gamesList}>
                      {night.games.map(plannedGame => {
                        const isLogged = loggedGameIds.has(plannedGame.game.id);
                        
                        return (
                          <div key={plannedGame.id} className={`${styles.gameItem} ${isLogged ? styles.loggedGame : ''}`}>
                            {plannedGame.game.thumbnail ? (
                              <img 
                                src={plannedGame.game.thumbnail} 
                                alt={plannedGame.game.title}
                                className={styles.gameThumb}
                              />
                            ) : (
                              <div className={styles.gamePlaceholder}>🎲</div>
                            )}
                            <div className={styles.gameInfo}>
                              <h4 className={styles.gameTitle}>
                                {plannedGame.game.title}
                                {isLogged && <span className={styles.loggedBadge}>✓ Play Logged</span>}
                              </h4>
                              <p className={styles.gameMeta}>
                                {formatPlayers(plannedGame.game.minPlayers, plannedGame.game.maxPlayers)}
                                {plannedGame.game.maxPlayTime && ` • ${plannedGame.game.maxPlayTime} min`}
                              </p>
                              {plannedGame.youtubeVideoUrl && (
                                <a 
                                  href={plannedGame.youtubeVideoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.videoLink}
                                >
                                  📺 How to play
                                </a>
                              )}
                            </div>
                            {!isLogged && (
                              <button
                                className={styles.logPlayBtn}
                                onClick={() => handleLogPlay(plannedGame.game, night)}
                                title="Log a play for this game"
                              >
                                Log Play
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {night.players.length > 0 && (
                      <div className={styles.playersSection}>
                        <span className={styles.playersLabel}>Players:</span>
                        <span className={styles.playersList}>
                          {night.players.map(p => p.name).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {showLogModal && loggingGame && (
        <LogPlayModal
          game={loggingGame}
          availablePlayers={players}
          onClose={() => {
            setShowLogModal(false);
            setLoggingGame(null);
          }}
          onSave={handleSavePlay}
          onAddPlayer={handleAddPlayer}
          preFillDate={preFillDate}
          preFillLocation={preFillLocation}
        />
      )}
    </>
  );
}
