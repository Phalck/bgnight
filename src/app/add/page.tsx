'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { MultiSelect } from '@/components/MultiSelect';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/components/Toast';
import { BOARD_GAME_CATEGORIES, BOARD_GAME_MECHANICS } from '@/lib/gameData';
import * as api from '@/lib/api-client';
import styles from './page.module.css';

interface GameInput {
  title: string;
  thumbnail: string;
  minPlayers: number;
  maxPlayers: number;
  minPlayTime: number;
  maxPlayTime: number;
  yearPublished: number;
  description: string;
  mechanics: string[];
  categories: string[];
  designers: string;
  publishers: string;
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

interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
}

export default function AddPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [mode, setMode] = useState<'manual' | 'import'>('manual');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [game, setGame] = useState<GameInput>({
    title: '',
    thumbnail: '',
    minPlayers: 2,
    maxPlayers: 4,
    minPlayTime: 30,
    maxPlayTime: 60,
    yearPublished: new Date().getFullYear(),
    description: '',
    mechanics: [],
    categories: [],
    designers: '',
    publishers: '',
  });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showBGGImport, setShowBGGImport] = useState(false);
  const [bggImportLoading, setBggImportLoading] = useState(false);
  const [bggImportData, setBggImportData] = useState<BGGGameData | null>(null);
  const [bggImportError, setBggImportError] = useState('');
  const [manualImageUrl, setManualImageUrl] = useState('');
  
  // Multiple results selection state
  const [searchResults, setSearchResults] = useState<BGGSearchResult[]>([]);
  const [searchOffset, setSearchOffset] = useState(0);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [hasPreviousResults, setHasPreviousResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [showGameSelection, setShowGameSelection] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!game.title.trim()) {
      addToast('Please enter a game title', 'error');
      return;
    }

    setLoading(true);

    try {
      // Convert arrays to comma-separated strings for the API
      const gameData = {
        ...game,
        mechanics: game.mechanics.join(', '),
        categories: game.categories.join(', '),
      };

      await api.post('/api/games/manual', gameData);
      
      addToast(`"${game.title}" added to your collection!`, 'success');
      setGame({
        title: '',
        thumbnail: '',
        minPlayers: 2,
        maxPlayers: 4,
        minPlayTime: 30,
        maxPlayTime: 60,
        yearPublished: new Date().getFullYear(),
        description: '',
        mechanics: [],
        categories: [],
        designers: '',
        publishers: '',
      });
    } catch (err) {
      const message = api.getErrorMessage(err);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const data = await api.post<ImportResult>('/api/games/import', formData, {
        headers: {}, // Let browser set content-type for FormData
      });

      setImportResult(data);
      addToast(`Successfully imported ${data.imported} of ${data.total} games!`, 'success');
    } catch (err) {
      const message = api.getErrorMessage(err);
      addToast(message, 'error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOpenBGGImport = () => {
    if (!game.title.trim()) {
      addToast('Please enter a game title first', 'error');
      return;
    }
    setShowGameSelection(true);
    setSearchOffset(0);
    handleSearchBGG(0);
  };

  const handleSearchBGG = async (offset: number) => {
    setSearchLoading(true);
    setBggImportError('');
    
    try {
      const response = await fetch(`/api/bgg-import/search?gameName=${encodeURIComponent(game.title)}&offset=${offset}`);
      const data = await response.json();
      
      if (!data.success) {
        setBggImportError(data.error || 'Failed to search BoardGameGeek');
        setSearchResults([]);
      } else {
        setSearchResults(data.data || []);
        setHasMoreResults(data.hasMore || false);
        setHasPreviousResults(data.hasPrevious || false);
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

  const handleLoadPreviousResults = () => {
    const previousOffset = Math.max(0, searchOffset - 3);
    handleSearchBGG(previousOffset);
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

  const handleFetchBGG = async () => {
    setBggImportLoading(true);
    setBggImportError('');
    setBggImportData(null);
    
    try {
      const response = await fetch(`/api/bgg-import?gameName=${encodeURIComponent(game.title)}`);
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

  const handleApplyBGGData = () => {
    if (!bggImportData) return;
    
    setGame({
      ...game,
      title: bggImportData.title || game.title,
      thumbnail: bggImportData.thumbnail || bggImportData.image || game.thumbnail,
      minPlayers: bggImportData.minPlayers || game.minPlayers,
      maxPlayers: bggImportData.maxPlayers || game.maxPlayers,
      minPlayTime: bggImportData.minPlayTime || game.minPlayTime,
      maxPlayTime: bggImportData.maxPlayTime || game.maxPlayTime,
      yearPublished: bggImportData.yearPublished || game.yearPublished,
      mechanics: bggImportData.mechanics || game.mechanics,
      categories: bggImportData.categories || game.categories,
      designers: bggImportData.designers?.join(', ') || game.designers,
      publishers: bggImportData.publishers?.join(', ') || game.publishers,
    });
    
    setShowBGGImport(false);
    setBggImportData(null);
    addToast('Game data imported from BoardGameGeek!', 'success');
  };

  const handleApplyManualImage = () => {
    if (manualImageUrl.trim()) {
      setGame({ ...game, thumbnail: manualImageUrl.trim() });
      setShowBGGImport(false);
      setManualImageUrl('');
      addToast('Image URL applied', 'success');
    }
  };

  if (status === 'loading') {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.loadingContainer}>
            <LoadingSpinner size="large" />
            <p className={styles.loadingText}>Loading...</p>
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
          <h1 className={styles.title}>Add Games</h1>
          <p className={styles.subtitle}>Manually add games or import from a CSV file</p>

          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${mode === 'manual' ? styles.activeTab : ''}`}
              onClick={() => setMode('manual')}
            >
              Manual Entry
            </button>
            <button
              className={`${styles.tab} ${mode === 'import' ? styles.activeTab : ''}`}
              onClick={() => setMode('import')}
            >
              Import CSV
            </button>
          </div>

          {mode === 'manual' && (
            <form onSubmit={handleManualSubmit} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="title">Game Title *</label>
                <input
                  id="title"
                  type="text"
                  value={game.title}
                  onChange={(e) => setGame({ ...game, title: e.target.value })}
                  placeholder="e.g., Catan"
                  required
                />
                <button
                  type="button"
                  className={styles.bggImportBtn}
                  onClick={handleOpenBGGImport}
                  disabled={!game.title.trim()}
                >
                  📥 Import from BGG
                </button>
                <p className={styles.bggImportHint}>
                  Automatically fill all game details from BGG
                </p>
              </div>

              <div className={styles.field}>
                <label htmlFor="thumbnail">Image URL (optional)</label>
                <input
                  id="thumbnail"
                  type="url"
                  value={game.thumbnail}
                  onChange={(e) => setGame({ ...game, thumbnail: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="minPlayers">Min Players</label>
                  <input
                    id="minPlayers"
                    type="number"
                    min="1"
                    value={game.minPlayers}
                    onChange={(e) => setGame({ ...game, minPlayers: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="maxPlayers">Max Players</label>
                  <input
                    id="maxPlayers"
                    type="number"
                    min="1"
                    value={game.maxPlayers}
                    onChange={(e) => setGame({ ...game, maxPlayers: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="minPlayTime">Min Play Time (min)</label>
                  <input
                    id="minPlayTime"
                    type="number"
                    min="0"
                    value={game.minPlayTime}
                    onChange={(e) => setGame({ ...game, minPlayTime: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="maxPlayTime">Max Play Time (min)</label>
                  <input
                    id="maxPlayTime"
                    type="number"
                    min="0"
                    value={game.maxPlayTime}
                    onChange={(e) => setGame({ ...game, maxPlayTime: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="yearPublished">Year Published</label>
                <input
                  id="yearPublished"
                  type="number"
                  min="1900"
                  max="2100"
                  value={game.yearPublished}
                  onChange={(e) => setGame({ ...game, yearPublished: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className={styles.field}>
                <label>Mechanics</label>
                <MultiSelect
                  options={BOARD_GAME_MECHANICS}
                  selected={game.mechanics}
                  onChange={(selected) => setGame({ ...game, mechanics: selected })}
                  placeholder="Select mechanics..."
                />
              </div>

              <div className={styles.field}>
                <label>Categories</label>
                <MultiSelect
                  options={BOARD_GAME_CATEGORIES}
                  selected={game.categories}
                  onChange={(selected) => setGame({ ...game, categories: selected })}
                  placeholder="Select categories..."
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="designers">Designers</label>
                <input
                  id="designers"
                  type="text"
                  value={game.designers}
                  onChange={(e) => setGame({ ...game, designers: e.target.value })}
                  placeholder="e.g., Klaus Teuber"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="publishers">Publishers</label>
                <input
                  id="publishers"
                  type="text"
                  value={game.publishers}
                  onChange={(e) => setGame({ ...game, publishers: e.target.value })}
                  placeholder="e.g., Catan Studio"
                />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? (
                  <>
                    <LoadingSpinner size="small" />
                    Adding...
                  </>
                ) : 'Add to Collection'}
              </button>
            </form>
          )}

          {mode === 'import' && (
            <div className={styles.importSection}>
              {importResult && (
                <div className={styles.importResult}>
                  <div className={styles.importStats}>
                    <div className={styles.importStat}>
                      <span className={styles.statValue}>{importResult.imported}</span>
                      <span className={styles.statLabel}>Imported</span>
                    </div>
                    <div className={styles.importStat}>
                      <span className={styles.statValue}>{importResult.skipped}</span>
                      <span className={styles.statLabel}>Already Owned</span>
                    </div>
                    <div className={styles.importStat}>
                      <span className={styles.statValue}>{importResult.total}</span>
                      <span className={styles.statLabel}>Total Found</span>
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.uploadBox}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleImport}
                  disabled={importing}
                  id="csv-file"
                  className={styles.fileInput}
                />
                <label htmlFor="csv-file" className={styles.uploadLabel}>
                  {importing ? (
                    <>
                      <LoadingSpinner size="medium" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <span className={styles.uploadIcon}>📁</span>
                      <span>Click to upload CSV file</span>
                      <span className={styles.uploadHint}>Export your collection from BGG</span>
                    </>
                  )}
                </label>
              </div>

              <div className={styles.instructions}>
                <h3>How to import from BGG:</h3>
                <ol>
                  <li>Go to your BGG collection page</li>
                  <li>Click &quot;Export&quot; button</li>
                  <li>Select &quot;CSV&quot; format</li>
                  <li>Upload the file here</li>
                </ol>
                <p className={styles.note}>Note: Only standalone games will be imported (expansions are skipped)</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Game Selection Modal */}
      {showGameSelection && (
        <div className={styles.modalOverlay} onClick={() => setShowGameSelection(false)}>
          <div className={`${styles.modal} ${styles.bggImportModal}`} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Select Game from BGG</h2>
            <p className={styles.searchSubtitle}>Searching for &quot;{game.title}&quot;</p>
            
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
                
                <div className={styles.paginationButtons}>
                  {hasPreviousResults && (
                    <button 
                      className={styles.loadMoreBtn}
                      onClick={handleLoadPreviousResults}
                      disabled={searchLoading}
                    >
                      {searchLoading ? (
                        <>
                          <LoadingSpinner size="small" />
                          Loading...
                        </>
                      ) : (
                        '← Previous 3'
                      )}
                    </button>
                  )}
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
                        'Next 3 →'
                      )}
                    </button>
                  )}
                </div>
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
    </>
  );
}
