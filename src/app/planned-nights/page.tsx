'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { LogPlayModal } from '@/components/LogPlayModal';
import { EditPlannedNightModal } from '@/components/EditPlannedNightModal';
import { InviteLinkManager } from '@/components/InviteLinkManager';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/components/Toast';
import * as api from '@/lib/api-client';
import styles from './page.module.css';

interface Player {
  id: string;
  name: string;
}

interface GameVote {
  playerId: string;
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
  votes?: GameVote[];
}

interface PlayerResponse {
  playerId: string;
  status: 'coming' | 'not_coming' | 'maybe';
  respondedAt: string;
}

interface PlannedNight {
  id: string;
  plannedAt: string;
  eventDateTime?: string;
  location?: string;
  customMessage?: string;
  games: PlannedGame[];
  players: Player[];
  playerResponses?: PlayerResponse[];
  inviteToken?: string | null;
  inviteExpiresAt?: string | null;
  inviteEnabled?: boolean;
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
  
  // Edit modal state
  const [editingNight, setEditingNight] = useState<PlannedNight | null>(null);
  interface GameWithDetails {
    id: string;
    title: string;
    thumbnail?: string | null;
    minPlayers: number;
    maxPlayers: number;
    maxPlayTime?: number | null;
  }
  const [availableGames, setAvailableGames] = useState<GameWithDetails[]>([]);
  const [loadingEditData, setLoadingEditData] = useState(false);

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

  const handleEdit = async (night: PlannedNight) => {
    setLoadingEditData(true);
    setEditingNight(night);
    
    try {
      // Load all user's games for the edit modal
      const games = await api.get<GameWithDetails[]>('/api/games');
      setAvailableGames(games);
    } catch (err) {
      const message = api.getErrorMessage(err);
      addToast(message, 'error');
      setEditingNight(null);
    } finally {
      setLoadingEditData(false);
    }
  };

