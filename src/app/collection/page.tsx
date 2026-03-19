'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { GameCard } from '@/components/GameCard';
import { MultiSelect } from '@/components/MultiSelect';
import { LogPlayModal } from '@/components/LogPlayModal';
import { PlayHistoryModal } from '@/components/PlayHistoryModal';
import { LoadingSpinner, SkeletonCard } from '@/components/LoadingSpinner';
import { useToast } from '@/components/Toast';
import { BOARD_GAME_CATEGORIES, BOARD_GAME_MECHANICS } from '@/lib/gameData';
import * as api from '@/lib/api-client';
import styles from './page.module.css';

interface Player {
  id: string;
  name: string;
}

interface Game {
  id: string;
  bggId: number;
  title: string;
  thumbnail?: string | null;
  image?: string | null;
  minPlayers: number;
  maxPlayers: number;
  minPlayTime?: number | null;
  maxPlayTime?: number | null;
  yearPublished?: number | null;
  description?: string | null;
  mechanics: string[];
  categories: string[];
  designers: string[];
  publishers: string[];
  complexity?: number | null;
  bggRating?: number | null;
  bggRatingsCount?: number | null;
  bggRank?: number | null;
}

interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface BGGGameData {
  title: string;
  description: string;
  yearPublished: number;
  minPlayers: number;
  maxPlayers: number;
  minPlayTime: number;
  maxPlayTime: number;
  minAge: number;
  complexity: number;
  bggRating: number;
  bggRatingsCount: number;
  bggRank: number;
  thumbnail: string;
  image: string;
  categories: string[];
  mechanics: string[];
  designers: string[];
  publishers: string[];
  artists: string[];
}

interface BGGSearchResult {
  id: string;
  title: string;
  yearPublished?: number;
}

