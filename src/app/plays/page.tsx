'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { GameNightCard } from '@/components/GameNightCard';
import { LogPlayModal } from '@/components/LogPlayModal';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/components/Toast';
import * as api from '@/lib/api-client';
import styles from './page.module.css';

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

interface GroupedPlays {
  [date: string]: PlayLog[];
}

export default function PastBGNsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { addToast } = useToast();
  
  const [plays, setPlays] = useState<PlayLog[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
   
  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [gameSearch, setGameSearch] = useState('');

  // Edit play modal state
  const [editingPlay, setEditingPlay] = useState<PlayLog | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchPlays = useCallback(async () => {
    try {
      const data = await api.get<PlayLog[]>('/api/plays');
      setPlays(data);
      setError(null);
    } catch (err) {
      const message = api.getErrorMessage(err);
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const fetchPlayers = useCallback(async () => {
    try {
      const data = await api.get<Player[]>('/api/players');
      setAllPlayers(data);
    } catch (err) {
      const message = api.getErrorMessage(err);
      addToast(message, 'error');
    }
  }, [addToast]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchPlays();
      fetchPlayers();
    }
  }, [status, router, fetchPlays, fetchPlayers]);

  const filteredPlays = useMemo(() => {
    return plays.filter(play => {
      // Date filter
      if (dateFrom) {
        const playDate = new Date(play.playedAt);
        const fromDate = new Date(dateFrom);
        if (playDate < fromDate) return false;
      }
      if (dateTo) {
        const playDate = new Date(play.playedAt);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (playDate > toDate) return false;
      }

      // Player filter
      if (selectedPlayers.length > 0) {
        const playPlayerIds = play.players.map(p => p.id);
        const hasSelectedPlayer = selectedPlayers.some(id => playPlayerIds.includes(id));
        if (!hasSelectedPlayer) return false;
      }

      // Game search filter
      if (gameSearch.trim()) {
        const searchLower = gameSearch.toLowerCase();
        if (!play.game.title.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [plays, dateFrom, dateTo, selectedPlayers, gameSearch]);

  const groupedPlays: GroupedPlays = useMemo(() => {
    const grouped: GroupedPlays = {};
    filteredPlays.forEach(play => {
      const dateKey = new Date(play.playedAt).toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(play);
    });
    return grouped;
  }, [filteredPlays]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedPlays).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [groupedPlays]);

  // Calculate statistics from ALL plays (not filtered)
  const statistics = useMemo(() => {
    if (plays.length === 0) return null;

    // 1. Player with most wins (handle ties - show first alphabetically + "(tied)")
    const winCounts = new Map<string, { id: string; name: string; wins: number }>();
    plays.forEach(play => {
      play.winners.forEach(winner => {
        const current = winCounts.get(winner.id);
        if (current) {
          current.wins++;
        } else {
          winCounts.set(winner.id, { id: winner.id, name: winner.name, wins: 1 });
        }
      });
    });
    
    const sortedWinners = Array.from(winCounts.values()).sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.name.localeCompare(b.name); // Alphabetical for ties
    });
    
    const maxWins = sortedWinners[0]?.wins || 0;
    const winnersWithMaxWins = sortedWinners.filter(w => w.wins === maxWins);
    const topWinner = winnersWithMaxWins.length > 0 ? {
      ...winnersWithMaxWins[0],
      isTied: winnersWithMaxWins.length > 1
    } : null;

    // 2. Top 3 most played games
    const gameCounts = new Map<string, { id: string; title: string; plays: number }>();
    plays.forEach(play => {
      const current = gameCounts.get(play.game.id);
      if (current) {
        current.plays++;
      } else {
        gameCounts.set(play.game.id, { id: play.game.id, title: play.game.title, plays: 1 });
      }
    });
    const topGames = Array.from(gameCounts.values())
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 3);

    // 3. Date with most plays
    const dateCounts = new Map<string, { date: string; count: number }>();
    plays.forEach(play => {
      const dateKey = new Date(play.playedAt).toISOString().split('T')[0];
      const current = dateCounts.get(dateKey);
      if (current) {
        current.count++;
      } else {
        dateCounts.set(dateKey, { date: dateKey, count: 1 });
      }
    });
    const sortedDates = Array.from(dateCounts.values()).sort((a, b) => b.count - a.count);
    const busiestDate = sortedDates[0] || null;

    return { topWinner, topGames, busiestDate };
  }, [plays]);

  // Format date to match GameNightCard format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sv-SE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleDeletePlay = async (playId: string) => {
    try {
      await api.del(`/api/plays/${playId}`);
      setPlays(plays.filter(p => p.id !== playId));
      addToast('Play deleted', 'success');
    } catch (err) {
      const message = api.getErrorMessage(err);
      addToast(message, 'error');
      throw err;
    }
  };

  const handleEditPlay = (play: PlayLog) => {
    setEditingPlay(play);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (playData: {
    playedAt: string;
    playerIds: string[];
    newPlayers: string[];
    winnerIds: string[];
    duration?: number;
    location?: string;
    rating?: number;
    notes?: string;
  }) => {
    if (!editingPlay) return;

    try {
      // First delete the old play
      await api.del(`/api/plays/${editingPlay.id}`);

      // Then create a new play with the updated data
      const newPlay = await api.post<PlayLog>(`/api/games/${editingPlay.game.id}/plays`, playData);
      
      setPlays(plays.map(p => p.id === editingPlay.id ? newPlay : p));
      setShowEditModal(false);
      setEditingPlay(null);
      addToast('Play updated successfully!', 'success');
    } catch (err) {
      const message = api.getErrorMessage(err);
      addToast(message, 'error');
      throw err;
    }
  };

  const handleAddPlayer = async (name: string): Promise<Player | null> => {
    try {
      const newPlayer = await api.post<Player>('/api/players', { name });
      setAllPlayers(prev => [...prev, newPlayer]);
      addToast(`Player "${name}" added`, 'success');
      return newPlayer;
    } catch (err) {
      const message = api.getErrorMessage(err);
      addToast(message, 'error');
      return null;
    }
  };

  const handleClearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedPlayers([]);
    setGameSearch('');
  };

  const hasFilters = dateFrom || dateTo || selectedPlayers.length > 0 || gameSearch.trim();

  if (status === 'loading' || loading) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.loadingContainer}>
              <LoadingSpinner size="large" />
              <p className={styles.loadingText}>Loading your game nights...</p>
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
              <h2 className={styles.errorTitle}>Failed to Load Game Nights</h2>
              <p className={styles.errorMessage}>{error}</p>
              <button 
                className={styles.retryBtn}
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  fetchPlays();
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
              <h1 className={styles.title}>Past BGNs</h1>
              <p className={styles.subtitle}>Your game night history</p>
            </div>
            <span className={styles.count}>{plays.length} play{plays.length !== 1 ? 's' : ''} logged</span>
          </div>

          {/* Filters and Statistics */}
          <div className={styles.contentWrapper}>
            <div className={styles.filtersSection}>
              <div className={styles.filters}>
                {/* Row 1: Date Range and Game Search */}
                <div className={styles.filterRow}>
                  <div className={`${styles.filterGroup} ${styles.dateGroup}`}>
                    <label>Date Range</label>
                    <div className={styles.dateRange}>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className={styles.dateInput}
                        placeholder="From"
                      />
                      <span>to</span>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className={styles.dateInput}
                        placeholder="To"
                      />
                    </div>
                  </div>

                  <div className={`${styles.filterGroup} ${styles.searchGroup}`}>
                    <label>Game Search</label>
                    <input
                      type="text"
                      value={gameSearch}
                      onChange={(e) => setGameSearch(e.target.value)}
                      placeholder="Search games..."
                      className={styles.searchInput}
                    />
                  </div>

                  {hasFilters && (
                    <button className={styles.clearBtn} onClick={handleClearFilters}>
                      Clear Filters
                    </button>
                  )}
                </div>

                {/* Row 2: Players */}
                <div className={styles.filterRow}>
                  <div className={`${styles.filterGroup} ${styles.playersGroup}`}>
                    <label>Players</label>
                    <div className={styles.playerFilters}>
                      {allPlayers.map(player => (
                        <label key={player.id} className={styles.playerCheckbox}>
                          <input
                            type="checkbox"
                            checked={selectedPlayers.includes(player.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPlayers([...selectedPlayers, player.id]);
                              } else {
                                setSelectedPlayers(selectedPlayers.filter(id => id !== player.id));
                              }
                            }}
                          />
                          <span>{player.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics Box */}
            {statistics && (
              <div className={styles.statsSection}>
                <div className={styles.statsBox}>
                  <h3 className={styles.statsTitle}>📊 Statistics</h3>
                  
                  {/* Player with most wins */}
                  {statistics.topWinner && (
                    <div className={styles.statItem}>
                      <div className={styles.statLabel}>Top Winner</div>
                      <div className={styles.statValue}>
                        {statistics.topWinner.name}
                        {statistics.topWinner.isTied && <span className={styles.tiedIndicator}> (tied)</span>}
                        <span className={styles.statSubtext}>
                          {statistics.topWinner.wins} win{statistics.topWinner.wins !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Top 3 most played games */}
                  {statistics.topGames.length > 0 && (
                    <div className={styles.statItem}>
                      <div className={styles.statLabel}>Most Played Games</div>
                      <div className={styles.statList}>
                        {statistics.topGames.map((game, index) => (
                          <div key={game.id} className={styles.statListItem}>
                            <span className={styles.statRank}>#{index + 1}</span>
                            <span className={styles.statName}>{game.title}</span>
                            <span className={styles.statCount}>{game.plays}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Date with most games */}
                  {statistics.busiestDate && (
                    <div className={styles.statItem}>
                      <div className={styles.statLabel}>Busiest Game Night</div>
                      <div className={styles.statValue}>
                        {formatDate(statistics.busiestDate.date)}
                        <span className={styles.statSubtext}>
                          {statistics.busiestDate.count} game{statistics.busiestDate.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {sortedDates.length === 0 ? (
            <div className={styles.empty}>
              {plays.length === 0 ? (
                <>
                  <span className={styles.emptyIcon}>📅</span>
                  <h2>No game nights logged yet!</h2>
                  <p>Start tracking your board game adventures by clicking on any game in your collection.</p>
                  <a href="/collection" className={styles.linkBtn}>Go to Collection →</a>
                </>
              ) : (
                <>
                  <span className={styles.emptyIcon}>🔍</span>
                  <h2>No game nights match your filters</h2>
                  <p>Try adjusting your date range, players, or search terms.</p>
                  <button className={styles.linkBtn} onClick={handleClearFilters}>
                    Clear Filters
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className={styles.gameNightsList}>
              {sortedDates.map(date => (
                <GameNightCard
                  key={date}
                  date={date}
                  plays={groupedPlays[date]}
                  onDeletePlay={handleDeletePlay}
                  onEditPlay={handleEditPlay}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {showEditModal && editingPlay && (
        <LogPlayModal
          game={{ id: editingPlay.game.id, title: editingPlay.game.title }}
          availablePlayers={allPlayers}
          onClose={() => {
            setShowEditModal(false);
            setEditingPlay(null);
          }}
          onSave={handleSaveEdit}
          onAddPlayer={handleAddPlayer}
          preFillDate={editingPlay.playedAt.split('T')[0]}
          preFillLocation={editingPlay.location || ''}
          preFillPlayers={editingPlay.players}
          preFillWinners={editingPlay.winners}
          preFillDuration={editingPlay.duration}
          preFillRating={editingPlay.rating}
          preFillNotes={editingPlay.notes}
        />
      )}
    </>
  );
}
