'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/Header';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/components/Toast';
import styles from './page.module.css';

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
}

interface RSVPStats {
  coming: number;
  maybe: number;
  notComing: number;
  noResponse: number;
}

interface PlannedNight {
  id: string;
  eventDateTime?: string;
  location?: string;
  organizer: string;
  userId?: string;
  games: Game[];
  rsvpStats: RSVPStats;
  isOwner?: boolean;
  isPlayer?: boolean;
  hasPendingRequest?: boolean;
  canRequestJoin?: boolean;
  yourRsvpStatus?: string;
}

const DATE_FILTERS = [
  { value: 'all', label: 'All Dates' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

export default function CommunityBGNsPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const [plannedNights, setPlannedNights] = useState<PlannedNight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizers, setOrganizers] = useState<string[]>([]);
  const [requestingNights, setRequestingNights] = useState<Set<string>>(new Set());
  
  // Filter states
  const [selectedOrganizer, setSelectedOrganizer] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showOnlyParticipating, setShowOnlyParticipating] = useState(false);

  // Get current user's name to identify their events
  const currentUserName = session?.user?.name || null;

  useEffect(() => {
    fetchPlannedNights();
  }, [selectedOrganizer, dateFilter]);

  const fetchPlannedNights = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedOrganizer && selectedOrganizer !== 'all') {
        params.append('organizer', selectedOrganizer);
      }
      params.append('dateFilter', dateFilter);
      params.append('upcoming', 'true');

      const response = await fetch(`/api/public/planned-nights?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch planned nights');
      }

      const data = await response.json();
      setPlannedNights(data);

      // Extract unique organizers for filter dropdown
      const uniqueOrganizers = Array.from(new Set(data.map((night: PlannedNight) => night.organizer))) as string[];
      setOrganizers(uniqueOrganizers.sort());
      setError(null);
    } catch (err) {
      setError('Failed to load planned nights');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestJoin = async (nightId: string) => {
    if (!session?.user) {
      addToast('Please log in to request to join', 'error');
      return;
    }

    setRequestingNights(prev => new Set(prev).add(nightId));

    try {
      const response = await fetch(`/api/planned-nights/${nightId}/request-join`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        addToast('Join request sent!', 'success');
        // Update the night to show pending state
        setPlannedNights(prev => prev.map(night => 
          night.id === nightId 
            ? { ...night, hasPendingRequest: true, canRequestJoin: false }
            : night
        ));
      } else {
        addToast(data.error || 'Failed to send request', 'error');
      }
    } catch (err) {
      addToast('Failed to send join request', 'error');
    } finally {
      setRequestingNights(prev => {
        const newSet = new Set(prev);
        newSet.delete(nightId);
        return newSet;
      });
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

  const formatPlayers = (min: number, max: number) => {
    if (min === max) return `${min} players`;
    return `${min}-${max} players`;
  };

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>🌐 Community BGNs</h1>
            <p className={styles.subtitle}>Discover board game nights happening in your community</p>
          </div>

          {/* Filters */}
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Organizer</label>
              <select
                className={styles.filterSelect}
                value={selectedOrganizer}
                onChange={(e) => setSelectedOrganizer(e.target.value)}
              >
                <option value="all">All Organizers</option>
                {organizers.map((organizer) => (
                  <option key={organizer} value={organizer}>
                    {organizer}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>When</label>
              <div className={styles.filterButtons}>
                {DATE_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    className={`${styles.filterBtn} ${dateFilter === filter.value ? styles.active : ''}`}
                    onClick={() => setDateFilter(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
                {session?.user && (
                  <button
                    className={`${styles.filterBtn} ${showOnlyParticipating ? styles.active : ''}`}
                    onClick={() => setShowOnlyParticipating(!showOnlyParticipating)}
                  >
                    {showOnlyParticipating ? 'My BGNs' : 'All BGNs'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className={styles.loading}>
              <LoadingSpinner />
              <p>Loading game nights...</p>
            </div>
          ) : error ? (
            <div className={styles.error}>
              <p>{error}</p>
            </div>
          ) : plannedNights.filter(night => !showOnlyParticipating || night.isPlayer).length === 0 ? (
            <div className={styles.empty}>
              <p>{showOnlyParticipating ? 'You are not participating in any game nights.' : 'No game nights found matching your filters.'}</p>
            </div>
          ) : (
            <div className={styles.nightsList}>
              {plannedNights
                .filter(night => !showOnlyParticipating || night.isPlayer)
                .map((night) => (
                <div key={night.id} className={`${styles.nightCard} ${currentUserName && night.organizer === currentUserName ? styles.yourEvent : ''}`}>
                  <div className={styles.nightHeader}>
                    <div className={styles.nightTitleRow}>
                      <h2 className={styles.nightTitle}>🎲 Game Night</h2>
                      <div className={styles.badges}>
                        {currentUserName && night.organizer === currentUserName && (
                          <span className={styles.yourEventBadge}>Your Event</span>
                        )}
                        {night.isPlayer && (
                          <span className={styles.participatingBadge}>✓ Participating</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.nightMeta}>
                      <p className={styles.organizer}>👤 {night.organizer}</p>
                      <p className={styles.date}>📅 {formatDate(night.eventDateTime)}</p>
                      <div className={styles.locationRow}>
                        {night.location && <p className={styles.location}>📍 {night.location}</p>}
                        {night.canRequestJoin && (
                          <button
                            className={styles.askJoinBtn}
                            onClick={() => handleRequestJoin(night.id)}
                            disabled={requestingNights.has(night.id) || night.hasPendingRequest}
                          >
                            {requestingNights.has(night.id) 
                              ? 'Sending...' 
                              : night.hasPendingRequest 
                                ? 'Request pending' 
                                : 'Ask to join'
                            }
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={styles.gamesSection}>
                    <h3 className={styles.sectionTitle}>Games ({night.games.length})</h3>
                    <div className={styles.gamesList}>
                      {night.games.map((plannedGame) => (
                        <div key={plannedGame.id} className={styles.gameItem}>
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
                            <h4 className={styles.gameTitle}>{plannedGame.game.title}</h4>
                            <p className={styles.gameMeta}>
                              {formatPlayers(plannedGame.game.minPlayers, plannedGame.game.maxPlayers)}
                              {plannedGame.game.maxPlayTime && ` • ${plannedGame.game.maxPlayTime} min`}
                            </p>
                            <p className={styles.voteCount}>👍 {plannedGame.voteCount} votes</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.rsvpSection}>
                    <h3 className={styles.sectionTitle}>RSVPs</h3>
                    <div className={styles.rsvpGrid}>
                      <div className={styles.rsvpBox}>
                        <span className={styles.rsvpIcon}>✅</span>
                        <span className={styles.rsvpCount}>{night.rsvpStats.coming}</span>
                        <span className={styles.rsvpLabel}>Coming</span>
                      </div>
                      <div className={styles.rsvpBox}>
                        <span className={styles.rsvpIcon}>🤔</span>
                        <span className={styles.rsvpCount}>{night.rsvpStats.maybe}</span>
                        <span className={styles.rsvpLabel}>Maybe</span>
                      </div>
                      <div className={styles.rsvpBox}>
                        <span className={styles.rsvpIcon}>❌</span>
                        <span className={styles.rsvpCount}>{night.rsvpStats.notComing}</span>
                        <span className={styles.rsvpLabel}>Not Coming</span>
                      </div>
                      <div className={styles.rsvpBox}>
                        <span className={styles.rsvpIcon}>❓</span>
                        <span className={styles.rsvpCount}>{night.rsvpStats.noResponse}</span>
                        <span className={styles.rsvpLabel}>No Response</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
