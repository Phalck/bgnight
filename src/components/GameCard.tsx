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
  selected?: boolean;
  onToggle?: () => void;
  showCheckbox?: boolean;
}

export function GameCard({ 
  game, 
  playCount, 
  onPlayCountClick, 
  showArtwork = true,
  selected = false,
  onToggle,
  showCheckbox = false
}: GameCardProps) {
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

  const visibleTags = game.mechanics.slice(0, 2);
  const visibleCategories = game.categories.slice(0, 2);

  // Use only thumbnail (not full-res image)
  const imageUrl = game.thumbnail;

  const handleCardClick = () => {
    if (onToggle) {
      onToggle();
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggle) {
      onToggle();
    }
  };

  return (
    <div 
      className={`${styles.card} ${!showArtwork ? styles.compactCard : ''} ${selected ? styles.selected : ''} ${onToggle ? styles.selectable : ''}`}
      onClick={handleCardClick}
    >
      {/* Checkbox in upper right corner */}
      {showCheckbox && (
        <div className={styles.checkboxContainer} onClick={handleCheckboxClick}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => {}} // Handled by onClick
            className={styles.checkbox}
          />
        </div>
      )}

      {/* Row 1: Header with thumbnail and title */}
      <div className={styles.cardHeader}>
        {showArtwork && (
          <div className={styles.imageContainer}>
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt={game.title} 
                className={styles.image}
                loading="lazy"
              />
            ) : (
              <div className={styles.placeholder}>
                <span>🎲</span>
              </div>
            )}
          </div>
        )}
        <div className={styles.titleArea}>
          <h3 className={styles.title}>{game.title}</h3>
          {game.designers && (
            (Array.isArray(game.designers) ? game.designers.length > 0 : game.designers.trim().length > 0) && (
              <p className={styles.designer}>
                {Array.isArray(game.designers) ? game.designers[0] : game.designers.split(',')[0].trim()}
              </p>
            )
          )}

        </div>
      </div>

      {/* Row 2: Game stats */}
      <div className={styles.cardBody}>
        {/* Badges (Players, Time, Weight, Rating, Play Count) */}
        <div className={styles.badges}>
          <span className={styles.badge}>{formatPlayers()}</span>
          {formatPlayTime() && (
            <span className={styles.badge}>{formatPlayTime()}</span>
          )}
          {game.complexity && game.complexity > 0 && (
            <span className={styles.weightBadge}>⚖️ {game.complexity.toFixed(1)}</span>
          )}
          {game.bggRating && game.bggRating > 0 && (
            <span className={styles.ratingBadge}>⭐ {game.bggRating.toFixed(1)}</span>
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

        {/* Tags */}
        {visibleTags.length > 0 && (
          <div className={styles.tags}>
            {visibleTags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Categories */}
        {visibleCategories.length > 0 && (
          <div className={styles.categories}>
            {visibleCategories.map((category) => (
              <span key={category} className={styles.category}>
                {category}
              </span>
            ))}
          </div>
        )}

        {/* BGG Stats */}
        {(game.bggRating || game.complexity || game.bggRank) && (
          <div className={styles.bggStats}>
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