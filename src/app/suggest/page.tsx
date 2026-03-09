'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import styles from './page.module.css';

interface Game {
  id: string;
  title: string;
  thumbnail?: string | null;
  minPlayers: number;
  maxPlayers: number;
  minPlayTime?: number | null;
  maxPlayTime?: number | null;
  mechanics: string[];
  categories: string[];
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
  matchScore: number;
  reasons: string[];
}

interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

export default function SuggestPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedGame[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [formData, setFormData] = useState({
    players: '4',
    maxTime: '120',
    mechanics: [] as string[],
    categories: [] as string[],
  });
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedGame, setSelectedGame] = useState<SuggestedGame | null>(null);
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [youtubeError, setYoutubeError] = useState('');

  const fetchGames = useCallback(async () => {
    try {
      const res = await fetch('/api/games');
      if (res.ok) {
        const data = await res.json();
        setGames(data);
      }
    } catch (error) {
      console.error('Failed to fetch games:', error);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchGames();
    }
  }, [status, router, fetchGames]);

  const allMechanics = [...new Set(games.flatMap(g => g.mechanics))].sort();
  const allCategories = [...new Set(games.flatMap(g => g.categories))].sort();

  const fetchYouTubeVideos = async (gameTitle: string) => {
    setLoadingVideos(true);
    setYoutubeError('');
    try {
      const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(gameTitle)}`);
      const data = await res.json();
      
      if (data.error) {
        setYoutubeError(data.error);
        setYoutubeVideos([]);
      } else {
        setYoutubeVideos(data.videos || []);
      }
    } catch (error) {
      console.error('Failed to fetch YouTube videos:', error);
      setYoutubeError('Failed to fetch videos');
      setYoutubeVideos([]);
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleGameClick = (game: SuggestedGame) => {
    setSelectedGame(game);
    fetchYouTubeVideos(game.title);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setHasSearched(true);

    const params = new URLSearchParams({
      players: formData.players,
      maxTime: formData.maxTime,
    });

    if (formData.mechanics.length > 0) params.set('mechanics', formData.mechanics.join(','));
    if (formData.categories.length > 0) params.set('categories', formData.categories.join(','));

    try {
      const res = await fetch(`/api/games/suggest?${params}`);
      const data = await res.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.loading}>Loading...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>Game Suggestions</h1>
          <p className={styles.subtitle}>Find the perfect game for your game night</p>

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

            {allMechanics.length > 0 && (
              <div className={styles.filterGroup}>
                <label>Preferred Mechanics (optional)</label>
                <div className={styles.checkboxList}>
                  {allMechanics.slice(0, 10).map(mechanic => (
                    <label key={mechanic} className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={formData.mechanics.includes(mechanic)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, mechanics: [...formData.mechanics, mechanic] });
                          } else {
                            setFormData({ ...formData, mechanics: formData.mechanics.filter(m => m !== mechanic) });
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
                <label>Preferred Categories (optional)</label>
                <div className={styles.checkboxList}>
                  {allCategories.slice(0, 10).map(category => (
                    <label key={category} className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={formData.categories.includes(category)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, categories: [...formData.categories, category] });
                          } else {
                            setFormData({ ...formData, categories: formData.categories.filter(c => c !== category) });
                          }
                        }}
                      />
                      {category}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Finding games...' : 'Find Games'}
            </button>
          </form>

          {loading && (
            <div className={styles.loadingResults}>
              <div className={styles.spinner}></div>
              <p>Searching your collection...</p>
            </div>
          )}

          {!loading && hasSearched && suggestions.length === 0 && (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>😔</span>
              <h2>No games found</h2>
              <p>Your collection doesn&apos;t have games matching these criteria. Try adding more games or adjusting your filters.</p>
              <a href="/add" className={styles.addBtn}>Add More Games</a>
            </div>
          )}

          {!loading && suggestions.length > 0 && (
            <div className={styles.results}>
              <h2 className={styles.resultsTitle}>
                {suggestions.length} game{suggestions.length !== 1 ? 's' : ''} found
              </h2>
              <p className={styles.youtubeHint}>💡 Click on any game to see how-to-play videos</p>
              {suggestions.map(game => (
                <div 
                  key={game.id} 
                  className={styles.suggestionCard}
                  onClick={() => handleGameClick(game)}
                  style={{ cursor: 'pointer' }}
                  title="Click to see how-to-play videos"
                >
                  <div className={styles.gameImage}>
                    {game.thumbnail ? (
                      <img src={game.thumbnail} alt={game.title} />
                    ) : (
                      <div className={styles.placeholder}>🎲</div>
                    )}
                  </div>
                  <div className={styles.gameInfo}>
                    <h3>{game.title}</h3>
                    <div className={styles.gameMeta}>
                      <span>{game.minPlayers}-{game.maxPlayers} players</span>
                      {game.maxPlayTime && <span>~{game.maxPlayTime} min</span>}
                    </div>
                    <div className={styles.reasons}>
                      {game.reasons.map((reason, i) => (
                        <span key={i} className={styles.reason}>{reason}</span>
                      ))}
                    </div>
                  </div>
                  <div className={styles.score}>
                    <span className={styles.scoreValue}>{game.matchScore}</span>
                    <span className={styles.scoreLabel}>match</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedGame && (
        <div className={styles.modalOverlay} onClick={() => setSelectedGame(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{selectedGame.title}</h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setSelectedGame(null)}
                title="Close"
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalContent}>
              {loadingVideos ? (
                <div className={styles.loadingVideos}>
                  <div className={styles.spinner}></div>
                  <p>Loading videos...</p>
                </div>
              ) : youtubeError ? (
                <div className={styles.error}>
                  <p>{youtubeError}</p>
                  <p className={styles.errorHint}>
                    To use this feature, add your YouTube Data API key to the .env file as YOUTUBE_API_KEY
                  </p>
                  <a 
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedGame.title + ' how to play board game')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.youtubeLink}
                  >
                    Search on YouTube instead →
                  </a>
                </div>
              ) : youtubeVideos.length === 0 ? (
                <div className={styles.noVideos}>
                  <p>No videos found</p>
                  <a 
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedGame.title + ' how to play board game')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.youtubeLink}
                  >
                    Search on YouTube →
                  </a>
                </div>
              ) : (
                <div className={styles.videosList}>
                  {youtubeVideos.map((video) => (
                    <div key={video.id} className={styles.videoItem}>
                      <div className={styles.videoWrapper}>
                        <iframe
                          width="100%"
                          height="200"
                          src={`https://www.youtube.com/embed/${video.id}`}
                          title={video.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                      <div className={styles.videoInfo}>
                        <h4 className={styles.videoTitle}>{video.title}</h4>
                        <p className={styles.videoChannel}>{video.channel}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
