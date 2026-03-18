'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { GameCard } from '@/components/GameCard';
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
  // Players
  const [players, setPlayers] = useState<Player[]>([]);
   
  // Suggestions - load all games immediately
  const [suggestions, setSuggestions] = useState<SuggestedGame[]>([]);
  const [hasSearched, setHasSearched] = useState(true); // Always true to show filters immediately
  
  // Post-search filters
  const [showFilters, setShowFilters] = useState(false);
  const [postSearchFilters, setPostSearchFilters] = useState({
    playerCount: 4,
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

  const fetchAllGames = useCallback(async () => {
    try {
      const data = await api.get<any[]>('/api/games');
      // Transform games to SuggestedGame format
      const transformedGames: SuggestedGame[] = data.map(game => ({
        id: game.id,
        title: game.title,
        thumbnail: game.thumbnail,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        minPlayTime: game.minPlayTime,
        maxPlayTime: game.maxPlayTime,
        mechanics: game.mechanics || [],
        categories: game.categories || [],
        bggRating: game.bggRating,
        matchScore: 100, // All games are a 100% match when showing all
        playCount: 0,
        lastPlayedAt: null,
      }));
      setSuggestions(transformedGames);
      setFilteredSuggestions(transformedGames);
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
      Promise.all([fetchPlayers(), fetchAllGames()]).then(() => setLoading(false));
    }
  }, [status, router, fetchPlayers, fetchAllGames]);

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

      // Player count filter - game must support exactly the group size
      if (postSearchFilters.playerCount < game.minPlayers || 
          postSearchFilters.playerCount > game.maxPlayers) {
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

          {suggestions.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>📚</span>
              <h2>Your collection is empty</h2>
              <p>Add some games to your collection first to plan a game night.</p>
              <a href="/collection" className={styles.linkBtn}>Go to Collection →</a>
            </div>
          ) : (
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
                  <div className={styles.filterRowCompact}>
                    <div className={styles.filterGroupSmall}>
                      <label>Players</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={postSearchFilters.playerCount}
                        onChange={(e) => setPostSearchFilters({
                          ...postSearchFilters,
                          playerCount: parseInt(e.target.value) || 4
                        })}
                        className={styles.numberInputSmall}
                      />
                    </div>

                    <div className={styles.filterGroupSmall}>
                      <label>Time</label>
                      <select
                        value={postSearchFilters.maxTime}
                        onChange={(e) => setPostSearchFilters({
                          ...postSearchFilters,
                          maxTime: parseInt(e.target.value)
                        })}
                        className={styles.selectSmall}
                      >
                        <option value="30">30m</option>
                        <option value="60">1h</option>
                        <option value="90">1.5h</option>
                        <option value="120">2h</option>
                        <option value="180">3h</option>
                        <option value="240">4h+</option>
                      </select>
                    </div>

                    {allCategories.length > 0 && (
                      <div className={styles.filterGroupSmall}>
                        <label>Categories ({allCategories.length})</label>
                        <div className={styles.checkboxListSmall}>
                          {allCategories.map(category => (
                            <label key={category} className={styles.checkboxSmall}>
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

                    {allMechanics.length > 0 && (
                      <div className={styles.filterGroupSmall}>
                        <label>Mechanics ({allMechanics.length})</label>
                        <div className={styles.checkboxListSmall}>
                          {allMechanics.map(mechanic => (
                            <label key={mechanic} className={styles.checkboxSmall}>
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
                  </div>

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
                        playerCount: 4,
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
                  <GameCard
                    key={game.id}
                    game={game}
                    selected={!!selectedGames.find(g => g.id === game.id)}
                    onToggle={() => toggleGameSelection(game)}
                    showCheckbox={true}
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
