'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { VideoPickerModal } from './VideoPickerModal';
import { PlayerSelector } from './PlayerSelector';
import { LoadingSpinner } from './LoadingSpinner';
import { useToast } from './Toast';
import * as api from '@/lib/api-client';
import styles from './EditPlannedNightModal.module.css';

interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface Player {
  id: string;
  name: string;
}

interface Game {
  id: string;
  title: string;
  thumbnail?: string | null;
  minPlayers: number;
  maxPlayers: number;
  maxPlayTime?: number | null;
}

interface PlannedGame {
  id: string;
  game: Game;
  youtubeVideoId?: string;
  youtubeVideoTitle?: string;
  youtubeVideoUrl?: string;
  order: number;
}

interface PlayerResponse {
  playerId: string;
  status: 'coming' | 'not_coming' | 'maybe';
  respondedAt: string;
}

interface PlannedNight {
  id: string;
  plannedAt: string;
  eventDateTime?: string;
  location?: string;
  games: PlannedGame[];
  players: Player[];
  playerResponses?: PlayerResponse[];
  inviteToken?: string | null;
  inviteExpiresAt?: string | null;
  inviteEnabled?: boolean;
}

interface EditPlannedNightModalProps {
  plannedNight: PlannedNight;
  availableGames: Game[];
  availablePlayers: Player[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedNight: PlannedNight) => void;
}

