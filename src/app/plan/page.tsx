'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { SelectableGameCard } from '@/components/SelectableGameCard';
import { VideoPickerModal } from '@/components/VideoPickerModal';
import { SelectedGamesList } from '@/components/SelectedGamesList';
import { EventDetailsForm } from '@/components/EventDetailsForm';
import { InviteGenerator } from '@/components/InviteGenerator';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/components/Toast';
import * as api from '@/lib/api-client';
import styles from './page.module.css';

interface Player {
  id: string;
  name: string;
}

interface SuggestedGame {
  id: string;
  title: string;
  thumbnail?: string | null;
  minPlayers: number;
  maxPlayers: number;
  minPlayTime?: number | null;
  maxPlayTime?: number | null;
  mechanics: string[];
  categories: string[];
  bggRating?: number | null;
  matchScore: number;
  playCount: number;
  lastPlayedAt?: string | null;
}

interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

export default function PlanBGNPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { addToast } = useToast();
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  
  // Players
  const [players, setPlayers] = useState<Player[]>([]);
  
  // Filter form
  const [formData, setFormData] = useState({
    players: '4',
    maxTime: '120',
    mechanics: [] as string[],
    categories: [] as string[],
  });
  
  // Suggestions
  const [suggestions, setSuggestions] = useState<SuggestedGame[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Post-search filters
  const [showFilters, setShowFilters] = useState(false);
  const [postSearchFilters, setPostSearchFilters] = useState({
    minPlayers: 1,
    maxPlayers: 20,
    maxTime: 240,
    mechanics: [] as string[],
    categories: [] as string[],
    minBggRating: 0,
    maxBggRating: 10,
  });
  
  // Toolbar: search, sort, artwork
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'az' | 'za' | 'playTime' | 'latestPlayed' | 'mostPlayed'>('az');
  const [showArtwork, setShowArtwork] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bgnight_plan_showArtwork') !== 'false';
    }
    return true;
  });

  // Filtered suggestions
  const [filteredSuggestions, setFilteredSuggestions] = useState<SuggestedGame[]>([]);
  
  // Selected games
  const [selectedGames, setSelectedGames] = useState<SuggestedGame[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<Map<string, YouTubeVideo>>(new Map());
  const [showVideoPicker, setShowVideoPicker] = useState<string | null>(null);
  
  // Event details
  const [eventDateTime, setEventDateTime] = useState('');
  const [location, setLocation] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [showEventDetails, setShowEventDetails] = useState(false);
  
  // Invite generator
  const [showInviteGenerator, setShowInviteGenerator] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Ref for scrolling to event details
  const eventDetailsRef = useRef<HTMLDivElement>(null);
  
  const scrollToEventDetails = () => {
    setShowEventDetails(true);
    // Use setTimeout to ensure the element is rendered before scrolling
    setTimeout(() => {
      eventDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const fetchPlayers = useCallback(async () => {
    try {
      const data = await api.get<Player[]>('/api/players');
      setPlayers(data);
      setError(null);
    } catch (err) {
      const message = api.getErrorMessage(err);
      setError(message);
      addToast(message, 'error');
    }
  }, [addToast]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchPlayers().then(() => setLoading(false));
    }
  }, [status, router, fetchPlayers]);

  // Save artwork preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bgnight_plan_showArtwork', showArtwork.toString());
    }
  }, [showArtwork]);

  // Filter suggestions based on post-search filters and search query
  useEffect(() => {
    if (!hasSearched) return;
    
    let filtered = suggestions.filter(game => {
      // Search filter (case-insensitive, real-time)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (!game.title.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Player count filter
      if (game.minPlayers > postSearchFilters.maxPlayers || 
          game.maxPlayers < postSearchFilters.minPlayers) {
        return false;
      }
      
      // Play time filter
      if (game.maxPlayTime && game.maxPlayTime > postSearchFilters.maxTime) {
        return false;
      }
      
      // Mechanics filter
      if (postSearchFilters.mechanics.length > 0) {
        const hasMechanic = postSearchFilters.mechanics.some(m => 
          game.mechanics.includes(m)
        );
        if (!hasMechanic) return false;
      }
      
      // Categories filter
      if (postSearchFilters.categories.length > 0) {
        const hasCategory = postSearchFilters.categories.some(c => 
          game.categories.includes(c)
        );
        if (!hasCategory) return false;
      }
      
      // BGG Rating filter
      if (game.bggRating && game.bggRating > 0) {
        if (game.bggRating < postSearchFilters.minBggRating || 
            game.bggRating > postSearchFilters.maxBggRating) {
          return false;
        }
      }
      
      return true;
    });

    // Sort filtered results
    filtered = filtered.sort((a, b) => {
      switch (sortOrder) {
        case 'az':
          return a.title.localeCompare(b.title);
        case 'za':
          return b.title.localeCompare(a.title);
        case 'playTime':
          return (a.maxPlayTime || 0) - (b.maxPlayTime || 0);
        case 'latestPlayed':
          // Sort by last played date (most recent first), nulls last
          if (!a.lastPlayedAt && !b.lastPlayedAt) return 0;
          if (!a.lastPlayedAt) return 1;
          if (!b.lastPlayedAt) return -1;
          return new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime();
        case 'mostPlayed':
          return b.playCount - a.playCount;
        default:
          return 0;
      }
    });
    
    setFilteredSuggestions(filtered);
    
    // Clear selections when filters change and results are different
    if (filtered.length !== suggestions.length) {
      setSelectedGames([]);
      setSelectedVideos(new Map());
    }
  }, [suggestions, postSearchFilters, searchQuery, sortOrder, hasSearched]);

  // Initialize filtered suggestions when suggestions change
  useEffect(() => {
    if (hasSearched) {
      setFilteredSuggestions(suggestions);
    }
  }, [suggestions, hasSearched]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setHasSearched(true);
    setSelectedGames([]);
    setSelectedVideos(new Map());
    setShowEventDetails(false);

    const params = new URLSearchParams({
      players: formData.players,
      maxTime: formData.maxTime,
    });

    if (formData.mechanics.length > 0) params.set('mechanics', formData.mechanics.join(','));
    if (formData.categories.length > 0) params.set('categories', formData.categories.join(','));

    try {
      const data = await api.get<SuggestedGame[]>(`/api/games/suggest?${params}`);
      setSuggestions(data);
    } catch (err) {
      const message = api.getErrorMessage(err);
      addToast(message, 'error');
    } finally {
      setSearching(false);
    }
  };

  const toggleGameSelection = (game: SuggestedGame) => {
    const isSelected = selectedGames.find(g => g.id === game.id);
    if (isSelected) {
      setSelectedGames(prev => prev.filter(g => g.id !== game.id));
      setSelectedVideos(prev => {
        const newMap = new Map(prev);
        newMap.delete(game.id);
        return newMap;
      });
    } else {
      setSelectedGames(prev => [...prev, game]);
    }
  };

  const handleRemoveGame = (gameId: string) => {
    setSelectedGames(prev => prev.filter(g => g.id !== gameId));
    setSelectedVideos(prev => {
      const newMap = new Map(prev);
      newMap.delete(gameId);
      return newMap;
    });
  };

  const handleClearAll = () => {
    setSelectedGames([]);
    setSelectedVideos(new Map());
  };

  const handlePickVideo = (gameId: string) => {
    setShowVideoPicker(gameId);
  };

  const handleSelectVideo = (video: YouTubeVideo) => {
    if (showVideoPicker) {
      setSelectedVideos(prev => {
        const newMap = new Map(prev);
        newMap.set(showVideoPicker, video);
        return newMap;
      });
      setShowVideoPicker(null);
    }
  };

  const handleSkipVideo = () => {
    setShowVideoPicker(null);
  };

  const handleGenerateInvite = () => {
    setShowInviteGenerator(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/api/planned-nights', {
        eventDateTime: eventDateTime || null,
        location: location || null,
        customMessage: customMessage || null,
        playerIds: selectedPlayers.map(p => p.id),
        games: selectedGames.map(game => {
          const video = selectedVideos.get(game.id);
          return {
            gameId: game.id,
            youtubeVideoId: video?.id || null,
            youtubeVideoTitle: video?.title || null,
            youtubeVideoUrl: video ? `https://youtube.com/watch?v=${video.id}` : null,
          };
        }),
      });

      router.push('/planned-nights');
      addToast('Game night planned successfully!', 'success');
    } catch (err) {
      const message = api.getErrorMessage(err);
      addToast(message, 'error');
      setSaving(false);
    }
  };

  const handleDontSave = () => {
    setShowInviteGenerator(false);
  };

  if (status === 'loading' || loading) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.loadingContainer}>
              <LoadingSpinner size="large" />
              <p className={styles.loadingText}>Loading...</p>
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
              <h2 className={styles.errorTitle}>Failed to Load</h2>
              <p className={styles.errorMessage}>{error}</p>
              <button 
                className={styles.retryBtn}
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  fetchPlayers().then(() => setLoading(false));
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

  const allMechanics = [...new Set(suggestions.flatMap(g => g.mechanics))].sort();
  const allCategories = [...new Set(suggestions.flatMap(g => g.categories))].sort();
  
  // Get min/max BGG rating from results for slider bounds
  const bggRatings = suggestions.map(g => g.bggRating || 0).filter(r => r > 0);
  const minBggRatingFromResults = bggRatings.length > 0 ? Math.min(...bggRatings) : 0;
  const maxBggRatingFromResults = bggRatings.length > 0 ? Math.max(...bggRatings) : 10;

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Plan BGN</h1>
            <p className={styles.subtitle}>Organize your game night</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label htmlFor="players">Number of Players</label>
                <input
                  id="players"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.players}
                  onChange={(e) => setFormData({ ...formData, players: e.target.value })}
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="maxTime">Available Time (minutes)</label>
                <select
                  id="maxTime"
                  value={formData.maxTime}
                  onChange={(e) => setFormData({ ...formData, maxTime: e.target.value })}
                >
                  <option value="30">30 min</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                  <option value="180">3 hours</option>
                  <option value="240">4 hours</option>
                </select>
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={searching}>
              {searching ? (
                <>
                  <LoadingSpinner size="small" />
                  Finding games...
                </>
              ) : 'Find Games'}
            </button>
          </form>

          {searching && (
            <div className={styles.loadingContainer}>
              <LoadingSpinner size="large" />
              <p className={styles.loadingText}>Searching your collection...</p>
            </div>
          )}

          {!searching && hasSearched && suggestions.length === 0 && (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>😔</span>
              <h2>No games found</h2>
              <p>Your collection doesn&apos;t have games matching these criteria.</p>
            </div>
          )}

          {!searching && suggestions.length > 0 && (
            <>
              <h2 className={styles.sectionTitle}>
                Select Games ({selectedGames.length} selected)
              </h2>
              <p className={styles.instructionNote}>
                👇 Select the games you want to play, then scroll down to continue
              </p>

              <div className={styles.toolbar}>
                <div className={styles.searchContainer}>
                  <span className={styles.searchIcon}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search games..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>

                <div className={styles.toolbarActions}>
                  <div className={styles.sortContainer}>
                    <label>Sort:</label>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
                      className={styles.sortSelect}
                    >
                      <option value="az">A-Z</option>
                      <option value="za">Z-A</option>
                      <option value="playTime">Play Time</option>
                      <option value="latestPlayed">Latest Played</option>
                      <option value="mostPlayed">Most Played</option>
                    </select>
                  </div>

                  <button
                    className={`${styles.artworkToggle} ${showArtwork ? styles.artworkToggleActive : ''}`}
                    onClick={() => setShowArtwork(!showArtwork)}
                    title={showArtwork ? 'Hide artwork' : 'Show artwork'}
                  >
                    {showArtwork ? '🙈' : '🖼️'}
                  </button>

                  <button
                    className={styles.filterToggle}
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                  </button>
                </div>
              </div>

              {showFilters && (
                <div className={styles.filtersPanel}>
                  <div className={styles.filterRow}>
                    <div className={styles.filterGroup}>
                      <label>Player Count</label>
                      <div className={styles.rangeInputs}>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={postSearchFilters.minPlayers}
                          onChange={(e) => setPostSearchFilters({
                            ...postSearchFilters,
                            minPlayers: parseInt(e.target.value) || 1
                          })}
                        />
                        <span>to</span>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={postSearchFilters.maxPlayers}
                          onChange={(e) => setPostSearchFilters({
                            ...postSearchFilters,
                            maxPlayers: parseInt(e.target.value) || 20
                          })}
                        />
                      </div>
                    </div>

                    <div className={styles.filterGroup}>
                      <label>Max Play Time</label>
                      <select
                        value={postSearchFilters.maxTime}
                        onChange={(e) => setPostSearchFilters({
                          ...postSearchFilters,
                          maxTime: parseInt(e.target.value)
                        })}
                      >
                        <option value="30">30 min</option>
                        <option value="60">1 hour</option>
                        <option value="90">1.5 hours</option>
                        <option value="120">2 hours</option>
                        <option value="180">3 hours</option>
                        <option value="240">4 hours+</option>
                      </select>
                    </div>
                  </div>

                  {allMechanics.length > 0 && (
                    <div className={styles.filterGroup}>
                      <label>Mechanics ({allMechanics.length} available)</label>
                      <div className={styles.checkboxList}>
                        {allMechanics.map(mechanic => (
                          <label key={mechanic} className={styles.checkbox}>
                            <input
                              type="checkbox"
                              checked={postSearchFilters.mechanics.includes(mechanic)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setPostSearchFilters({
                                    ...postSearchFilters,
                                    mechanics: [...postSearchFilters.mechanics, mechanic]
                                  });
                                } else {
                                  setPostSearchFilters({
                                    ...postSearchFilters,
                                    mechanics: postSearchFilters.mechanics.filter(m => m !== mechanic)
                                  });
                                }
                              }}
                            />
                            {mechanic}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {allCategories.length > 0 && (
                    <div className={styles.filterGroup}>
                      <label>Categories ({allCategories.length} available)</label>
                      <div className={styles.checkboxList}>
                        {allCategories.map(category => (
                          <label key={category} className={styles.checkbox}>
                            <input
                              type="checkbox"
                              checked={postSearchFilters.categories.includes(category)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setPostSearchFilters({
                                    ...postSearchFilters,
                                    categories: [...postSearchFilters.categories, category]
                                  });
                                } else {
                                  setPostSearchFilters({
                                    ...postSearchFilters,
                                    categories: postSearchFilters.categories.filter(c => c !== category)
                                  });
                                }
                              }}
                            />
                            {category}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {bggRatings.length > 0 && (
                    <div className={styles.filterRow}>
                      <div className={styles.filterGroup}>
                        <label>Min BGG Rating: {postSearchFilters.minBggRating}</label>
                        <input
                          type="range"
                          min={Math.floor(minBggRatingFromResults)}
                          max={Math.ceil(maxBggRatingFromResults)}
                          step="0.5"
                          value={postSearchFilters.minBggRating}
                          onChange={(e) => setPostSearchFilters({
                            ...postSearchFilters,
                            minBggRating: parseFloat(e.target.value)
                          })}
                        />
                      </div>

                      <div className={styles.filterGroup}>
                        <label>Max BGG Rating: {postSearchFilters.maxBggRating}</label>
                        <input
                          type="range"
                          min={Math.floor(minBggRatingFromResults)}
                          max={Math.ceil(maxBggRatingFromResults)}
                          step="0.5"
                          value={postSearchFilters.maxBggRating}
                          onChange={(e) => setPostSearchFilters({
                            ...postSearchFilters,
                            maxBggRating: parseFloat(e.target.value)
                          })}
                        />
                      </div>
                    </div>
                  )}

                  <button 
                    className={styles.clearFiltersBtn}
                    onClick={() => {
                      setPostSearchFilters({
                        minPlayers: 1,
                        maxPlayers: 20,
                        maxTime: 240,
                        mechanics: [],
                        categories: [],
                        minBggRating: 0,
                        maxBggRating: 10,
                      });
                    }}
                  >
                    Clear All Filters
                  </button>
                </div>
              )}

              <div className={styles.suggestionsGrid}>
                {filteredSuggestions.map(game => (
                  <SelectableGameCard
                    key={game.id}
                    game={game}
                    selected={!!selectedGames.find(g => g.id === game.id)}
                    onToggle={() => toggleGameSelection(game)}
                    showArtwork={showArtwork}
                  />
                ))}
              </div>
            </>
          )}

          {selectedGames.length > 0 && (
            <>
              <SelectedGamesList
                games={selectedGames}
                selectedVideos={selectedVideos}
                onRemove={handleRemoveGame}
                onPickVideo={handlePickVideo}
                onClearAll={handleClearAll}
              />
              
              <div className={styles.scrollButtonContainer}>
                <button 
                  className={styles.scrollButton}
                  onClick={scrollToEventDetails}
                >
                  ↓ Continue to Event Details
                </button>
              </div>
            </>
          )}

          <div ref={eventDetailsRef}>
            {showEventDetails && (
                <EventDetailsForm
                availablePlayers={players}
                eventDateTime={eventDateTime}
                location={location}
                customMessage={customMessage}
                selectedPlayers={selectedPlayers}
                onDateTimeChange={setEventDateTime}
                onLocationChange={setLocation}
                onCustomMessageChange={setCustomMessage}
                onPlayersChange={setSelectedPlayers}
                onAddPlayer={handleAddPlayer}
                onGenerateInvite={handleGenerateInvite}
              />
            )}
          </div>
        </div>
      </main>

      {showVideoPicker && (
        <VideoPickerModal
          gameTitle={suggestions.find(g => g.id === showVideoPicker)?.title || ''}
          onClose={handleSkipVideo}
          onSelect={handleSelectVideo}
          onSkip={handleSkipVideo}
        />
      )}

      <InviteGenerator
        isOpen={showInviteGenerator}
        onClose={() => setShowInviteGenerator(false)}
        selectedGames={selectedGames}
        selectedVideos={selectedVideos}
        eventDateTime={eventDateTime}
        location={location}
        customMessage={customMessage}
        selectedPlayers={selectedPlayers}
        onSave={handleSave}
        onDontSave={handleDontSave}
      />
    </>
  );
}
