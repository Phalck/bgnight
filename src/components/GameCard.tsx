'use client';

import styles from './GameCard.module.css';

interface GameCardProps {
  game: {
    id: string;
    title: string;
    thumbnail?: string | null;
    image?: string | null;
    minPlayers: number;
    maxPlayers: number;
    minPlayTime?: number | null;
    maxPlayTime?: number | null;
    mechanics: string[];
    categories: string[];
    designers?: string | string[];
    bggRating?: number | null;
    bggRatingsCount?: number | null;
    complexity?: number | null;
    bggRank?: number | null;
  };
  playCount?: number;
  onPlayCountClick?: () => void;
  showArtwork?: boolean;
  viewMode?: 'grid' | 'list';
}

export function GameCard({ game, playCount, onPlayCountClick, showArtwork = true, viewMode = 'grid' }: GameCardProps) {
  const formatPlayTime = () => {
    if (!game.minPlayTime && !game.maxPlayTime) return null;
    const min = game.minPlayTime || 0;
    const max = game.maxPlayTime || min;
    return `${min}-${max} min`;
  };

  const formatPlayers = () => {
    if (game.minPlayers === game.maxPlayers) {
      return `${game.minPlayers} players`;
    }
    return `${game.minPlayers}-${game.maxPlayers} players`;
  };

  const visibleTags = game.mechanics.slice(0, viewMode === 'list' ? 2 : 3);
  const visibleCategories = game.categories.slice(0, viewMode === 'list' ? 2 : 3);

  // Use high-res image if available, fall back to thumbnail
  const imageUrl = game.image || game.thumbnail;

  return (
    <div className={`${styles.card} ${!showArtwork ? styles.compactCard : ''} ${viewMode === 'list' ? styles.listCard : styles.gridCard}`}>
      {showArtwork && (
        <div className={viewMode === 'list' ? styles.listImageContainer : styles.gridImageContainer}>
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={game.title} 
              className={viewMode === 'list' ? styles.listImage : styles.gridImage}
              loading="lazy"
            />
          ) : (
            <div className={viewMode === 'list' ? styles.listPlaceholder : styles.placeholder}>
              <span>🎲</span>
            </div>
          )}
        </div>
      )}
      <div className={`${styles.content} ${!showArtwork ? styles.compactContent : ''} ${viewMode === 'list' ? styles.listContent : ''}`}>
        <div className={viewMode === 'list' ? styles.listMainInfo : ''}>
          <h3 className={styles.title}>{game.title}</h3>
          {game.designers && (
            (Array.isArray(game.designers) ? game.designers.length > 0 : game.designers.trim().length > 0) && (
              <p className={styles.designer}>
                {Array.isArray(game.designers) ? game.designers[0] : game.designers.split(',')[0].trim()}
              </p>
            )
          )}
        </div>
        <div className={viewMode === 'list' ? styles.listDetails : ''}>
          <div className={styles.badges}>
            <span className={styles.badge}>{formatPlayers()}</span>
            {formatPlayTime() && (
              <span className={styles.badge}>{formatPlayTime()}</span>
            )}
            {typeof playCount === 'number' && playCount > 0 ? (
              <span 
                className={styles.playCount}
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayCountClick?.();
                }}
                title="View play history"
              >
                Played {playCount} time{playCount !== 1 ? 's' : ''}
              </span>
            ) : (
              <span 
                className={styles.logPlayBadge}
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayCountClick?.();
                }}
                title="Log a play"
              >
                + Log Play
              </span>
            )}
          </div>
          {visibleTags.length > 0 && (
            <div className={styles.tags}>
              {visibleTags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          )}
          {visibleCategories.length > 0 && (
            <div className={styles.categories}>
              {visibleCategories.map((category) => (
                <span key={category} className={styles.category}>
                  {category}
                </span>
              ))}
            </div>
          )}
        </div>
        {(game.bggRating || game.complexity || game.bggRank) && (
          <div className={`${styles.bggStats} ${viewMode === 'list' ? styles.listBggStats : ''}`}>
            {game.bggRating && game.bggRating > 0 && (
              <span className={styles.bggRating}>
                ⭐ {game.bggRating.toFixed(1)}/10
                {game.bggRatingsCount && game.bggRatingsCount > 0 && (
                  <span className={styles.ratingCount}> ({game.bggRatingsCount.toLocaleString()})</span>
                )}
              </span>
            )}
            {game.complexity && game.complexity > 0 && (
              <span className={styles.bggComplexity}>
                ⚖️ {game.complexity.toFixed(1)}/5
              </span>
            )}
            {game.bggRank && game.bggRank > 0 && (
              <span className={styles.bggRank}>
                🏆 #{game.bggRank.toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
