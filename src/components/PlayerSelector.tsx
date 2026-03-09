'use client';

import { useState, useMemo } from 'react';
import styles from './PlayerSelector.module.css';

interface Player {
  id: string;
  name: string;
}

interface PlayerSelectorProps {
  availablePlayers: Player[];
  selectedPlayers: Player[];
  onChange: (players: Player[]) => void;
  onAddPlayer?: (name: string) => Promise<Player | null>;
}

export function PlayerSelector({ 
  availablePlayers, 
  selectedPlayers, 
  onChange,
  onAddPlayer 
}: PlayerSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const filteredPlayers = useMemo(() => {
    if (!searchTerm.trim()) return availablePlayers;
    const term = searchTerm.toLowerCase();
    return availablePlayers.filter(p => 
      p.name.toLowerCase().includes(term) &&
      !selectedPlayers.find(sp => sp.id === p.id)
    );
  }, [availablePlayers, selectedPlayers, searchTerm]);

  const isExactMatch = useMemo(() => {
    if (!searchTerm.trim()) return false;
    const term = searchTerm.toLowerCase().trim();
    return availablePlayers.some(p => p.name.toLowerCase() === term);
  }, [availablePlayers, searchTerm]);

  const handleTogglePlayer = (player: Player) => {
    const isSelected = selectedPlayers.find(p => p.id === player.id);
    if (isSelected) {
      onChange(selectedPlayers.filter(p => p.id !== player.id));
    } else {
      onChange([...selectedPlayers, player]);
    }
  };

  const handleRemovePlayer = (playerId: string) => {
    onChange(selectedPlayers.filter(p => p.id !== playerId));
  };

  const handleAddNewPlayer = async () => {
    if (!onAddPlayer || !searchTerm.trim() || isAdding) return;
    
    setIsAdding(true);
    try {
      const newPlayer = await onAddPlayer(searchTerm.trim());
      if (newPlayer) {
        onChange([...selectedPlayers, newPlayer]);
        setSearchTerm('');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const showAddButton = searchTerm.trim() && !isExactMatch;

  return (
    <div className={styles.container}>
      {/* Selected Players */}
      {selectedPlayers.length > 0 && (
        <div className={styles.selectedSection}>
          <label className={styles.sectionLabel}>Selected Players:</label>
          <div className={styles.selectedList}>
            {selectedPlayers.map(player => (
              <span key={player.id} className={styles.selectedTag}>
                {player.name}
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => handleRemovePlayer(player.id)}
                  aria-label={`Remove ${player.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className={styles.searchSection}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search or add players..."
          className={styles.searchInput}
        />
        
        {showAddButton && onAddPlayer && (
          <button
            type="button"
            className={styles.addButton}
            onClick={handleAddNewPlayer}
            disabled={isAdding}
          >
            {isAdding ? 'Adding...' : `Add "${searchTerm.trim()}"`}
          </button>
        )}
      </div>

      {/* Available Players */}
      {filteredPlayers.length > 0 && (
        <div className={styles.availableSection}>
          <label className={styles.sectionLabel}>
            {searchTerm.trim() ? 'Matching Players:' : 'Available Players:'}
          </label>
          <div className={styles.checkboxList}>
            {filteredPlayers.map(player => (
              <label key={player.id} className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => handleTogglePlayer(player)}
                />
                <span className={styles.playerName}>{player.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {searchTerm.trim() && filteredPlayers.length === 0 && !showAddButton && (
        <p className={styles.noMatch}>No matching players found</p>
      )}
    </div>
  );
}
