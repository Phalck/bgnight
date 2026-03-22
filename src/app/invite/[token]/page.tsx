'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/components/Toast';
import styles from './page.module.css';

interface GameVote {
  playerId: string;
}

interface Game {
  id: string;
  game: {
    id: string;
    title: string;
    thumbnail?: string | null;
    minPlayers: number;
    maxPlayers: number;
    maxPlayTime?: number | null;
  };
  youtubeVideoUrl?: string;
  voteCount: number;
  votes: GameVote[];
}

interface Player {
  id: string;
  name: string;
}

interface PlayerResponse {
  playerId: string;
  status: 'coming' | 'not_coming' | 'maybe';
  respondedAt: string;
}

interface InviteData {
  id: string;
  eventDateTime?: string;
  location?: string;
  customMessage?: string;
  games: Game[];
  players: Player[];
  playerResponses: PlayerResponse[];
  inviteExpiresAt?: string;
}

export default function InvitePage() {
  const params = useParams();
  const token = params.token as string;
  const { addToast } = useToast();

  const [data, setData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [playerVotes, setPlayerVotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchInviteData();
  }, [token]);

  const fetchInviteData = async () => {
    try {
      const response = await fetch(`/api/invite/${token}`);
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 410) {
          setError('expired');
        } else {
          setError(result.error || 'Failed to load invite');
        }
        return;
      }

      setData(result);
    } catch (err) {
      setError('Failed to load invite');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayerId(playerId);
    
    // Set player's current votes from data
    if (data && playerId) {
      const votedGameIds = new Set<string>();
      data.games.forEach(game => {
        if (game.votes.some(vote => vote.playerId === playerId)) {
          votedGameIds.add(game.id);
        }
      });
      setPlayerVotes(votedGameIds);
    } else {
      setPlayerVotes(new Set());
    }
  };

  const handleRSVP = async (status: 'coming' | 'not_coming' | 'maybe') => {
    if (!selectedPlayerId) {
      addToast('Please select who you are first', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/invite/${token}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: selectedPlayerId, status }),
      });

      if (!response.ok) {
        const result = await response.json();
        addToast(result.error || 'Failed to submit RSVP', 'error');
        return;
      }

      addToast('RSVP submitted!', 'success');
      // Refresh data to show updated responses
      fetchInviteData();
    } catch (err) {
      addToast('Failed to submit RSVP', 'error');
    }
  };

  const handleVote = async (plannedGameId: string) => {
    if (!selectedPlayerId) {
      addToast('Please select who you are first', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/invite/${token}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: selectedPlayerId, plannedGameId }),
      });

      if (!response.ok) {
        const result = await response.json();
        addToast(result.error || 'Failed to vote', 'error');
        return;
      }

      const result = await response.json();
      
      // Update local vote state
      setPlayerVotes(prev => {
        const newVotes = new Set(prev);
        if (result.voted) {
          newVotes.add(plannedGameId);
        } else {
          newVotes.delete(plannedGameId);
        }
        return newVotes;
      });

      // Refresh data to show updated vote counts
      fetchInviteData();
    } catch (err) {
      addToast('Failed to vote', 'error');
    }
  };

  const formatDate = (datetimeString?: string) => {
    if (!datetimeString) return 'Date TBD';
    
    const [datePart, timePart] = datetimeString.split('T');
    if (!datePart || !timePart) return datetimeString;
    
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    
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

  const getResponseStats = () => {
    if (!data?.playerResponses) return { coming: 0, notComing: 0, maybe: 0, noResponse: 0 };
    
    const coming = data.playerResponses.filter(r => r.status === 'coming').length;
    const notComing = data.playerResponses.filter(r => r.status === 'not_coming').length;
    const maybe = data.playerResponses.filter(r => r.status === 'maybe').length;
    const noResponse = data.players.length - data.playerResponses.length;
    
    return { coming, notComing, maybe, noResponse };
  };

  const getPlayerResponse = (playerId: string) => {
    if (!data?.playerResponses) return null;
    return data.playerResponses.find(r => r.playerId === playerId);
  };

  const getPlayerName = (playerId: string) => {
    if (!data?.players) return '';
    return data.players.find(p => p.id === playerId)?.name || '';
  };

  const getPlayersByStatus = (status: 'coming' | 'not_coming' | 'maybe' | 'no_response') => {
    if (!data) return [];
    
    if (status === 'no_response') {
      const respondedIds = new Set(data.playerResponses?.map(r => r.playerId) || []);
      return data.players
        .filter(p => !respondedIds.has(p.id))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    
    const respondedPlayerIds = data.playerResponses
      ?.filter(r => r.status === status)
      .map(r => r.playerId) || [];
    
    return data.players
      .filter(p => respondedPlayerIds.includes(p.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const getVoterNamesForGame = (game: Game) => {
    if (!data?.players || !game.votes) return [];
    return game.votes
      .map(vote => getPlayerName(vote.playerId))
      .filter(name => name)
      .sort((a, b) => a.localeCompare(b));
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.loading}>
            <LoadingSpinner />
            <p>Loading invite...</p>
          </div>
        </main>
      </>
    );
  }

  if (error === 'expired') {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.expiredCard}>
            <h1>⏰ Link Expired</h1>
            <p>This invite link has expired.</p>
            <p className={styles.contactMessage}>
              Please contact the organizer for a new invite link.
            </p>
          </div>
        </main>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.errorCard}>
            <h1>❌ Invite Not Found</h1>
            <p>{error || 'This invite link is invalid or has been disabled.'}</p>
          </div>
        </main>
      </>
    );
  }

  const stats = getResponseStats();

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>🎲 Game Night Invitation</h1>
            <div className={styles.meta}>
              <p className={styles.date}>📅 {formatDate(data.eventDateTime)}</p>
              {data.location && <p className={styles.location}>📍 {data.location}</p>}
            </div>
          </div>

          {data.customMessage && (
            <div className={styles.message}>
              <p>{data.customMessage}</p>
            </div>
          )}

          {/* Player Selection */}
          <div className={styles.section}>
            <h2>Who are you?</h2>
            <select
              className={styles.playerSelect}
              value={selectedPlayerId}
            onChange={(e) => handlePlayerSelect(e.target.value)}
            >
              <option value="">Select your name...</option>
              {data.players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>

          {/* RSVP Section */}
          <div className={styles.section}>
            <h2>Will you be joining?</h2>
            <div className={styles.rsvpButtons}>
              <button
                className={`${styles.rsvpBtn} ${styles.coming}`}
                onClick={() => handleRSVP('coming')}
                disabled={!selectedPlayerId}
              >
                ✅ Coming
              </button>
              <button
                className={`${styles.rsvpBtn} ${styles.maybe}`}
                onClick={() => handleRSVP('maybe')}
                disabled={!selectedPlayerId}
              >
                🤔 Maybe
              </button>
              <button
                className={`${styles.rsvpBtn} ${styles.notComing}`}
                onClick={() => handleRSVP('not_coming')}
                disabled={!selectedPlayerId}
              >
                ❌ Not Coming
              </button>
            </div>
          </div>

          {/* Your Current Response */}
          {selectedPlayerId && (
            <div className={styles.section}>
              <h2>Your Current Response</h2>
              <div className={styles.yourResponse}>
                <p className={styles.yourName}>
                  👤 {getPlayerName(selectedPlayerId)}
                </p>
                {(() => {
                  const response = getPlayerResponse(selectedPlayerId);
                  if (response) {
                    const statusLabels = {
                      coming: '✅ Coming',
                      maybe: '🤔 Maybe',
                      not_coming: '❌ Not Coming'
                    };
                    return <p className={styles.yourStatus}>Status: {statusLabels[response.status]}</p>;
                  }
                  return <p className={styles.yourStatus}>Status: ❓ No response yet</p>;
                })()}
                {playerVotes.size > 0 && (
                  <div className={styles.yourVotes}>
                    <p className={styles.votesLabel}>Games you voted for:</p>
                    <div className={styles.votedGamesList}>
                      {Array.from(playerVotes).map(gameId => {
                        const game = data.games.find(g => g.id === gameId);
                        return game ? (
                          <span key={gameId} className={styles.votedGameTag}>
                            {game.game.title}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Who&apos;s Coming - Detailed List */}
          <div className={styles.section}>
            <h2>Who&apos;s Coming?</h2>
            <div className={styles.detailedResponses}>
              {stats.coming > 0 && (
                <div className={styles.responseGroup}>
                  <h3 className={styles.responseGroupTitle}>✅ Coming ({stats.coming})</h3>
                  <div className={styles.playerList}>
                    {getPlayersByStatus('coming').map(player => (
                      <span key={player.id} className={styles.playerTag}>{player.name}</span>
                    ))}
                  </div>
                </div>
              )}
              
              {stats.maybe > 0 && (
                <div className={styles.responseGroup}>
                  <h3 className={styles.responseGroupTitle}>🤔 Maybe ({stats.maybe})</h3>
                  <div className={styles.playerList}>
                    {getPlayersByStatus('maybe').map(player => (
                      <span key={player.id} className={styles.playerTag}>{player.name}</span>
                    ))}
                  </div>
                </div>
              )}
              
              {stats.notComing > 0 && (
                <div className={styles.responseGroup}>
                  <h3 className={styles.responseGroupTitle}>❌ Not Coming ({stats.notComing})</h3>
                  <div className={styles.playerList}>
                    {getPlayersByStatus('not_coming').map(player => (
                      <span key={player.id} className={styles.playerTag}>{player.name}</span>
                    ))}
                  </div>
                </div>
              )}
              
              {stats.noResponse > 0 && (
                <div className={styles.responseGroup}>
                  <h3 className={styles.responseGroupTitle}>❓ No Response ({stats.noResponse})</h3>
                  <div className={styles.playerList}>
                    {getPlayersByStatus('no_response').map(player => (
                      <span key={player.id} className={styles.playerTag}>{player.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Games Section */}
          <div className={styles.section}>
            <h2>Games ({data.games.length})</h2>
            <p className={styles.voteHint}>Click on games you&apos;re interested in playing!</p>
            <div className={styles.gamesList}>
              {data.games.map((plannedGame) => {
                const voterNames = getVoterNamesForGame(plannedGame);
                return (
                  <div
                    key={plannedGame.id}
                    className={`${styles.gameCard} ${playerVotes.has(plannedGame.id) ? styles.voted : ''}`}
                    onClick={() => handleVote(plannedGame.id)}
                  >
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
                      <h3 className={styles.gameTitle}>{plannedGame.game.title}</h3>
                      <p className={styles.gameMeta}>
                        👥 {plannedGame.game.minPlayers}-{plannedGame.game.maxPlayers} players
                        {plannedGame.game.maxPlayTime && ` • ⏱️ ${plannedGame.game.maxPlayTime} min`}
                      </p>
                      <div className={styles.voteBadge}>
                        <span className={styles.voteIcon}>👍</span>
                        <span className={styles.voteCount}>{plannedGame.voteCount} votes</span>
                        {playerVotes.has(plannedGame.id) && (
                          <span className={styles.youVoted}>(You voted!)</span>
                        )}
                      </div>
                      {voterNames.length > 0 && (
                        <p className={styles.voterNames}>
                          {voterNames.join(', ')}
                        </p>
                      )}
                      {plannedGame.youtubeVideoUrl && (
                        <a
                          href={plannedGame.youtubeVideoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.videoLink}
                          onClick={(e) => e.stopPropagation()}
                        >
                          📺 How to play
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {data.inviteExpiresAt && (
            <div className={styles.footer}>
              <p className={styles.expires}>
                This invite link expires on {formatDate(data.inviteExpiresAt)}
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}