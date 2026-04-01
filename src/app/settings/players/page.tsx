'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import styles from './page.module.css';

interface Player {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  isSelfPlayer: boolean;
  _count: {
    playLogs: number;
    wins: number;
  };
  linkedUser: {
    id: string;
    name: string | null;
  } | null;
}

interface SearchUser {
  id: string;
  name: string | null;
  email: string | null;
}

export default function PlayersManagementPage() {
  const { addToast } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkingPlayer, setLinkingPlayer] = useState<Player | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [deletingPlayer, setDeletingPlayer] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [addingPlayer, setAddingPlayer] = useState(false);

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch('/api/players');
      if (res.ok) {
        const data = await res.json();
        setPlayers(data);
      } else {
        addToast('Failed to load players', 'error');
      }
    } catch (error) {
      addToast('Failed to load players', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  // Debounced search
  useEffect(() => {
    if (!showLinkModal || !linkingPlayer) return;
    
    const timeoutId = setTimeout(async () => {
      if (searchQuery.trim() === '') {
        setSearchResults([]);
        return;
      }
      
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, showLinkModal, linkingPlayer]);

  const handleEditStart = (player: Player) => {
    setEditingPlayer(player.id);
    setEditName(player.name);
  };

  const handleEditCancel = () => {
    setEditingPlayer(null);
    setEditName('');
  };

  const handleEditSave = async (playerId: string) => {
    if (!editName.trim()) {
      addToast('Player name is required', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/players/${playerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (res.ok) {
        const updatedPlayer = await res.json();
        setPlayers(players.map(p => p.id === playerId ? updatedPlayer : p));
        setEditingPlayer(null);
        setEditName('');
        addToast('Player name updated', 'success');
      } else {
        const error = await res.json();
        addToast(error.error || 'Failed to update player', 'error');
      }
    } catch (error) {
      addToast('Failed to update player', 'error');
    }
  };

  const handleLinkStart = (player: Player) => {
    setLinkingPlayer(player);
    setShowLinkModal(true);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleLink = async (userId: string) => {
    if (!linkingPlayer) return;

    try {
      const res = await fetch(`/api/players/${linkingPlayer.id}/link`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        const updatedPlayer = await res.json();
        setPlayers(players.map(p => p.id === linkingPlayer.id ? updatedPlayer : p));
        setShowLinkModal(false);
        setLinkingPlayer(null);
        addToast('Player linked successfully', 'success');
      } else {
        const error = await res.json();
        addToast(error.error || 'Failed to link player', 'error');
      }
    } catch (error) {
      addToast('Failed to link player', 'error');
    }
  };

  const handleUnlink = async (player: Player) => {
    try {
      const res = await fetch(`/api/players/${player.id}/link`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const updatedPlayer = await res.json();
        setPlayers(players.map(p => p.id === player.id ? updatedPlayer : p));
        addToast('Player unlinked successfully', 'success');
      } else {
        const error = await res.json();
        addToast(error.error || 'Failed to unlink player', 'error');
      }
    } catch (error) {
      addToast('Failed to unlink player', 'error');
    }
  };

  const handleDelete = async (playerId: string) => {
    setDeletingPlayer(playerId);
    
    try {
      const res = await fetch(`/api/players/${playerId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setPlayers(players.filter(p => p.id !== playerId));
        addToast('Player deleted successfully', 'success');
      } else {
        const error = await res.json();
        addToast(error.error || 'Failed to delete player', 'error');
      }
    } catch (error) {
      addToast('Failed to delete player', 'error');
    } finally {
      setDeletingPlayer(null);
    }
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) {
      addToast('Player name is required', 'error');
      return;
    }

    setAddingPlayer(true);
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlayerName.trim() }),
      });

      if (res.ok) {
        const newPlayer = await res.json();
        setPlayers([...players, newPlayer].sort((a, b) => a.name.localeCompare(b.name)));
        setNewPlayerName('');
        setShowAddModal(false);
        addToast('Player created successfully', 'success');
      } else {
        const error = await res.json();
        addToast(error.error || 'Failed to create player', 'error');
      }
    } catch (error) {
      addToast('Failed to create player', 'error');
    } finally {
      setAddingPlayer(false);
    }
  };

  const handleAddModalClose = () => {
    setShowAddModal(false);
    setNewPlayerName('');
  };

  if (loading) {
    return <div className={styles.loading}>Loading players...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>Manage Players</h1>
            <p className={styles.subtitle}>
              {players.length} active player{players.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className={styles.addPlayerBtn}
          >
            <span className={styles.addIcon}>+</span>
            Add Player
          </button>
        </div>
      </div>

      {players.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🎮</div>
          <h3>No Players Yet</h3>
          <p>Players you create will appear here. Create players when logging games or planning game nights.</p>
        </div>
      ) : (
        <div className={styles.playersList}>
          {players.map((player) => (
            <div key={player.id} className={styles.playerCard}>
              <div className={styles.playerInfo}>
                {editingPlayer === player.id ? (
                  <div className={styles.editForm}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={styles.editInput}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditSave(player.id);
                        if (e.key === 'Escape') handleEditCancel();
                      }}
                    />
                    <div className={styles.editActions}>
                      <button
                        onClick={() => handleEditSave(player.id)}
                        className={styles.saveBtn}
                      >
                        Save
                      </button>
                      <button
                        onClick={handleEditCancel}
                        className={styles.cancelBtn}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className={styles.playerName}>{player.name}</h3>
                    {player.isSelfPlayer ? (
                      <div className={styles.selfBadge}>You</div>
                    ) : player.linkedUser && (
                      <div className={styles.linkedBadge}>
                        <span className={styles.linkIcon}>👤</span>
                        <span>Linked to: {player.linkedUser.name || 'Unknown User'}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className={styles.playerStats}>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{player._count.playLogs}</span>
                  <span className={styles.statLabel}>Games</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{player._count.wins}</span>
                  <span className={styles.statLabel}>Wins</span>
                </div>
              </div>

              <div className={styles.playerActions}>
                {editingPlayer !== player.id && (
                  <>
                    <button
                      onClick={() => handleEditStart(player)}
                      className={styles.actionBtn}
                      title="Edit name"
                    >
                      ✏️
                    </button>
                    
                    {!player.isSelfPlayer && (
                      <>
                        {player.linkedUser ? (
                          <button
                            onClick={() => handleUnlink(player)}
                            className={`${styles.actionBtn} ${styles.actionBtnWide}`}
                            title="Unlink player from user"
                          >
                            ❌
                          </button>
                        ) : (
                          <button
                            onClick={() => handleLinkStart(player)}
                            className={styles.actionBtn}
                            title="Link to user"
                          >
                            🔗
                          </button>
                        )}
                      </>
                    )}
                    
                    {player.isSelfPlayer ? (
                      <button
                        className={`${styles.actionBtn} ${styles.disabled}`}
                        disabled
                        title="You cannot delete your self-player"
                      >
                        🗑️
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDelete(player.id)}
                        className={`${styles.actionBtn} ${styles.danger}`}
                        disabled={deletingPlayer === player.id}
                        title="Delete player"
                      >
                        {deletingPlayer === player.id ? '⏳' : '🗑️'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Link Modal */}
      {showLinkModal && linkingPlayer && (
        <div className={styles.modalOverlay} onClick={() => setShowLinkModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Link Player to User</h3>
              <button
                onClick={() => setShowLinkModal(false)}
                className={styles.closeBtn}
              >
                ✕
              </button>
            </div>
            
            <div className={styles.modalContent}>
              <p className={styles.modalDescription}>
                Link <strong>{linkingPlayer.name}</strong> to a user who allows player linking.
              </p>
              
              <div className={styles.searchBox}>
                <input
                  type="text"
                  placeholder="Search users by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
                {searching && <span className={styles.searchingIndicator}>Searching...</span>}
              </div>

              <div className={styles.searchResults}>
                {searchResults.length === 0 && searchQuery && !searching && (
                  <p className={styles.noResults}>No users found</p>
                )}
                
                {searchResults.map((user) => (
                  <div key={user.id} className={styles.userResult}>
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>{user.name || 'Unnamed User'}</span>
                      {user.email && (
                        <span className={styles.userEmail}>{user.email}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleLink(user.id)}
                      className={styles.linkBtn}
                    >
                      Link
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Player Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={handleAddModalClose}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Add New Player</h3>
              <button
                onClick={handleAddModalClose}
                className={styles.closeBtn}
              >
                ✕
              </button>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Player Name</label>
                <input
                  type="text"
                  placeholder="Enter player name..."
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className={styles.formInput}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddPlayer();
                    if (e.key === 'Escape') handleAddModalClose();
                  }}
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  onClick={handleAddPlayer}
                  className={styles.saveBtn}
                  disabled={addingPlayer || !newPlayerName.trim()}
                >
                  {addingPlayer ? 'Creating...' : 'Create Player'}
                </button>
                <button
                  onClick={handleAddModalClose}
                  className={styles.cancelBtn}
                  disabled={addingPlayer}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
