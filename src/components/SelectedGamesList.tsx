'use client';

import styles from './SelectedGamesList.module.css';

interface SuggestedGame {
  id: string;
  title: string;
  thumbnail?: string | null;
  minPlayers: number;
  maxPlayers: number;
  maxPlayTime?: number | null;
}

interface YouTubeVideo {
  id: string;
  title: string;
}

interface SelectedGamesListProps {
  games: SuggestedGame[];
  selectedVideos: Map<string, YouTubeVideo>;
  onRemove: (gameId: string) => void;
  onPickVideo: (gameId: string) => void;
  onClearAll: () => void;
}

export function SelectedGamesList({
  games,
  selectedVideos,
  onRemove,
  onPickVideo,
  onClearAll,
}: SelectedGamesListProps) {
  if (games.length === 0) return null;

  const formatPlayers = (min: number, max: number) => {
    if (min === max) return `${min} players`;
    return `${min}-${max} players`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Selected Games ({games.length})</h3>
          <p className={styles.optionalNote}>💡 Picking videos is optional</p>
        </div>
        <button className={styles.clearBtn} onClick={onClearAll}>
          Clear All
        </button>
      </div>

      <div className={styles.gamesList}>
        {games.map((game) => {
          const video = selectedVideos.get(game.id);
          return (
            <div key={game.id} className={styles.gameItem}>
              <div className={styles.gameInfo}>
                {game.thumbnail ? (
                  <img 
                    src={game.thumbnail} 
                    alt={game.title} 
                    className={styles.thumbnail}
                  />
                ) : (
                  <div className={styles.placeholder}>🎲</div>
                )}
                <div className={styles.details}>
                  <h4 className={styles.gameTitle}>{game.title}</h4>
                  <p className={styles.gameMeta}>
                    {formatPlayers(game.minPlayers, game.maxPlayers)}
                    {game.maxPlayTime && ` • ${game.maxPlayTime} min`}
                  </p>
                  {video && (
                    <p className={styles.videoInfo}>
                      📺 {video.title}
                    </p>
                  )}
                </div>
              </div>
              
              <div className={styles.actions}>
                <button
                  className={`${styles.videoBtn} ${video ? styles.hasVideo : ''}`}
                  onClick={() => onPickVideo(game.id)}
                >
                  {video ? 'Change Video' : 'Pick Video'}
                </button>
                <button
                  className={styles.removeBtn}
                  onClick={() => onRemove(game.id)}
                  title="Remove game"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