// Sortable Game Item Component
function SortableGameItem({
  plannedGame,
  onChangeVideo,
  onRemoveConfirm,
}: {
  plannedGame: PlannedGame;
  onChangeVideo: (plannedGameId: string) => void;
  onRemoveConfirm: (plannedGameId: string, gameTitle: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: plannedGame.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={styles.gameItem}
    >
      <div className={styles.dragHandle} {...attributes} {...listeners}>
        ⋮⋮
      </div>
      
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
          👥 {plannedGame.game.minPlayers}-{plannedGame.game.maxPlayers} players
          {plannedGame.game.maxPlayTime && ` • ⏱️ ${plannedGame.game.maxPlayTime} min`}
        </p>
        {plannedGame.youtubeVideoUrl && (
          <p className={styles.videoInfo}>📺 {plannedGame.youtubeVideoTitle}</p>
        )}
      </div>
      
      <div className={styles.gameActions}>
        <button
          className={styles.videoBtn}
          onClick={() => onChangeVideo(plannedGame.id)}
          title="Change video"
        >
          {plannedGame.youtubeVideoUrl ? '📺 Change' : '📺 Add Video'}
        </button>
        <button
          className={styles.removeBtn}
          onClick={() => onRemoveConfirm(plannedGame.id, plannedGame.game.title)}
          title="Remove game"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

// Game Picker Modal
function GamePickerModal({
  availableGames,
  selectedGameIds,
  onClose,
  onSelect,
}: {
  availableGames: Game[];
  selectedGameIds: Set<string>;
  onClose: () => void;
  onSelect: (game: Game) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredGames = availableGames.filter(game =>
    !selectedGameIds.has(game.id) &&
    game.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.gamePickerModal}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Add Games</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.modalContent}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search games..."
            className={styles.searchInput}
            autoFocus
          />
          
          <div className={styles.gameGrid}>
            {filteredGames.map(game => (
              <div
                key={game.id}
                className={styles.gameCard}
                onClick={() => onSelect(game)}
              >
                {game.thumbnail ? (
                  <img src={game.thumbnail} alt={game.title} className={styles.gameCardThumb} />
                ) : (
                  <div className={styles.gameCardPlaceholder}>🎲</div>
                )}
                <p className={styles.gameCardTitle}>{game.title}</p>
              </div>
            ))}
          </div>
          
          {filteredGames.length === 0 && (
            <p className={styles.noResults}>
              {searchTerm ? 'No matching games found' : 'All games already added'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Confirmation Dialog
function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={`${styles.modal} ${styles.confirmModal}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
        </div>
        <div className={styles.modalContent}>
          <p className={styles.confirmMessage}>{message}</p>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.cancelActionBtn} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.confirmActionBtn} onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export function EditPlannedNightModal({
  plannedNight,
  availableGames,
  availablePlayers,
  isOpen,
  onClose,
  onSave,
}: EditPlannedNightModalProps) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'games' | 'players' | 'details'>('games');
  const [saving, setSaving] = useState(false);
  
  // Games state
  const [selectedGames, setSelectedGames] = useState<PlannedGame[]>(
    plannedNight.games.sort((a, b) => a.order - b.order)
  );
  const [showGamePicker, setShowGamePicker] = useState(false);
  const [editingVideoGameId, setEditingVideoGameId] = useState<string | null>(null);
  const [gameToRemove, setGameToRemove] = useState<{ id: string; title: string } | null>(null);
  
  // Players state
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>(plannedNight.players);
  const [localAvailablePlayers, setLocalAvailablePlayers] = useState<Player[]>(availablePlayers);
  
  // Details state
  const [eventDateTime, setEventDateTime] = useState(plannedNight.eventDateTime || '');
  const [location, setLocation] = useState(plannedNight.location || '');

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedGames((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex).map((item, index) => ({
          ...item,
          order: index,
        }));
      });
    }
  }, []);

  const handleAddGame = (game: Game) => {
    const newPlannedGame: PlannedGame = {
      id: `new-${Date.now()}`,
      game,
      order: selectedGames.length,
    };
    setSelectedGames([...selectedGames, newPlannedGame]);
    setShowGamePicker(false);
  };

  const handleRemoveGame = () => {
    if (!gameToRemove) return;
    setSelectedGames(selectedGames.filter(g => g.id !== gameToRemove.id));
    setGameToRemove(null);
  };

  const handleVideoSelect = (video: YouTubeVideo) => {
    if (!editingVideoGameId) return;
    
    setSelectedGames(selectedGames.map(g => 
      g.id === editingVideoGameId
        ? {
            ...g,
            youtubeVideoId: video.id,
            youtubeVideoTitle: video.title,
            youtubeVideoUrl: `https://youtube.com/watch?v=${video.id}`,
          }
        : g
    ));
    setEditingVideoGameId(null);
  };

  const handleVideoSkip = () => {
    setEditingVideoGameId(null);
  };

  const handleAddPlayer = async (name: string): Promise<Player | null> => {
    try {
      const response = await api.post<Player>('/api/players', { name });
      // Add the new player to local available players so they appear in the list
      setLocalAvailablePlayers(prev => [...prev, response]);
      return response;
    } catch (err) {
      const message = api.getErrorMessage(err);
      addToast(message, 'error');
      return null;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.patch<PlannedNight>(`/api/planned-nights/${plannedNight.id}`, {
        eventDateTime: eventDateTime || null,
        location: location || null,
        playerIds: selectedPlayers.map(p => p.id),
        games: selectedGames.map((g, index) => ({
          gameId: g.game.id,
          youtubeVideoId: g.youtubeVideoId || null,
          youtubeVideoTitle: g.youtubeVideoTitle || null,
          youtubeVideoUrl: g.youtubeVideoUrl || null,
          order: index,
        })),
      });
      
      onSave(response);
      addToast('Planned night updated successfully!', 'success');
    } catch (err) {
      const message = api.getErrorMessage(err);
      addToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const selectedGameIds = new Set(selectedGames.map(g => g.game.id));
  const editingGame = editingVideoGameId 
    ? selectedGames.find(g => g.id === editingVideoGameId)?.game
    : null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Edit Planned Night</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'games' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('games')}
          >
            Games ({selectedGames.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'players' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('players')}
          >
            Players ({selectedPlayers.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'details' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
        </div>

        <div className={styles.modalContent}>
          {/* Games Tab */}
          {activeTab === 'games' && (
            <div className={styles.tabContent}>
              <div className={styles.gamesHeader}>
                <button
                  className={styles.addGameBtn}
                  onClick={() => setShowGamePicker(true)}
                >
                  + Add Games
                </button>
              </div>

              {selectedGames.length === 0 ? (
                <p className={styles.emptyState}>No games selected. Click &quot;Add Games&quot; to add some.</p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={selectedGames.map(g => g.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className={styles.gamesList}>
                      {selectedGames.map((plannedGame) => (
                        <SortableGameItem
                          key={plannedGame.id}
                          plannedGame={plannedGame}
                          onChangeVideo={setEditingVideoGameId}
                          onRemoveConfirm={(id, title) => setGameToRemove({ id, title })}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          )}

          {/* Players Tab */}
          {activeTab === 'players' && (
            <div className={styles.tabContent}>
              <PlayerSelector
                availablePlayers={localAvailablePlayers}
                selectedPlayers={selectedPlayers}
                onChange={setSelectedPlayers}
                onAddPlayer={handleAddPlayer}
              />
            </div>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className={styles.tabContent}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Date & Time</label>
                <input
                  type="datetime-local"
                  value={eventDateTime}
                  onChange={(e) => setEventDateTime(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Where will you play?"
                  className={styles.input}
                />
              </div>

            </div>
          )}
        </div>

        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button 
            className={styles.saveBtn} 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <LoadingSpinner size="small" /> : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Game Picker Modal */}
      {showGamePicker && (
        <GamePickerModal
          availableGames={availableGames}
          selectedGameIds={selectedGameIds}
          onClose={() => setShowGamePicker(false)}
          onSelect={handleAddGame}
        />
      )}

      {/* Video Picker Modal */}
      {editingGame && (
        <VideoPickerModal
          gameTitle={editingGame.title}
          onClose={handleVideoSkip}
          onSelect={handleVideoSelect}
          onSkip={handleVideoSkip}
        />
      )}

      {/* Confirmation Dialog */}
      {gameToRemove && (
        <ConfirmDialog
          title="Remove Game"
          message={`Are you sure you want to remove "${gameToRemove.title}" from this planned night?`}
          onConfirm={handleRemoveGame}
          onCancel={() => setGameToRemove(null)}
        />
      )}
    </div>
  );
}
