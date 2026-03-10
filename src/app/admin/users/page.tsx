'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import styles from './page.module.css';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    games: number;
    playLogs: number;
  };
}

export default function UsersPage() {
  const { addToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('isActive', statusFilter);

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      
      if (res.ok) {
        setUsers(data.users);
        setTotalPages(data.pagination.totalPages);
      } else {
        addToast(data.error || 'Failed to fetch users', 'error');
      }
    } catch (error) {
      addToast('Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search, roleFilter, statusFilter]);

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (res.ok) {
        addToast(`User ${currentStatus ? 'disabled' : 'enabled'} successfully`, 'success');
        fetchUsers();
      } else {
        const data = await res.json();
        addToast(data.error || 'Failed to update user', 'error');
      }
    } catch (error) {
      addToast('Failed to update user', 'error');
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        addToast(`User role updated to ${newRole}`, 'success');
        fetchUsers();
      } else {
        const data = await res.json();
        addToast(data.error || 'Failed to update role', 'error');
      }
    } catch (error) {
      addToast('Failed to update role', 'error');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        addToast(
          `Password reset! Temporary password: ${data.user.tempPassword}`,
          'success',
          10000
        );
        setShowResetConfirm(false);
        setSelectedUser(null);
      } else {
        const data = await res.json();
        addToast(data.error || 'Failed to reset password', 'error');
      }
    } catch (error) {
      addToast('Failed to reset password', 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        addToast('User deleted successfully', 'success');
        setShowDeleteConfirm(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        const data = await res.json();
        addToast(data.error || 'Failed to delete user', 'error');
      }
    } catch (error) {
      addToast('Failed to delete user', 'error');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>User Management</h1>
      </div>

      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="">All Roles</option>
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Disabled</option>
        </select>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading users...</div>
      ) : (
        <>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Games</th>
                  <th>Plays</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className={styles.userInfo}>
                        <span className={styles.userName}>{user.name || 'No name'}</span>
                        <span className={styles.userEmail}>{user.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${user.role === 'ADMIN' ? styles.adminBadge : ''}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${user.isActive ? styles.activeBadge : styles.inactiveBadge}`}>
                        {user.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>{user._count.games}</td>
                    <td>{user._count.playLogs}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          onClick={() => handleToggleRole(user.id, user.role)}
                          className={styles.actionBtn}
                          title="Toggle admin role"
                        >
                          {user.role === 'ADMIN' ? '👤' : '👑'}
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user.id, user.isActive)}
                          className={styles.actionBtn}
                          title={user.isActive ? 'Disable user' : 'Enable user'}
                        >
                          {user.isActive ? '🚫' : '✅'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowResetConfirm(true);
                          }}
                          className={styles.actionBtn}
                          title="Reset password"
                        >
                          🔑
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteConfirm(true);
                          }}
                          className={`${styles.actionBtn} ${styles.danger}`}
                          title="Delete user"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={styles.pageBtn}
              >
                ← Previous
              </button>
              <span className={styles.pageInfo}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={styles.pageBtn}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Reset Password Confirmation Modal */}
      {showResetConfirm && selectedUser && (
        <div className={styles.modalOverlay} onClick={() => setShowResetConfirm(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>Reset Password</h3>
            <p>
              Are you sure you want to reset the password for <strong>{selectedUser.email}</strong>?
            </p>
            <p className={styles.warning}>
              The password will be set to &quot;ChangeMe123!&quot; and the user will be required to change it on next login.
            </p>
            <div className={styles.modalActions}>
              <button onClick={() => setShowResetConfirm(false)} className={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={handleResetPassword} className={styles.confirmBtn}>
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedUser && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>Delete User</h3>
            <p>
              Are you sure you want to delete <strong>{selectedUser.email}</strong>?
            </p>
            <p className={styles.warning}>
              This will permanently delete the user and all their data (games, plays, etc.). This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button onClick={() => setShowDeleteConfirm(false)} className={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={handleDeleteUser} className={styles.dangerBtn}>
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}