  const handleSaveEdit = (updatedNight: PlannedNight) => {
    setPlannedNights(prev => 
      prev.map(night => night.id === updatedNight.id ? updatedNight : night)
    );
    setEditingNight(null);
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

  const getPlayerName = (night: PlannedNight, playerId: string) => {
    return night.players.find(p => p.id === playerId)?.name || '';
  };

  const getPlayersByStatus = (night: PlannedNight, status: 'coming' | 'not_coming' | 'maybe' | 'no_response') => {
    if (status === 'no_response') {
      const respondedIds = new Set(night.playerResponses?.map(r => r.playerId) || []);
      return night.players
        .filter(p => !respondedIds.has(p.id))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    
    const respondedPlayerIds = night.playerResponses
      ?.filter(r => r.status === status)
      .map(r => r.playerId) || [];
    
    return night.players
      .filter(p => respondedPlayerIds.includes(p.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const getVoterNamesForGame = (night: PlannedNight, game: PlannedGame) => {
    if (!game.votes || !night.players) return [];
    return game.votes
      .map(vote => getPlayerName(night, vote.playerId))
      .filter(name => name)
      .sort((a, b) => a.localeCompare(b));
  };

  const regenerateInvite = async (night: PlannedNight) => {
    const gamesList = night.games.map((plannedGame, index) => {
      const game = plannedGame.game;
      return `${index + 1}. ${game.title}
   👥 ${formatPlayers(game.minPlayers, game.maxPlayers)}
   ⏱️ ${game.maxPlayTime || '?'} minutes${plannedGame.youtubeVideoUrl ? `
   📺 How to play: ${plannedGame.youtubeVideoUrl}` : ''}`;
    }).join('\n\n');

    const inviteUrl = night.inviteToken ? `${window.location.origin}/invite/${night.inviteToken}` : '';
    
    const inviteText = `🎲 Game Night Invitation! 🎲

${night.customMessage ? night.customMessage + '\n\n' : ''}Hey everyone! Let's play some board games:

${gamesList}

${night.eventDateTime ? `📅 When: ${formatDate(night.eventDateTime)}\n` : ''}${night.location ? `📍 Where: ${night.location}\n` : ''}${night.players.length > 0 ? `👥 Who's coming: ${night.players.map(p => p.name).join(', ')}\n` : ''}
${inviteUrl ? `🔗 RSVP and vote on games here: ${inviteUrl}\n` : ''}
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
              <h1 className={styles.title}>My Planned BGNs</h1>
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
                          ✉️
                        </button>
                        <button
                          className={styles.editBtn}
                          onClick={() => handleEdit(night)}
                          disabled={loadingEditData}
                          title="Edit this planned game night"
                        >
                          ✏️
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
                        const voterNames = getVoterNamesForGame(night, plannedGame);
                        const voteCount = plannedGame.votes?.length || 0;
                        
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
                              <div className={styles.voteInfo}>
                                <span className={styles.voteCount}>👍 {voteCount} vote{voteCount !== 1 ? 's' : ''}</span>
                                {voterNames.length > 0 && (
                                  <span className={styles.voterNames}>{voterNames.join(', ')}</span>
                                )}
                              </div>
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

                    {/* RSVP Stats */}
                    <div className={styles.rsvpSection}>
                      <h4 className={styles.rsvpTitle}>RSVPs</h4>
                      <div className={styles.rsvpGrid}>
                        {/* Coming */}
                        <div className={styles.rsvpGroup}>
                          <h5 className={styles.rsvpGroupTitle + ' ' + styles.coming}>
                            ✅ Coming ({night.playerResponses?.filter(r => r.status === 'coming').length || 0})
                          </h5>
                          <div className={styles.rsvpPlayerList}>
                            {(() => {
                              const comingPlayers = getPlayersByStatus(night, 'coming');
                              return comingPlayers.length > 0 
                                ? comingPlayers.map(p => p.name).join(', ')
                                : <span className={styles.noPlayers}>None yet</span>;
                            })()}
                          </div>
                        </div>
                        
                        {/* Maybe */}
                        <div className={styles.rsvpGroup}>
                          <h5 className={styles.rsvpGroupTitle + ' ' + styles.maybe}>
                            🤔 Maybe ({night.playerResponses?.filter(r => r.status === 'maybe').length || 0})
                          </h5>
                          <div className={styles.rsvpPlayerList}>
                            {(() => {
                              const maybePlayers = getPlayersByStatus(night, 'maybe');
                              return maybePlayers.length > 0 
                                ? maybePlayers.map(p => p.name).join(', ')
                                : <span className={styles.noPlayers}>None yet</span>;
                            })()}
                          </div>
                        </div>
                        
                        {/* Not Coming */}
                        <div className={styles.rsvpGroup}>
                          <h5 className={styles.rsvpGroupTitle + ' ' + styles.notComing}>
                            ❌ Not Coming ({night.playerResponses?.filter(r => r.status === 'not_coming').length || 0})
                          </h5>
                          <div className={styles.rsvpPlayerList}>
                            {(() => {
                              const notComingPlayers = getPlayersByStatus(night, 'not_coming');
                              return notComingPlayers.length > 0 
                                ? notComingPlayers.map(p => p.name).join(', ')
                                : <span className={styles.noPlayers}>None yet</span>;
                            })()}
                          </div>
                        </div>
                        
                        {/* No Response */}
                        <div className={styles.rsvpGroup}>
                          <h5 className={styles.rsvpGroupTitle}>
                            ❓ No Response ({night.players.length - (night.playerResponses?.length || 0)})
                          </h5>
                          <div className={styles.rsvpPlayerList}>
                            {(() => {
                              const noResponsePlayers = getPlayersByStatus(night, 'no_response');
                              return noResponsePlayers.length > 0 
                                ? noResponsePlayers.map(p => p.name).join(', ')
                                : <span className={styles.noPlayers}>Everyone has responded!</span>;
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Invite Link Manager */}
                    <InviteLinkManager
                      nightId={night.id}
                      inviteToken={night.inviteToken}
                      inviteExpiresAt={night.inviteExpiresAt}
                      inviteEnabled={night.inviteEnabled}
                      onUpdate={fetchPlannedNights}
                    />
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

      {editingNight && (
        <EditPlannedNightModal
          plannedNight={editingNight}
          availableGames={availableGames}
          availablePlayers={players}
          isOpen={true}
          onClose={() => setEditingNight(null)}
          onSave={handleSaveEdit}
        />
      )}
    </>
  );
}