export default function CollectionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { addToast } = useToast();
  
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    minPlayers: 0,
    maxPlayers: 10,
    maxTime: 240,
    mechanics: [] as string[],
    categories: [] as string[],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortOrder, setSortOrder] = useState<'az' | 'za' | 'latest' | 'mostPlayed'>('az');
  const [viewingGame, setViewingGame] = useState<Game | null>(null);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    thumbnail: '',
    minPlayers: 2,
    maxPlayers: 4,
    minPlayTime: 30,
    maxPlayTime: 60,
    yearPublished: 2024,
    mechanics: [] as string[],
    categories: [] as string[],
    designers: '',
    publishers: '',
  });
  const [saving, setSaving] = useState(false);
  const [manualImageUrl, setManualImageUrl] = useState('');
  
  // BGG Import states
  const [showBGGImport, setShowBGGImport] = useState(false);
  const [bggImportLoading, setBggImportLoading] = useState(false);
  const [bggImportData, setBggImportData] = useState<BGGGameData | null>(null);
  const [bggImportError, setBggImportError] = useState('');
  const [showBGGConfirmModal, setShowBGGConfirmModal] = useState(false);
  
  // Multiple results selection state
  const [searchResults, setSearchResults] = useState<BGGSearchResult[]>([]);
  const [searchOffset, setSearchOffset] = useState(0);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [showGameSelection, setShowGameSelection] = useState(false);
  
  // BGG Suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Game view modal expandable sections
  const [expandedSections, setExpandedSections] = useState({
    details: false,
    mechanics: false,
    categories: false,
    description: false,
    videos: false,
  });
  
  // Description state
  const [gameDescription, setGameDescription] = useState('');
  const [loadingDescription, setLoadingDescription] = useState(false);
  
  // Artwork toggle state - default to false (hidden)
  const [showArtwork, setShowArtwork] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('bgnight_showArtwork');
    return saved === 'true';
  });

  // Save artwork preference to localStorage
  useEffect(() => {
    localStorage.setItem('bgnight_showArtwork', showArtwork.toString());
  }, [showArtwork]);

  // Video states
  const [videoSearchResults, setVideoSearchResults] = useState<YouTubeVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [suggestionType, setSuggestionType] = useState<'mechanics' | 'categories' | 'both'>('both');
  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);
  const [suggestedMechanics, setSuggestedMechanics] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionMessage, setSuggestionMessage] = useState('');

  // Play logging state
  const [playCounts, setPlayCounts] = useState<Map<string, number>>(new Map());
  const [players, setPlayers] = useState<Player[]>([]);
  const [loggingGame, setLoggingGame] = useState<Game | null>(null);
  const [viewingHistoryGame, setViewingHistoryGame] = useState<Game | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchGames = useCallback(async () => {
    try {
      const data = await api.get<Game[]>('/api/games');
      setGames(data);
      setError(null);
    } catch (err) {
      const message = api.getErrorMessage(err);
      setError(message);
      addToast(message, 'error');
    }
  }, [addToast]);

  const fetchPlayCounts = useCallback(async () => {
    try {
      const data = await api.get<{ gamePlayCounts: { gameId: string; playCount: number }[] }>('/api/plays/stats');
      const countsMap = new Map<string, number>();
      data.gamePlayCounts.forEach((gc) => {
        countsMap.set(gc.gameId, gc.playCount);
      });
      setPlayCounts(countsMap);
    } catch (err) {
      console.error('Failed to fetch play counts:', err);
    }
  }, []);

  const fetchPlayers = useCallback(async () => {
    try {
      const data = await api.get<Player[]>('/api/players');
      setPlayers(data);
    } catch (err) {
      console.error('Failed to fetch players:', err);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      Promise.all([fetchGames(), fetchPlayCounts(), fetchPlayers()]).then(() => {
        setLoading(false);
      });
    }
  }, [status, router, fetchGames, fetchPlayCounts, fetchPlayers]);

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this game from your collection?')) return;
    
    try {
      await api.del(`/api/games/${id}`);
      setGames(games.filter(g => g.id !== id));
      addToast('Game removed from collection', 'success');
    } catch (err) {
      const message = api.getErrorMessage(err);
      addToast(message, 'error');
    }
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
      
      // Update play count
      setPlayCounts(prev => {
        const newMap = new Map(prev);
        const currentCount = newMap.get(loggingGame.id) || 0;
        newMap.set(loggingGame.id, currentCount + 1);
        return newMap;
      });
      
      setLoggingGame(null);
      addToast('Play logged successfully', 'success');
      
      // Refresh players to get any newly created ones
      await fetchPlayers();
    } catch (err) {
      const message = api.getErrorMessage(err);
      addToast(message, 'error');
      throw err;
    }
  };

  const handleDeletePlay = async (playId: string) => {
    try {
      await api.del(`/api/plays/${playId}`);
      
      // Update play count for the game being viewed
      if (viewingHistoryGame) {
        setPlayCounts(prev => {
          const newMap = new Map(prev);
          const currentCount = newMap.get(viewingHistoryGame.id) || 0;
          if (currentCount > 0) {
            newMap.set(viewingHistoryGame.id, currentCount - 1);
          }
          return newMap;
        });
      }
      
      addToast('Play deleted', 'success');
    } catch (err) {
      const message = api.getErrorMessage(err);
      addToast(message, 'error');
      throw err;
    }
  };

  const handleView = (game: Game) => {
    setViewingGame(game);
    // Reset modal states to prevent data from previous game persisting
    setExpandedSections({
      details: false,
      mechanics: false,
      categories: false,
      description: false,
      videos: false,
    });
    setVideoSearchResults([]);
    setPlayingVideoId(null);
    setGameDescription('');
  };

  const handleEdit = (game: Game) => {
    setEditingGame(game);
    setEditForm({
      title: game.title,
      thumbnail: game.thumbnail || '',
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers,
      minPlayTime: game.minPlayTime || 30,
      maxPlayTime: game.maxPlayTime || 60,
      yearPublished: game.yearPublished || new Date().getFullYear(),
      mechanics: game.mechanics || [],
      categories: game.categories || [],
      designers: game.designers?.join(', ') || '',
      publishers: game.publishers?.join(', ') || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingGame) return;
    
    setSaving(true);
    try {
      const updated = await api.put<Game>(`/api/games/${editingGame.id}`, {
        title: editForm.title,
        thumbnail: editForm.thumbnail || null,
        minPlayers: editForm.minPlayers,
        maxPlayers: editForm.maxPlayers,
        minPlayTime: editForm.minPlayTime,
        maxPlayTime: editForm.maxPlayTime,
        yearPublished: editForm.yearPublished,
        mechanics: editForm.mechanics,
        categories: editForm.categories,
        designers: editForm.designers.split(',').map(d => d.trim()).filter(Boolean),
        publishers: editForm.publishers.split(',').map(p => p.trim()).filter(Boolean),
      });

      setGames(games.map(g => g.id === editingGame.id ? updated : g));
      setEditingGame(null);
      addToast('Game updated successfully', 'success');
    } catch (err) {
      const message = api.getErrorMessage(err);
      addToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Check if there's existing data in the form
  const hasExistingData = () => {
    return editForm.title || 
           editForm.mechanics.length > 0 || 
           editForm.categories.length > 0 ||
           editForm.designers ||
           editForm.publishers;
  };

  // Open BGG import modal
  const handleOpenBGGImport = () => {
    if (hasExistingData()) {
      setShowBGGConfirmModal(true);
    } else {
      setShowGameSelection(true);
      setSearchOffset(0);
      handleSearchBGG(0);
    }
  };

  const handleSearchBGG = async (offset: number) => {
    setSearchLoading(true);
    setBggImportError('');
    
    try {
      const response = await fetch(`/api/bgg-import/search?gameName=${encodeURIComponent(editingGame?.title || '')}&offset=${offset}`);
      const data = await response.json();
      
      if (!data.success) {
        setBggImportError(data.error || 'Failed to search BoardGameGeek');
        setSearchResults([]);
      } else {
        setSearchResults(data.data || []);
        setHasMoreResults(data.hasMore || false);
        setSearchOffset(offset);
      }
    } catch (err) {
      setBggImportError('Failed to connect to BGG');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleLoadMoreResults = () => {
    const nextOffset = searchOffset + 3;
    handleSearchBGG(nextOffset);
  };

  const handleSelectGame = async (gameId: string) => {
    setSelectedGameId(gameId);
    setShowGameSelection(false);
    setShowBGGImport(true);
    
    // Fetch full details for selected game
    setBggImportLoading(true);
    setBggImportError('');
    setBggImportData(null);
    
    try {
      const response = await fetch(`/api/bgg-import?gameId=${encodeURIComponent(gameId)}`);
      const data = await response.json();
      
      if (!data.success) {
        if (data.comingSoon) {
          setBggImportError('coming_soon');
        } else if (data.notFound) {
          setBggImportError('not_found');
        } else {
          setBggImportError(data.error || 'Failed to fetch from BGG');
        }
      } else {
        setBggImportData(data.data);
      }
    } catch (err) {
      setBggImportError('Failed to connect to BGG');
    } finally {
      setBggImportLoading(false);
    }
  };

  // Fetch from BGG API
  const handleFetchBGG = async () => {
    setBggImportLoading(true);
    setBggImportError('');
    setBggImportData(null);
    
    try {
      const response = await fetch(`/api/bgg-import?gameName=${encodeURIComponent(editingGame?.title || '')}`);
      const data = await response.json();
      
      if (!data.success) {
        if (data.comingSoon) {
          // Token not configured - show coming soon message
          setBggImportError('coming_soon');
        } else if (data.notFound) {
          setBggImportError('not_found');
        } else {
          setBggImportError(data.error || 'Failed to fetch from BGG');
        }
      } else {
        setBggImportData(data.data);
      }
    } catch (err) {
      setBggImportError('Failed to connect to BGG');
    } finally {
      setBggImportLoading(false);
    }
  };

  // Apply BGG data to form
  const handleApplyBGGData = () => {
    if (!bggImportData) return;
    
    setEditForm({
      ...editForm,
      title: bggImportData.title || editForm.title,
      thumbnail: bggImportData.thumbnail || bggImportData.image || editForm.thumbnail,
      minPlayers: bggImportData.minPlayers || editForm.minPlayers,
      maxPlayers: bggImportData.maxPlayers || editForm.maxPlayers,
      minPlayTime: bggImportData.minPlayTime || editForm.minPlayTime,
      maxPlayTime: bggImportData.maxPlayTime || editForm.maxPlayTime,
      yearPublished: bggImportData.yearPublished || editForm.yearPublished,
      mechanics: bggImportData.mechanics || editForm.mechanics,
      categories: bggImportData.categories || editForm.categories,
      designers: bggImportData.designers?.join(', ') || editForm.designers,
      publishers: bggImportData.publishers?.join(', ') || editForm.publishers,
    });
    
    setShowBGGImport(false);
    setShowBGGConfirmModal(false);
    setBggImportData(null);
    addToast('Game data imported from BGG!', 'success');
  };

  // Toggle expandable section
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  };

  // Fetch game description from BGG
  const fetchGameDescription = async (game: Game) => {
    if (game.description) {
      setGameDescription(game.description);
      return;
    }

    setLoadingDescription(true);
    try {
      const data = await api.get<{ description: string }>(`/api/bgg-description?gameId=${game.id}&bggId=${game.bggId}`);
      setGameDescription(data.description);
      // Update game in state with cached description
      setGames(games.map(g =>
        g.id === game.id ? { ...g, description: data.description } : g
      ));
    } catch (err) {
      console.error('Failed to fetch description:', err);
      setGameDescription('');
    } finally {
      setLoadingDescription(false);
    }
  };

  // Handle video section expansion
  const handleExpandVideos = async () => {
    const newState = !expandedSections.videos;
    toggleSection('videos');

    if (newState && videoSearchResults.length === 0 && viewingGame) {
      setLoadingVideos(true);
      try {
        const data = await api.get<{ videos: YouTubeVideo[] }>(
          `/api/youtube-search?q=${encodeURIComponent(viewingGame.title + ' how to play')}`
        );
        setVideoSearchResults(data.videos?.slice(0, 3) || []);
      } catch (err) {
        console.error('Failed to fetch videos:', err);
        setVideoSearchResults([]);
      } finally {
        setLoadingVideos(false);
      }
    }
  };

  // Watch video
  const handleWatchVideo = (videoId: string) => {
    setPlayingVideoId(videoId);
  };

  // Back to video list
  const handleBackToVideos = () => {
    setPlayingVideoId(null);
  };

  // Apply manual image URL
  const handleApplyManualImage = () => {
    if (manualImageUrl.trim()) {
      setEditForm({ ...editForm, thumbnail: manualImageUrl.trim() });
      setShowBGGImport(false);
      setManualImageUrl('');
      addToast('Image URL applied', 'success');
    }
  };

  const handleFetchSuggestions = async () => {
    setLoadingSuggestions(true);
    setSuggestedCategories([]);
    setSuggestedMechanics([]);
    setSuggestionMessage('');
    
    try {
      const data = await api.get<{ categories?: string[]; mechanics?: string[]; message?: string }>(
        `/api/bgg-suggestions?q=${encodeURIComponent(editingGame?.title || '')}`
      );
      
      setSuggestedCategories(data.categories || []);
      setSuggestedMechanics(data.mechanics || []);
      if (data.message) {
        setSuggestionMessage(data.message);
      }
    } catch (err) {
      const message = api.getErrorMessage(err);
      setSuggestionMessage(message);
      addToast(message, 'error');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAddSuggestion = (type: 'mechanic' | 'category', value: string) => {
    if (type === 'mechanic') {
      if (!editForm.mechanics.includes(value)) {
        setEditForm({ ...editForm, mechanics: [...editForm.mechanics, value] });
        addToast(`Added "${value}" to mechanics`, 'success');
      }
    } else {
      if (!editForm.categories.includes(value)) {
        setEditForm({ ...editForm, categories: [...editForm.categories, value] });
        addToast(`Added "${value}" to categories`, 'success');
      }
    }
  };

  const allMechanics = [...new Set(games.flatMap(g => g.mechanics))].sort();
  const allCategories = [...new Set(games.flatMap(g => g.categories))].sort();

  const filteredGames = games.filter(game => {
    if (search && !game.title.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (game.minPlayers > filters.maxPlayers || game.maxPlayers < filters.minPlayers) {
      return false;
    }
    if (game.maxPlayTime && game.maxPlayTime > filters.maxTime) {
      return false;
    }
    if (filters.mechanics.length > 0) {
      const hasMechanic = filters.mechanics.some(m => 
        game.mechanics.some(gm => gm.toLowerCase().includes(m.toLowerCase()))
      );
      if (!hasMechanic) return false;
    }
    if (filters.categories.length > 0) {
      const hasCategory = filters.categories.some(c => 
        game.categories.some(gc => gc.toLowerCase().includes(c.toLowerCase()))
      );
      if (!hasCategory) return false;
    }
    return true;
  }).sort((a, b) => {
    switch (sortOrder) {
      case 'az':
        return a.title.localeCompare(b.title);
      case 'za':
        return b.title.localeCompare(a.title);
      case 'mostPlayed':
        const countA = playCounts.get(a.id) || 0;
        const countB = playCounts.get(b.id) || 0;
        return countB - countA;
      case 'latest':
        // For "latest played first", we would need last played date
        // For now, sort by play count as a proxy, or keep original order
        const latestA = playCounts.get(a.id) || 0;
        const latestB = playCounts.get(b.id) || 0;
        return latestB - latestA;
      default:
        return 0;
    }
  });

  if (status === 'loading' || loading) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.header}>
              <div className={styles.headerLeft}>
                <h1 className={styles.title}>My Collection</h1>
              </div>
            </div>
            <div className={styles.loadingContainer}>
              <LoadingSpinner size="large" />
              <p className={styles.loadingText}>Loading collection...</p>
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
              <h2 className={styles.errorTitle}>Failed to Load Collection</h2>
              <p className={styles.errorMessage}>{error}</p>
              <button 
                className={styles.retryBtn}
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  Promise.all([fetchGames(), fetchPlayCounts(), fetchPlayers()]).then(() => {
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
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>My Collection</h1>
              <span className={styles.count}>{games.length} games</span>
            </div>
            <a href="/add" className={styles.addGameBtn}>
              + Add Game
            </a>
          </div>

          <div className={styles.toolbar}>
            <div className={styles.searchContainer}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Search games..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                  <option value="latest">Latest Played</option>
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
            <div className={styles.filters}>
              <div className={styles.filterGroup}>
                <label>Player Count</label>
                <div className={styles.rangeRow}>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={filters.minPlayers}
                    onChange={(e) => setFilters({ ...filters, minPlayers: Number(e.target.value) })}
                    className={styles.rangeInput}
                  />
                  <span>to</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={filters.maxPlayers}
                    onChange={(e) => setFilters({ ...filters, maxPlayers: Number(e.target.value) })}
                    className={styles.rangeInput}
                  />
                  <span>players</span>
                </div>
              </div>

              <div className={styles.filterGroup}>
                <label>Max Play Time (minutes)</label>
                <input
                  type="range"
                  min="15"
                  max="240"
                  step="15"
                  value={filters.maxTime}
                  onChange={(e) => setFilters({ ...filters, maxTime: Number(e.target.value) })}
                  className={styles.slider}
                />
                <span className={styles.sliderValue}>{filters.maxTime} min</span>
              </div>

              <div className={styles.filterGroup}>
                <label>Mechanics</label>
                <div className={styles.checkboxList}>
                  {allMechanics.slice(0, 10).map(mechanic => (
                    <label key={mechanic} className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={filters.mechanics.includes(mechanic)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters({ ...filters, mechanics: [...filters.mechanics, mechanic] });
                          } else {
                            setFilters({ ...filters, mechanics: filters.mechanics.filter(m => m !== mechanic) });
                          }
                        }}
                      />
                      {mechanic}
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.filterGroup}>
                <label>Categories</label>
                <div className={styles.checkboxList}>
                  {allCategories.slice(0, 10).map(category => (
                    <label key={category} className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={filters.categories.includes(category)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters({ ...filters, categories: [...filters.categories, category] });
                          } else {
                            setFilters({ ...filters, categories: filters.categories.filter(c => c !== category) });
                          }
                        }}
                      />
                      {category}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {filteredGames.length === 0 ? (
            <div className={styles.empty}>
              {games.length === 0 ? (
                <>
                  <span className={styles.emptyIcon}>🎲</span>
                  <h2>Your collection is empty</h2>
                  <p>Start adding games from BGG!</p>
                  <a href="/add" className={styles.addBtn}>Add Your First Game</a>
                </>
              ) : (
                <>
                  <span className={styles.emptyIcon}>🔍</span>
                  <h2>No games match your filters</h2>
                  <p>Try adjusting your search or filters</p>
                  <button 
                    className={styles.clearFiltersBtn}
                    onClick={() => {
                      setSearch('');
                      setFilters({
                        minPlayers: 0,
                        maxPlayers: 10,
                        maxTime: 240,
                        mechanics: [],
                        categories: [],
                      });
                    }}
                  >
                    Clear Filters
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className={styles.grid}>
              {filteredGames.map((game) => (
                <div
                  key={game.id}
                  className={styles.cardWrapper}
                  onClick={() => handleView(game)}
                  style={{ cursor: 'pointer' }}
                >
                  <GameCard
                    game={game}
                    playCount={playCounts.get(game.id) || 0}
                    onPlayCountClick={() => setViewingHistoryGame(game)}
                    showArtwork={showArtwork}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {editingGame && (
        <div className={styles.modalOverlay} onClick={() => setEditingGame(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Edit Game</h2>
              <div className={styles.headerActions}>
                <button
                  type="button"
                  className={styles.bggImportBtn}
                  onClick={handleOpenBGGImport}
                >
                  📥 Import from BGG
                </button>
                <button
                  type="button"
                  className={styles.deleteIconBtn}
                  onClick={() => {
                    if (confirm('Are you sure you want to remove this game from your collection?')) {
                      handleDelete(editingGame.id);
                      setEditingGame(null);
                    }
                  }}
                  title="Remove game"
                >
                  🗑️
                </button>
              </div>
            </div>
            
            <div className={styles.form}>
              <div className={styles.field}>
                <label>Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>

              <div className={styles.field}>
                <label>Image URL</label>
                <input
                  type="url"
                  value={editForm.thumbnail}
                  onChange={e => setEditForm({ ...editForm, thumbnail: e.target.value })}
                  className={styles.imageUrlInput}
                />
                {editForm.thumbnail && (
                  <div className={styles.imagePreview}>
                    <img src={editForm.thumbnail} alt="Game preview" />
                  </div>
                )}
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Min Players</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.minPlayers}
                    onChange={e => setEditForm({ ...editForm, minPlayers: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className={styles.field}>
                  <label>Max Players</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.maxPlayers}
                    onChange={e => setEditForm({ ...editForm, maxPlayers: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Min Play Time (min)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.minPlayTime}
                    onChange={e => setEditForm({ ...editForm, minPlayTime: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className={styles.field}>
                  <label>Max Play Time (min)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.maxPlayTime}
                    onChange={e => setEditForm({ ...editForm, maxPlayTime: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label>Year Published</label>
                <input
                  type="number"
                  min="1900"
                  max="2100"
                  value={editForm.yearPublished}
                  onChange={e => setEditForm({ ...editForm, yearPublished: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className={styles.field}>
                <label>Mechanics</label>
                <MultiSelect
                  options={BOARD_GAME_MECHANICS}
                  selected={editForm.mechanics}
                  onChange={(selected) => setEditForm({ ...editForm, mechanics: selected })}
                  placeholder="Select mechanics..."
                />
              </div>

              <div className={styles.field}>
                <label>Categories</label>
                <MultiSelect
                  options={BOARD_GAME_CATEGORIES}
                  selected={editForm.categories}
                  onChange={(selected) => setEditForm({ ...editForm, categories: selected })}
                  placeholder="Select categories..."
                />
              </div>

              <div className={styles.field}>
                <label>Designers</label>
                <input
                  type="text"
                  value={editForm.designers}
                  onChange={e => setEditForm({ ...editForm, designers: e.target.value })}
                />
              </div>

              <div className={styles.field}>
                <label>Publishers</label>
                <input
                  type="text"
                  value={editForm.publishers}
                  onChange={e => setEditForm({ ...editForm, publishers: e.target.value })}
                />
              </div>

              <div className={styles.modalActions}>
                <button 
                  className={styles.cancelBtn}
                  onClick={() => setEditingGame(null)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  className={styles.saveBtn}
                  onClick={handleSaveEdit}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <LoadingSpinner size="small" />
                      Saving...
                    </>
                  ) : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBGGConfirmModal && (
        <div className={styles.modalOverlay} onClick={() => setShowBGGConfirmModal(false)}>
          <div className={`${styles.modal} ${styles.confirmModal}`} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Import from BGG</h2>
            
            <div className={styles.confirmModalWarning}>
              <span className={styles.warningIcon}>⚠️</span>
              <p>This game already has data.</p>
              <p className={styles.confirmSubtext}>
                Importing from BGG will replace your current game details including title, 
                description, player count, play time, categories, mechanics, and images.
              </p>
            </div>

            <div className={styles.modalActions}>
              <button 
                className={styles.cancelBtn}
                onClick={() => setShowBGGConfirmModal(false)}
              >
                Cancel
              </button>
              <button 
                className={styles.saveBtn}
                onClick={() => {
                  setShowBGGConfirmModal(false);
                  setShowGameSelection(true);
                  setSearchOffset(0);
                  handleSearchBGG(0);
                }}
              >
                Continue to BGG Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Selection Modal */}
      {showGameSelection && (
        <div className={styles.modalOverlay} onClick={() => setShowGameSelection(false)}>
          <div className={`${styles.modal} ${styles.bggImportModal}`} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Select Game from BGG</h2>
            <p className={styles.searchSubtitle}>Searching for &quot;{editingGame?.title}&quot;</p>
            
            {searchLoading && (
              <div className={styles.bggLoadingState}>
                <LoadingSpinner size="large" />
                <p>Searching BGG...</p>
              </div>
            )}

            {bggImportError && !searchLoading && (
              <div className={styles.bggError}>
                <span className={styles.errorIcon}>⚠️</span>
                <p>{bggImportError}</p>
                <button 
                  className={styles.retryBtn}
                  onClick={() => handleSearchBGG(searchOffset)}
                >
                  Retry
                </button>
              </div>
            )}

            {!searchLoading && !bggImportError && searchResults.length === 0 && (
              <div className={styles.bggNotFound}>
                <span className={styles.notFoundIcon}>❌</span>
                <h3>No games found</h3>
                <p>Try searching with a different name or check the spelling.</p>
              </div>
            )}

            {!searchLoading && !bggImportError && searchResults.length > 0 && (
              <div className={styles.gameSelectionList}>
                {searchResults.map((result) => (
                  <div 
                    key={result.id} 
                    className={styles.gameSelectionItem}
                    onClick={() => handleSelectGame(result.id)}
                  >
                    <div className={styles.gameSelectionInfo}>
                      <h3>{result.title}</h3>
                      {result.yearPublished && (
                        <span className={styles.gameSelectionYear}>({result.yearPublished})</span>
                      )}
                    </div>
                  </div>
                ))}
                
                {hasMoreResults && (
                  <button 
                    className={styles.loadMoreBtn}
                    onClick={handleLoadMoreResults}
                    disabled={searchLoading}
                  >
                    {searchLoading ? (
                      <>
                        <LoadingSpinner size="small" />
                        Loading...
                      </>
                    ) : (
                      'Load 3 more'
                    )}
                  </button>
                )}
              </div>
            )}

            <div className={styles.modalActions}>
              <button 
                className={styles.cancelBtn}
                onClick={() => setShowGameSelection(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showBGGImport && (
        <div className={styles.modalOverlay} onClick={() => setShowBGGImport(false)}>
          <div className={`${styles.modal} ${styles.bggImportModal}`} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Import from BGG</h2>
            
            {bggImportLoading && (
              <div className={styles.bggLoadingState}>
                <LoadingSpinner size="large" />
                <p>Fetching game details...</p>
              </div>
            )}

            {bggImportError === 'coming_soon' && !bggImportLoading && (
              <div className={styles.bggComingSoon}>
                <span className={styles.comingSoonIcon}>📢</span>
                <h3>BGG integration coming soon!</h3>
                <p>
                  To enable automatic game data import, add your BGG API token to the environment variables.
                </p>
                <p className={styles.comingSoonSubtext}>
                  Meanwhile, you can enter game details manually or paste an image URL below.
                </p>
                
                <div className={styles.manualUrlSection}>
                  <label>Image URL</label>
                  <div className={styles.manualUrlInput}>
                    <input
                      type="url"
                      value={manualImageUrl}
                      onChange={(e) => setManualImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className={styles.imageUrlInput}
                    />
                    <button
                      className={styles.useUrlBtn}
                      onClick={handleApplyManualImage}
                      disabled={!manualImageUrl.trim()}
                    >
                      Use URL
                    </button>
                  </div>
                </div>
              </div>
            )}

            {bggImportError === 'not_found' && !bggImportLoading && (
              <div className={styles.bggNotFound}>
                <span className={styles.notFoundIcon}>❌</span>
                <h3>Game not found on BGG</h3>
                <p>Try searching with a different name or check the spelling.</p>
                
                <div className={styles.manualUrlSection}>
                  <label>Image URL</label>
                  <div className={styles.manualUrlInput}>
                    <input
                      type="url"
                      value={manualImageUrl}
                      onChange={(e) => setManualImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className={styles.imageUrlInput}
                    />
                    <button
                      className={styles.useUrlBtn}
                      onClick={handleApplyManualImage}
                      disabled={!manualImageUrl.trim()}
                    >
                      Use URL
                    </button>
                  </div>
                </div>
              </div>
            )}

            {bggImportError && bggImportError !== 'coming_soon' && bggImportError !== 'not_found' && !bggImportLoading && (
              <div className={styles.bggError}>
                <span className={styles.errorIcon}>⚠️</span>
                <p>{bggImportError}</p>
                <button 
                  className={styles.retryBtn}
                  onClick={handleFetchBGG}
                >
                  Retry
                </button>
              </div>
            )}

            {bggImportData && !bggImportLoading && (
              <div className={styles.bggImportPreview}>
                <div className={styles.bggGamePreview}>
                  {bggImportData.thumbnail && (
                    <img src={bggImportData.thumbnail} alt={bggImportData.title} />
                  )}
                  <div className={styles.bggGameInfo}>
                    <h3>{bggImportData.title}</h3>
                    {bggImportData.yearPublished > 0 && (
                      <span className={styles.bggYear}>({bggImportData.yearPublished})</span>
                    )}
                    <div className={styles.bggStats}>
                      {bggImportData.bggRating > 0 && (
                        <span>⭐ {bggImportData.bggRating.toFixed(1)}/10</span>
                      )}
                      {bggImportData.bggRank > 0 && (
                        <span>🏆 Rank #{bggImportData.bggRank}</span>
                      )}
                      {bggImportData.complexity > 0 && (
                        <span>⚖️ Weight: {bggImportData.complexity.toFixed(1)}/5</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.bggImportFields}>
                  <h4>This will populate:</h4>
                  <ul>
                    <li>✓ Title & Description</li>
                    <li>✓ {bggImportData.minPlayers}-{bggImportData.maxPlayers} Players</li>
                    <li>✓ {bggImportData.minPlayTime}-{bggImportData.maxPlayTime} min</li>
                    {bggImportData.minAge > 0 && <li>✓ Age {bggImportData.minAge}+</li>}
                    {bggImportData.categories.length > 0 && (
                      <li>✓ {bggImportData.categories.length} Categories</li>
                    )}
                    {bggImportData.mechanics.length > 0 && (
                      <li>✓ {bggImportData.mechanics.length} Mechanics</li>
                    )}
                    {bggImportData.designers.length > 0 && (
                      <li>✓ {bggImportData.designers.length} Designers</li>
                    )}
                    {bggImportData.publishers.length > 0 && (
                      <li>✓ {bggImportData.publishers.length} Publishers</li>
                    )}
                    {bggImportData.artists.length > 0 && (
                      <li>✓ {bggImportData.artists.length} Artists</li>
                    )}
                    <li>✓ Box cover image</li>
                  </ul>
                </div>

                <div className={styles.manualUrlSection}>
                  <label>Override Image URL (optional)</label>
                  <div className={styles.manualUrlInput}>
                    <input
                      type="url"
                      value={manualImageUrl}
                      onChange={(e) => setManualImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className={styles.imageUrlInput}
                    />
                    <button
                      className={styles.useUrlBtn}
                      onClick={handleApplyManualImage}
                      disabled={!manualImageUrl.trim()}
                    >
                      Use This URL
                    </button>
                  </div>
                </div>

                <div className={styles.modalActions}>
                  <button 
                    className={styles.cancelBtn}
                    onClick={() => setShowBGGImport(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className={styles.saveBtn}
                    onClick={handleApplyBGGData}
                  >
                    ✓ Use BGG Data
                  </button>
                </div>
              </div>
            )}

            {!bggImportLoading && !bggImportData && !bggImportError && (
              <div className={styles.modalActions}>
                <button 
                  className={styles.cancelBtn}
                  onClick={() => setShowBGGImport(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showSuggestions && (
        <div className={styles.modalOverlay} onClick={() => setShowSuggestions(false)}>
          <div className={`${styles.modal} ${styles.suggestionsModal}`} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>✨ Suggestions from BGG</h2>
            
            {loadingSuggestions && (
              <div className={styles.searchingIndicator}>
                <LoadingSpinner size="large" />
                <p>Searching BGG...</p>
              </div>
            )}

            {suggestionMessage && !loadingSuggestions && (
              <div className={`${styles.suggestionMessage} ${styles.error}`}>
                {suggestionMessage}
              </div>
            )}

            {(suggestionType === 'mechanics' || suggestionType === 'both') && suggestedMechanics.length > 0 && (
              <div className={styles.suggestionSection}>
                <h3>Suggested Mechanics</h3>
                <div className={styles.suggestionTags}>
                  {suggestedMechanics.map((mechanic, index) => (
                    <button
                      key={index}
                      className={styles.suggestionTag}
                      onClick={() => handleAddSuggestion('mechanic', mechanic)}
                    >
                      + {mechanic}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(suggestionType === 'categories' || suggestionType === 'both') && suggestedCategories.length > 0 && (
              <div className={styles.suggestionSection}>
                <h3>Suggested Categories</h3>
                <div className={styles.suggestionTags}>
                  {suggestedCategories.map((category, index) => (
                    <button
                      key={index}
                      className={styles.suggestionTag}
                      onClick={() => handleAddSuggestion('category', category)}
                    >
                      + {category}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!loadingSuggestions && suggestedMechanics.length === 0 && suggestedCategories.length === 0 && !suggestionMessage && (
              <div className={styles.noResults}>
                <span className={styles.noResultsIcon}>🤔</span>
                <p>No suggestions found. Try searching for the exact game name.</p>
              </div>
            )}

            <div className={styles.modalActions}>
              <button 
                className={styles.cancelBtn}
                onClick={() => setShowSuggestions(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingGame && (
        <div className={styles.modalOverlay} onClick={() => setViewingGame(null)}>
          <div className={`${styles.modal} ${styles.viewModal}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{viewingGame.title}</h2>
              <div className={styles.headerActions}>
                <button
                  type="button"
                  className={styles.editIconBtn}
                  onClick={() => {
                    setViewingGame(null);
                    handleEdit(viewingGame);
                  }}
                  title="Edit game"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className={styles.deleteIconBtn}
                  onClick={() => {
                    if (confirm('Are you sure you want to remove this game from your collection?')) {
                      handleDelete(viewingGame.id);
                      setViewingGame(null);
                    }
                  }}
                  title="Remove game"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className={styles.viewContent}>
              {viewingGame.thumbnail && (
                <div className={styles.viewImageContainer}>
                  <img src={viewingGame.thumbnail} alt={viewingGame.title} className={styles.viewImage} />
                </div>
              )}

              {/* Game Details */}
              <div className={styles.viewSection}>
                <h3>Game Details</h3>
                <div className={styles.viewGrid}>
                  <div className={styles.viewItem}>
                    <span className={styles.viewLabel}>Players</span>
                    <span className={styles.viewValue}>
                      {viewingGame.minPlayers === viewingGame.maxPlayers
                        ? `${viewingGame.minPlayers}`
                        : `${viewingGame.minPlayers} - ${viewingGame.maxPlayers}`}
                    </span>
                  </div>
                  <div className={styles.viewItem}>
                    <span className={styles.viewLabel}>Play Time</span>
                    <span className={styles.viewValue}>
                      {viewingGame.minPlayTime || viewingGame.maxPlayTime
                        ? (viewingGame.minPlayTime === viewingGame.maxPlayTime
                            ? `${viewingGame.minPlayTime} min`
                            : `${viewingGame.minPlayTime || 0} - ${viewingGame.maxPlayTime || 0} min`)
                        : 'N/A'}
                    </span>
                  </div>
                  <div className={styles.viewItem}>
                    <span className={styles.viewLabel}>Year Published</span>
                    <span className={styles.viewValue}>{viewingGame.yearPublished || 'N/A'}</span>
                  </div>
                  {viewingGame.designers && viewingGame.designers.length > 0 && (
                    <div className={styles.viewItem}>
                      <span className={styles.viewLabel}>Designer</span>
                      <span className={styles.viewValue}>{viewingGame.designers[0]}</span>
                    </div>
                  )}
                  {viewingGame.complexity && viewingGame.complexity > 0 && (
                    <div className={styles.viewItem}>
                      <span className={styles.viewLabel}>Complexity</span>
                      <span className={styles.viewValue}>{viewingGame.complexity.toFixed(1)}/5</span>
                    </div>
                  )}
                  {viewingGame.bggRating && viewingGame.bggRating > 0 && (
                    <div className={styles.viewItem}>
                      <span className={styles.viewLabel}>BGG Rating</span>
                      <span className={styles.viewValue}>
                        {viewingGame.bggRating.toFixed(1)}/10
                        {viewingGame.bggRatingsCount && (
                          <span className={styles.ratingCount}> ({viewingGame.bggRatingsCount.toLocaleString()})</span>
                        )}
                      </span>
                    </div>
                  )}
                  {viewingGame.bggRank && viewingGame.bggRank > 0 && (
                    <div className={styles.viewItem}>
                      <span className={styles.viewLabel}>BGG Rank</span>
                      <span className={styles.viewValue}>#{viewingGame.bggRank.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Mechanics - Expandable */}
              {viewingGame.mechanics.length > 0 && (
                <div className={styles.expandableSection}>
                  <button
                    className={styles.expandableHeader}
                    onClick={() => toggleSection('mechanics')}
                  >
                    <span>Mechanics</span>
                    <span>{expandedSections.mechanics ? '▼' : '▶'}</span>
                  </button>

                  {expandedSections.mechanics && (
                    <div className={styles.expandableContent}>
                      <div className={styles.viewTags}>
                        {viewingGame.mechanics.map((mechanic) => (
                          <span key={mechanic} className={styles.viewTagMechanic}>
                            {mechanic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Categories - Expandable */}
              {viewingGame.categories.length > 0 && (
                <div className={styles.expandableSection}>
                  <button
                    className={styles.expandableHeader}
                    onClick={() => toggleSection('categories')}
                  >
                    <span>Categories</span>
                    <span>{expandedSections.categories ? '▼' : '▶'}</span>
                  </button>

                  {expandedSections.categories && (
                    <div className={styles.expandableContent}>
                      <div className={styles.viewTags}>
                        {viewingGame.categories.map((category) => (
                          <span key={category} className={styles.viewTagCategory}>
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Description - Expandable */}
              <div className={styles.expandableSection}>
                <button
                  className={styles.expandableHeader}
                  onClick={() => {
                    toggleSection('description');
                    if (!expandedSections.description && !gameDescription) {
                      fetchGameDescription(viewingGame);
                    }
                  }}
                >
                  <span>Description</span>
                  <span>{expandedSections.description ? '▼' : '▶'}</span>
                </button>

                {expandedSections.description && (
                  <div className={styles.expandableContent}>
                    {loadingDescription ? (
                      <div className={styles.loadingContainer}>
                        <LoadingSpinner size="small" />
                        <p>Loading description...</p>
                      </div>
                    ) : gameDescription ? (
                      <p className={styles.descriptionText}>{gameDescription}</p>
                    ) : (
                      <p className={styles.noDataText}>No description available</p>
                    )}
                  </div>
                )}
              </div>

              {/* How to Play Videos - Expandable */}
              <div className={styles.expandableSection}>
                <button
                  className={styles.expandableHeader}
                  onClick={handleExpandVideos}
                >
                  <span>📺 How to Play Videos</span>
                  <span>{expandedSections.videos ? '▼' : '▶'}</span>
                </button>

                {expandedSections.videos && (
                  <div className={styles.expandableContent}>
                    {loadingVideos ? (
                      <div className={styles.loadingContainer}>
                        <LoadingSpinner size="small" />
                        <p>Loading videos...</p>
                      </div>
                    ) : playingVideoId ? (
                      <div className={styles.videoPlayerContainer}>
                        <div className={styles.videoPlayer}>
                          <iframe
                            src={`https://www.youtube.com/embed/${playingVideoId}`}
                            title="How to Play Video"
                            allowFullScreen
                          />
                        </div>
                        <button
                          className={styles.backBtn}
                          onClick={handleBackToVideos}
                        >
                          ← Back to Videos
                        </button>
                      </div>
                    ) : videoSearchResults.length > 0 ? (
                      <div className={styles.videoGrid}>
                        {videoSearchResults.map((video) => (
                          <div key={video.id} className={styles.videoCard}>
                            <div className={styles.videoThumbnail}>
                              <img src={video.thumbnail} alt={video.title} />
                            </div>
                            <div className={styles.videoInfo}>
                              <h4 className={styles.videoTitle}>{video.title}</h4>
                              <p className={styles.videoChannel}>{video.channel}</p>
                              <button
                                className={styles.watchBtn}
                                onClick={() => handleWatchVideo(video.id)}
                              >
                                Watch
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.noDataText}>No videos found</p>
                    )}
                  </div>
                )}
              </div>

              {/* Publishers */}
              {viewingGame.publishers && viewingGame.publishers.length > 0 && (
                <div className={styles.viewSection}>
                  <h3>Publishers</h3>
                  <p className={styles.viewText}>{viewingGame.publishers.join(', ')}</p>
                </div>
              )}
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setViewingGame(null)}
              >
                Close
              </button>
              <button
                className={styles.saveBtn}
                onClick={() => {
                  setViewingGame(null);
                  setLoggingGame(viewingGame);
                }}
              >
                Log a Play
              </button>
            </div>
          </div>
        </div>
      )}

      {loggingGame && (
        <LogPlayModal
          game={loggingGame}
          availablePlayers={players}
          onClose={() => setLoggingGame(null)}
          onSave={handleSavePlay}
          onAddPlayer={handleAddPlayer}
        />
      )}

      {viewingHistoryGame && (
        <PlayHistoryModal
          game={viewingHistoryGame}
          onClose={() => setViewingHistoryGame(null)}
          onLogNewPlay={() => {
            setViewingHistoryGame(null);
            setLoggingGame(viewingHistoryGame);
          }}
          onDeletePlay={handleDeletePlay}
        />
      )}
    </>
  );
}
